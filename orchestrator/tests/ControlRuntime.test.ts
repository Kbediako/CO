import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, realpath, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import { ControlStateStore } from '../src/cli/control/controlState.js';
import type { ProviderIssueHandoffService } from '../src/cli/control/providerIssueHandoff.js';
import {
  initializeProviderPollingHealth,
  markProviderPollingCompleted,
  markProviderPollingStuck,
  markProviderPollingStarted,
  readProviderPollingHealth
} from '../src/cli/control/providerPollingHealth.js';
import { createControlRuntime } from '../src/cli/control/controlRuntime.js';
import { buildUiDataset } from '../src/cli/control/operatorDashboardPresenter.js';
import { readCompatibilityState } from '../src/cli/control/observabilitySurface.js';
import * as liveLinearAdvisoryRuntimeModule from '../src/cli/control/liveLinearAdvisoryRuntime.js';
import type { ControlProviderWorkflowPayload } from '../src/cli/control/observabilityReadModel.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import type { ProviderIntakeState } from '../src/cli/control/providerIntakeState.js';
import type { QuestionRecord } from '../src/cli/control/questions.js';
import {
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  type ProviderLinearWorkerProof
} from '../src/cli/providerLinearWorkerRunner.js';
import { resolveRunPaths, type RunPaths } from '../src/cli/run/runPaths.js';
import { refreshControlHostOwnershipPollingPayload } from '../src/cli/control/controlHostOwnership.js';
import { inspectSourceRootFreshness } from '../src/cli/utils/sourceRootFreshness.js';

interface TestFixture {
  root: string;
  paths: RunPaths;
  controlStore: ControlStateStore;
  runtime: ReturnType<typeof createControlRuntime>;
}

interface CreateFixtureOptions {
  taskId?: string;
  featureToggles?: Record<string, unknown>;
  linearAdvisoryState?: Parameters<typeof createControlRuntime>[0]['linearAdvisoryState'];
  providerIntakeState?: ProviderIntakeState;
  readPersistedProviderIntakeState?: () => ProviderIntakeState | null;
  questions?: QuestionRecord[];
  env?: NodeJS.ProcessEnv | ((root: string) => NodeJS.ProcessEnv);
}

const cleanupRoots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createFixture(options: CreateFixtureOptions = {}): Promise<TestFixture> {
  const root = await mkdtemp(join(tmpdir(), 'control-runtime-'));
  cleanupRoots.push(root);
  const taskId = options.taskId ?? 'task-1023';

  const env = {
    repoRoot: root,
    runsRoot: join(root, '.runs'),
    outRoot: join(root, 'out'),
    taskId
  };
  const paths = resolveRunPaths(env, 'run-1');
  const controlStore = new ControlStateStore({
    runId: 'run-1',
    featureToggles: options.featureToggles ?? null
  });

  await mkdir(paths.runDir, { recursive: true });
  await seedManifest(paths, {
    task_id: taskId,
    summary: 'initial summary',
    updated_at: '2026-03-07T00:00:00.000Z'
  });

  const runtime = createControlRuntime({
    controlStore,
    questionQueue: { list: () => options.questions ?? [] },
    paths,
    linearAdvisoryState: options.linearAdvisoryState ?? { tracked_issue: null },
    providerIntakeState: options.providerIntakeState,
    readPersistedProviderIntakeState: options.readPersistedProviderIntakeState,
    env: typeof options.env === 'function' ? options.env(root) : options.env
  });

  return { root, paths, controlStore, runtime };
}

async function seedManifest(
  paths: Pick<RunPaths, 'manifestPath'>,
  overrides: Record<string, unknown> = {}
): Promise<void> {
  await writeFile(
    paths.manifestPath,
    JSON.stringify({
      run_id: 'run-1',
      task_id: 'task-1023',
      status: 'in_progress',
      started_at: '2026-03-07T00:00:00.000Z',
      updated_at: '2026-03-07T00:00:00.000Z',
      completed_at: null,
      summary: 'task is running',
      commands: [],
      approvals: [],
      ...overrides
    }),
    'utf8'
  );
}

async function seedControlState(
  paths: Pick<RunPaths, 'controlPath'>,
  overrides: Record<string, unknown> = {}
): Promise<void> {
  await writeFile(
    paths.controlPath,
    JSON.stringify({
      run_id: 'run-1',
      control_seq: 0,
      ...overrides
    }),
    'utf8'
  );
}

async function writeDocsFreshnessMaintenanceReport(
  reportPath: string,
  options: {
    generatedAt: string;
    severity: string;
    freshnessDecision: string;
    actionRequiredCount: number;
  }
): Promise<void> {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    JSON.stringify({
      generated_at: options.generatedAt,
      repo_gate: {
        severity: options.severity,
        freshness_decision: options.freshnessDecision,
        owner: {
          issue: 'CO-522',
          action: 'update_existing',
          state: 'Blocked',
          state_type: 'started',
          verified: true
        },
        spec_guard: {
          status: 'succeeded',
          action_required_count: 0
        },
        capacity: {
          status: 'ok'
        },
        next_expiry: null,
        action_required_count: options.actionRequiredCount,
        blocks_unrelated_lanes: false,
        blocks_handoff: options.severity === 'blocking',
        provider_wip_impact: 'excluded_repo_gate'
      }
    }),
    'utf8'
  );
}

async function seedQuestions(
  paths: Pick<RunPaths, 'questionsPath'>,
  questions: QuestionRecord[]
): Promise<void> {
  await writeFile(paths.questionsPath, JSON.stringify({ questions }), 'utf8');
}

async function createSiblingRun(
  root: string,
  taskId: string,
  runId: string,
  options: {
    manifest?: Record<string, unknown>;
    control?: Record<string, unknown>;
    questions?: QuestionRecord[];
  } = {}
): Promise<RunPaths> {
  const env = {
    repoRoot: root,
    runsRoot: join(root, '.runs'),
    outRoot: join(root, 'out'),
    taskId
  };
  const paths = resolveRunPaths(env, runId);
  await mkdir(paths.runDir, { recursive: true });
  await seedManifest(paths, {
    run_id: runId,
    task_id: taskId,
    ...options.manifest
  });
  if (options.control) {
    await seedControlState(paths, {
      run_id: runId,
      ...options.control
    });
  }
  if (options.questions) {
    await seedQuestions(paths, options.questions);
  }
  return paths;
}

async function seedProviderLinearWorkerProof(
  paths: Pick<RunPaths, 'runDir'>,
  overrides: Partial<ProviderLinearWorkerProof> & Record<string, unknown> = {}
): Promise<void> {
  await writeFile(
    join(paths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
    JSON.stringify({
      issue_id: 'issue-1',
      issue_identifier: 'ISSUE-1',
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      turn_count: 1,
      last_event: 'task_complete',
      last_message: 'done',
      last_event_at: '2026-03-07T00:10:00.000Z',
      tokens: {
        input_tokens: 1,
        output_tokens: 1,
        total_tokens: 2
      },
      rate_limits: null,
      owner_phase: 'turn_completed',
      owner_status: 'in_progress',
      workspace_path: '/tmp/workspace',
      end_reason: null,
      updated_at: '2026-03-07T00:10:00.000Z',
      ...overrides
    }),
    'utf8'
  );
}

function createProviderIntakeState(
  claims: ProviderIntakeState['claims'] = []
): ProviderIntakeState {
  return {
    schema_version: 1,
    updated_at: '2026-03-07T00:00:00.000Z',
    rehydrated_at: '2026-03-07T00:00:00.000Z',
    latest_provider_key: claims.at(-1)?.provider_key ?? null,
    latest_reason: claims.at(-1)?.reason ?? null,
    claims
  };
}

function createTerminalRetryClaim(
  issueIdentifier: string,
  issueId: string
): ProviderIntakeState['claims'][number] {
  return {
    provider: 'linear',
    provider_key: `linear:${issueId}`,
    issue_id: issueId,
    issue_identifier: issueIdentifier,
    issue_title: `${issueIdentifier} terminal retry recurrence`,
    issue_state: 'Done',
    issue_state_type: 'completed',
    issue_updated_at: '2026-05-18T22:55:00.000Z',
    task_id: `linear-${issueId}`,
    mapping_source: 'provider_id_fallback',
    state: 'running',
    reason: 'provider_issue_rehydrated_active_run',
    accepted_at: '2026-05-18T22:40:00.000Z',
    updated_at: '2026-05-18T22:56:00.000Z',
    last_delivery_id: `${issueId}-delivery`,
    last_event: 'Issue',
    last_action: 'update',
    last_webhook_timestamp: 1_747_611_300_000,
    run_id: `run-${issueId}`,
    run_manifest_path: null,
    launch_source: 'control-host',
    launch_token: `launch-${issueId}`,
    retry_queued: true,
    retry_attempt: 3,
    retry_due_at: '2026-05-18T23:00:00.000Z',
    retry_error: 'terminal retry should not consume active WIP'
  };
}

function createReleasedTerminalClaim(
  issueIdentifier: string,
  issueId: string
): ProviderIntakeState['claims'][number] {
  return {
    ...createTerminalRetryClaim(issueIdentifier, issueId),
    state: 'released',
    reason: 'provider_issue_released:not_active',
    retry_queued: null,
    retry_attempt: 0,
    retry_due_at: null,
    retry_error: null
  };
}

function createControlHostOwnerPayload(repoRoot: string, sourceRootFreshness: unknown) {
  const runDir = join(repoRoot, '.runs', 'local-mcp', 'cli', 'control-host');
  return {
    status: 'owned',
    reason: null,
    updated_at: '2026-05-18T23:08:00.000Z',
    diagnostic_path: null,
    lock_dir: join(repoRoot, '.runs', 'control-host-owner.lock'),
    owner_path: join(repoRoot, '.runs', 'control-host-owner.json'),
    owner: {
      owner_token: 'owner-token',
      status: 'owned',
      pid: 123,
      hostname: 'host.local',
      acquired_at: '2026-05-18T22:55:00.000Z',
      updated_at: '2026-05-18T23:08:00.000Z',
      repo_root: repoRoot,
      run_id: 'control-host',
      run_dir: runDir,
      source_root_freshness: sourceRootFreshness,
      lock_dir: join(repoRoot, '.runs', 'control-host-owner.lock'),
      owner_path: join(repoRoot, '.runs', 'control-host-owner.json')
    }
  };
}

function buildLiveLinearDispatchPilot(): Record<string, unknown> {
  return {
    dispatch_pilot: {
      enabled: true,
      source: {
        provider: 'linear',
        live: true,
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-live',
        project_id: 'lin-project-1'
      }
    }
  };
}

function createTrackedIssue(overrides: Partial<LiveLinearTrackedIssue> = {}): LiveLinearTrackedIssue {
  return {
    provider: 'linear',
    id: 'lin-issue-1',
    identifier: 'ISSUE-1',
    title: 'Tracked issue',
    description: 'Tracked issue for control-runtime tests.',
    url: 'https://linear.app/asabeko/issue/ISSUE-1',
    state: 'In Progress',
    state_type: 'started',
    archived_at: null,
    trashed: false,
    viewer_id: 'viewer-1',
    assignee_id: 'viewer-1',
    assignee_name: 'Codex',
    workspace_id: 'workspace-1',
    team_id: 'team-1',
    team_key: 'CO',
    team_name: 'CO',
    project_id: 'project-1',
    project_name: 'Coordinator',
    updated_at: '2026-03-07T00:00:00.000Z',
    blocked_by: [],
    recent_activity: [],
    ...overrides
  };
}

function buildLiveLinearGraphqlResponse(): Response {
  return new Response(
    JSON.stringify({
      data: {
        viewer: {
          organization: {
            id: 'lin-workspace-1'
          }
        },
        issues: {
          nodes: [
            {
              id: 'lin-issue-1',
              identifier: 'PREPROD-101',
              title: 'Investigate advisory routing',
              url: 'https://linear.app/asabeko/issue/PREPROD-101',
              updatedAt: '2026-03-06T02:00:00.000Z',
              state: {
                name: 'In Progress',
                type: 'started'
              },
              team: {
                id: 'lin-team-live',
                key: 'PREPROD',
                name: 'PRE-PRO/PRODUCTION'
              },
              project: {
                id: 'lin-project-1',
                name: 'Icon Agency (Bookings)'
              },
              history: {
                nodes: [
                  {
                    id: 'history-1',
                    createdAt: '2026-03-06T01:00:00.000Z',
                    actor: {
                      displayName: 'Operator One'
                    },
                    fromState: {
                      name: 'Todo'
                    },
                    toState: {
                      name: 'In Progress'
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

describe('ControlRuntime', () => {
  it('uses the bounded provider workflow status refresh for runtime snapshots', async () => {
    const fixture = await createFixture();
    const statusPayload: ControlProviderWorkflowPayload = {
      status: 'ready',
      pipeline_id: 'provider-linear-worker',
      source_path: join(fixture.root, 'codex.orchestrator.json'),
      snapshot_path: join(fixture.paths.runDir, 'provider-workflow.last-known-good.json'),
      last_reload_attempt_at: '2026-04-25T18:00:00.000Z',
      last_success_at: '2026-04-25T18:00:00.000Z',
      last_error_at: null,
      last_error: null,
      terminal_cleanup: null,
      worker_hosts: [],
      operator_autopilot: null
    };
    const providerWorkflowConfigStore = {
      bootstrap: vi.fn(async () => statusPayload),
      refresh: vi.fn(async () => {
        throw new Error('full provider workflow refresh should not run for status reads');
      }),
      refreshStatus: vi.fn(async () => statusPayload),
      snapshot: vi.fn(() => statusPayload),
      getLaunchConfigPath: vi.fn(async () => statusPayload.snapshot_path ?? ''),
      recordTerminalCleanupResult: vi.fn(),
      recordOperatorAutopilotResult: vi.fn()
    };

    const runtime = createControlRuntime({
      controlStore: fixture.controlStore,
      questionQueue: { list: () => [] },
      paths: fixture.paths,
      linearAdvisoryState: { tracked_issue: null },
      providerWorkflowConfigStore
    });

    const selectedSnapshot = await runtime.snapshot().readSelectedRunSnapshot();

    expect(selectedSnapshot.providerWorkflow?.pipeline_id).toBe('provider-linear-worker');
    expect(providerWorkflowConfigStore.refreshStatus).toHaveBeenCalledTimes(1);
    expect(providerWorkflowConfigStore.refresh).not.toHaveBeenCalled();
  });

  it('passes provider-intake task ids into docs freshness repo-gate discovery', async () => {
    const activeTaskId = 'linear-current-docs-gate';
    const generatedAt = new Date().toISOString();
    const providerIntakeState = createProviderIntakeState([
      {
        provider: 'linear',
        provider_key: 'linear:CO-535',
        issue_id: 'issue-current',
        issue_identifier: 'CO-535',
        issue_title: 'Current docs gate issue',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-05-14T00:50:00.000Z',
        task_id: activeTaskId,
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-05-14T00:50:00.000Z',
        updated_at: '2026-05-14T00:50:00.000Z',
        last_delivery_id: 'delivery-current',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_778_700_000_000,
        run_id: 'run-1',
        run_manifest_path: null,
        launch_source: 'control-host',
        launch_token: 'current-launch'
      },
      {
        provider: 'linear',
        provider_key: 'linear:CO-534',
        issue_id: 'issue-completed',
        issue_identifier: 'CO-534',
        issue_title: 'Completed docs gate issue',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-05-14T00:59:00.000Z',
        task_id: 'linear-completed-docs-gate',
        mapping_source: 'provider_id_fallback',
        state: 'completed',
        reason: 'provider_issue_terminal',
        accepted_at: '2026-05-14T00:40:00.000Z',
        updated_at: '2026-05-14T00:59:00.000Z',
        last_delivery_id: 'delivery-completed',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_778_700_001_000,
        run_id: 'run-completed',
        run_manifest_path: null,
        launch_source: 'control-host',
        launch_token: 'completed-launch'
      }
    ]);
    const fixture = await createFixture({
      providerIntakeState,
      env: (root) =>
        ({
          CODEX_ORCHESTRATOR_ROOT: root,
          CODEX_ORCHESTRATOR_OUT_DIR: join(root, 'out')
        }) as NodeJS.ProcessEnv
    });
    const currentReport = join(fixture.root, 'out', activeTaskId, 'docs-freshness-maintenance.json');
    const completedReport = join(fixture.root, 'out', 'linear-completed-docs-gate', 'docs-freshness-maintenance.json');
    const unrelatedReport = join(fixture.root, 'out', 'linear-unrelated', 'docs-freshness-maintenance.json');
    await writeDocsFreshnessMaintenanceReport(currentReport, {
      generatedAt,
      severity: 'warning',
      freshnessDecision: 'clean',
      actionRequiredCount: 2
    });
    await writeDocsFreshnessMaintenanceReport(unrelatedReport, {
      generatedAt,
      severity: 'blocking',
      freshnessDecision: 'block_policy_over_budget',
      actionRequiredCount: 99
    });
    await writeDocsFreshnessMaintenanceReport(completedReport, {
      generatedAt,
      severity: 'blocking',
      freshnessDecision: 'block_policy_over_budget',
      actionRequiredCount: 98
    });

    const selectedSnapshot = await fixture.runtime.snapshot().readSelectedRunSnapshot();
    const gate = selectedSnapshot.repoGates?.docs_freshness_maintain;

    expect(gate).toMatchObject({
      severity: 'warning',
      freshness_decision: 'clean',
      source_path: currentReport
    });
    expect(gate?.report_candidates).not.toEqual(expect.arrayContaining([expect.objectContaining({ path: unrelatedReport })]));
    expect(gate?.report_candidates).not.toEqual(expect.arrayContaining([expect.objectContaining({ path: completedReport })]));
  });

  it('includes the selected run task id in docs freshness repo-gate discovery', async () => {
    const selectedTaskId = 'selected-docs-gate';
    const completedTaskId = 'completed-docs-gate';
    const generatedAt = new Date().toISOString();
    const providerIntakeState = createProviderIntakeState([
      {
        provider: 'linear',
        provider_key: 'linear:CO-534',
        issue_id: 'issue-completed',
        issue_identifier: 'CO-534',
        issue_title: 'Completed docs gate issue',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-05-14T00:59:00.000Z',
        task_id: completedTaskId,
        mapping_source: 'provider_id_fallback',
        state: 'completed',
        reason: 'provider_issue_terminal',
        accepted_at: '2026-05-14T00:40:00.000Z',
        updated_at: '2026-05-14T00:59:00.000Z',
        last_delivery_id: 'delivery-completed',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_778_700_001_000,
        run_id: 'run-completed',
        run_manifest_path: null,
        launch_source: 'control-host',
        launch_token: 'completed-launch'
      }
    ]);
    const fixture = await createFixture({
      taskId: selectedTaskId,
      providerIntakeState,
      env: (root) =>
        ({
          CODEX_ORCHESTRATOR_ROOT: root,
          CODEX_ORCHESTRATOR_OUT_DIR: join(root, 'out')
        }) as NodeJS.ProcessEnv
    });
    const selectedReport = join(fixture.root, 'out', selectedTaskId, 'docs-freshness-maintenance.json');
    const completedReport = join(fixture.root, 'out', completedTaskId, 'docs-freshness-maintenance.json');
    await writeDocsFreshnessMaintenanceReport(selectedReport, {
      generatedAt,
      severity: 'blocking',
      freshnessDecision: 'block_policy_over_budget',
      actionRequiredCount: 7
    });
    await writeDocsFreshnessMaintenanceReport(completedReport, {
      generatedAt,
      severity: 'blocking',
      freshnessDecision: 'block_policy_over_budget',
      actionRequiredCount: 99
    });

    const selectedSnapshot = await fixture.runtime.snapshot().readSelectedRunSnapshot();
    const gate = selectedSnapshot.repoGates?.docs_freshness_maintain;

    expect(gate).toMatchObject({
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      action_required_count: 7,
      source_path: selectedReport
    });
    expect(gate?.report_candidates).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: completedReport })])
    );
  });

  it('refreshes docs freshness repo-gate evidence across cached selected-run reads', async () => {
    const fixture = await createFixture({
      env: (root) =>
        ({
          CODEX_ORCHESTRATOR_ROOT: root,
          CODEX_ORCHESTRATOR_OUT_DIR: join(root, 'out')
        }) as NodeJS.ProcessEnv
    });
    const localReport = join(fixture.root, 'out', 'local', 'docs-freshness-maintenance.json');
    const initialGeneratedAt = new Date(Date.now() - 60_000).toISOString();
    const refreshedGeneratedAt = new Date(Date.now() - 30_000).toISOString();
    await writeDocsFreshnessMaintenanceReport(localReport, {
      generatedAt: initialGeneratedAt,
      severity: 'warning',
      freshnessDecision: 'clean',
      actionRequiredCount: 0
    });
    const snapshot = fixture.runtime.snapshot();

    const initialSelectedRun = await snapshot.readSelectedRunSnapshot();
    await seedManifest(fixture.paths, {
      summary: 'selected summary should remain cached',
      updated_at: '2026-03-07T00:12:00.000Z'
    });
    await writeDocsFreshnessMaintenanceReport(localReport, {
      generatedAt: refreshedGeneratedAt,
      severity: 'blocking',
      freshnessDecision: 'block_policy_over_budget',
      actionRequiredCount: 12
    });

    const repeatedSelectedRun = await snapshot.readSelectedRunSnapshot();

    expect(initialSelectedRun.selected?.summary).toBe('initial summary');
    expect(repeatedSelectedRun.selected?.summary).toBe('initial summary');
    expect(repeatedSelectedRun.repoGates?.docs_freshness_maintain).toMatchObject({
      severity: 'blocking',
      freshness_decision: 'block_policy_over_budget',
      action_required_count: 12,
      source_path: localReport
    });
  });

  it('reads max concurrent agents from control feature toggles into the compatibility projection', async () => {
    const fixture = await createFixture({
      featureToggles: {
        coordinator: {
          agent: {
            max_concurrent_agents: 7
          }
        }
      }
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

    expect(compatibilityProjection.maxConcurrentAgents).toBe(7);
  });

  it('reuses the cached snapshot across repeated reads until invalidated', async () => {
    const fixture = await createFixture();
    const initialSnapshot = fixture.runtime.snapshot();

    const initialSelectedRun = await initialSnapshot.readSelectedRunSnapshot();
    await seedManifest(fixture.paths, {
      summary: 'updated summary',
      updated_at: '2026-03-07T00:10:00.000Z'
    });
    fixture.controlStore.setLatestAction({
      action: 'pause',
      requestedBy: 'ui',
      reason: 'manual pause'
    });

    const repeatedSnapshot = fixture.runtime.snapshot();
    const repeatedSelectedRun = await repeatedSnapshot.readSelectedRunSnapshot();

    expect(repeatedSnapshot).toBe(initialSnapshot);
    expect(initialSelectedRun.selected?.summary).toBe('initial summary');
    expect(repeatedSelectedRun.selected?.summary).toBe('initial summary');
    expect(repeatedSelectedRun.selected?.displayStatus).toBe('in_progress');
    expect(repeatedSelectedRun.selected?.statusReason ?? null).toBeNull();
  });

  it('keeps the selected-run cache independent when compatibility projection is read first', async () => {
    const fixture = await createFixture();
    const snapshot = fixture.runtime.snapshot();

    const initialCompatibility = await snapshot.readCompatibilityProjection();
    await seedManifest(fixture.paths, {
      summary: 'selected summary after compatibility read',
      updated_at: '2026-03-07T00:12:00.000Z'
    });

    const selectedRun = await snapshot.readSelectedRunSnapshot();

    expect(initialCompatibility.selected?.summary).toBe('initial summary');
    expect(selectedRun.selected?.summary).toBe('selected summary after compatibility read');
  });

  it('keeps the compatibility source cache independent when selected-run snapshot is read first', async () => {
    const fixture = await createFixture();
    const snapshot = fixture.runtime.snapshot();

    const initialSelectedRun = await snapshot.readSelectedRunSnapshot();
    await seedManifest(fixture.paths, {
      summary: 'compatibility summary after selected read',
      updated_at: '2026-03-07T00:13:00.000Z'
    });

    const compatibilityProjection = await snapshot.readCompatibilityProjection();

    expect(initialSelectedRun.selected?.summary).toBe('initial summary');
    expect(compatibilityProjection.selected?.summary).toBe('compatibility summary after selected read');
  });

  it('reads control and queued-question state independently for the compatibility source', async () => {
    const questions: QuestionRecord[] = [];
    const fixture = await createFixture({ questions });
    const snapshot = fixture.runtime.snapshot();

    const initialSelectedRun = await snapshot.readSelectedRunSnapshot();
    fixture.controlStore.setLatestAction({
      action: 'pause',
      requestedBy: 'ui',
      reason: 'manual pause'
    });
    questions.push({
      question_id: 'question-1',
      parent_run_id: 'run-1',
      from_run_id: 'child-run-1',
      from_manifest_path: fixture.paths.manifestPath,
      prompt: 'Need approval',
      urgency: 'high',
      status: 'queued',
      queued_at: '2026-03-07T00:14:00.000Z',
      expires_at: null,
      expires_in_ms: null,
      auto_pause: true,
      expiry_fallback: null
    });

    const compatibilityProjection = await snapshot.readCompatibilityProjection();

    expect(initialSelectedRun.selected?.displayStatus).toBe('in_progress');
    expect(initialSelectedRun.selected?.questionSummary.queuedCount).toBe(0);
    expect(compatibilityProjection.selected?.display_status).toBe('paused');
    expect(compatibilityProjection.selected?.status_reason).toBe('queued_questions');
    expect(compatibilityProjection.selected?.question_summary.queued_count).toBe(1);
    expect(compatibilityProjection.selected?.latest_action).toBe('pause');
  });

  it('discovers sibling running and retrying compatibility entries while keeping selected-run local', async () => {
    const providerIntakeState = createProviderIntakeState();
    const fixture = await createFixture({
      taskId: 'task-1034-current',
      providerIntakeState
    });

    const runningPaths = await createSiblingRun(fixture.root, 'task-1034-running', 'run-2', {
      manifest: {
        status: 'in_progress',
        summary: 'sibling run is paused for approval',
        updated_at: '2026-03-07T00:16:00.000Z'
      },
      control: {
        latest_action: {
          action: 'pause',
          requested_by: 'telegram',
          requested_at: '2026-03-07T00:16:30.000Z',
          reason: 'awaiting operator'
        }
      },
      questions: [
        {
          question_id: 'q-0001',
          parent_run_id: 'run-2',
          from_run_id: 'child-run-2',
          from_manifest_path: null,
          prompt: 'Approve deployment?',
          urgency: 'high',
          status: 'queued',
          queued_at: '2026-03-07T00:16:40.000Z',
          expires_at: null,
          expires_in_ms: null,
          auto_pause: true,
          expiry_fallback: null
        }
      ]
    });
    providerIntakeState.claims.push({
      provider: 'linear',
      provider_key: 'linear:task-1034-running',
      issue_id: 'task-1034-running',
      issue_identifier: 'task-1034-running',
      issue_title: 'Running sibling issue',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-07T00:16:00.000Z',
      task_id: 'task-1034-running',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-07T00:16:05.000Z',
      updated_at: '2026-03-07T00:16:10.000Z',
      last_delivery_id: 'delivery-running',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_010_000,
      run_id: 'run-2',
      run_manifest_path: runningPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'running-launch'
    });

    const retryPaths = await createSiblingRun(fixture.root, 'task-1034-retrying', 'run-3', {
      manifest: {
        status: 'failed',
        completed_at: null,
        summary: 'retryable failure pending rerun',
        workspace_path: join(fixture.root, '.workspaces', 'task-1034-retrying'),
        updated_at: '2026-03-07T00:17:00.000Z'
      }
    });
    providerIntakeState.claims.push({
      provider: 'linear',
      provider_key: 'linear:task-1034-retrying',
      issue_id: 'task-1034-retrying',
      issue_identifier: 'task-1034-retrying',
      issue_title: 'Retry issue',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-07T00:17:00.000Z',
      task_id: 'task-1034-retrying',
      mapping_source: 'provider_id_fallback',
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      accepted_at: '2026-03-07T00:17:05.000Z',
      updated_at: '2026-03-07T00:17:10.000Z',
      last_delivery_id: 'delivery-retrying',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_020_000,
      run_id: 'run-3',
      run_manifest_path: retryPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'retry-launch',
      retry_queued: true,
      retry_attempt: 2,
      retry_due_at: '2026-03-07T00:17:30.000Z',
      retry_error: 'retryable failure pending rerun'
    });

    const selectedSnapshot = await fixture.runtime.snapshot().readSelectedRunSnapshot();
    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const issueIdentifiers = compatibilityProjection.issues.map((issue) => issue.issueIdentifier);
    const siblingRunning = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'task-1034-running'
    );
    const siblingRetry = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'task-1034-retrying'
    );

    expect(selectedSnapshot.selected?.issueIdentifier).toBe('task-1034-current');
    expect(selectedSnapshot.selected?.questionSummary.queuedCount).toBe(0);
    expect(compatibilityProjection.selected?.issue_identifier).toBe('task-1034-current');
    expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
      'task-1034-current',
      'task-1034-running'
    ]);
    expect(compatibilityProjection.retrying.map((entry) => entry.issue_identifier)).toEqual([
      'task-1034-retrying'
    ]);
    expect(issueIdentifiers).toEqual([
      'task-1034-current',
      'task-1034-running',
      'task-1034-retrying'
    ]);
    expect(siblingRunning?.payload.display_status).toBe('paused');
    expect(siblingRunning?.payload.status_reason).toBe('queued_questions');
    expect(siblingRunning?.payload.question_summary.queued_count).toBe(1);
    expect(siblingRunning?.payload.running).toMatchObject({
      issue_identifier: 'task-1034-running',
      display_state: 'paused'
    });
    expect(siblingRetry?.payload.retry).toMatchObject({
      issue_identifier: 'task-1034-retrying',
      state: 'resumable',
      workspace_path: join(fixture.root, '.workspaces', 'task-1034-retrying'),
      attempt: 2,
      due_at: '2026-03-07T00:17:30.000Z',
      error: 'retryable failure pending rerun',
      last_event: 'resumable',
      last_message: 'provider_issue_rehydrated_resumable_run',
      last_event_at: '2026-03-07T00:17:10.000Z'
    });
    expect(siblingRetry?.payload.summary).toBe('provider_issue_rehydrated_resumable_run');
    expect(siblingRetry?.payload.attempts).toEqual({
      restart_count: 1,
      current_retry_attempt: 2
    });
  });

  it('falls back to manifest-only retry compatibility rows when provider intake state is absent', async () => {
    const fixture = await createFixture({
      taskId: 'task-1034-current'
    });

    await createSiblingRun(fixture.root, 'task-1034-retrying', 'run-3', {
      manifest: {
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'issue-1034-retrying',
        issue_identifier: 'ISSUE-1034-RETRYING',
        summary: 'retryable failure pending rerun',
        workspace_path: join(fixture.root, '.workspaces', 'task-1034-retrying'),
        updated_at: '2026-03-07T00:17:00.000Z'
      }
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const fallbackRetry = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'ISSUE-1034-RETRYING'
    );

    expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
      'task-1034-current'
    ]);
    expect(compatibilityProjection.retrying.map((entry) => entry.issue_identifier)).toEqual([
      'ISSUE-1034-RETRYING'
    ]);
    expect(fallbackRetry?.payload.retry).toMatchObject({
      issue_identifier: 'ISSUE-1034-RETRYING',
      state: 'failed',
      workspace_path: join(fixture.root, '.workspaces', 'task-1034-retrying'),
      error: 'retryable failure pending rerun',
      last_event: 'failed',
      last_message: 'retryable failure pending rerun'
    });
  });

  it('falls back to manifest-only retry compatibility rows when provider intake state has no claims', async () => {
    const fixture = await createFixture({
      taskId: 'task-1034-current',
      providerIntakeState: createProviderIntakeState([])
    });

    await createSiblingRun(fixture.root, 'task-1034-retrying', 'run-3', {
      manifest: {
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'issue-1034-retrying',
        issue_identifier: 'ISSUE-1034-RETRYING',
        summary: 'retryable failure pending rerun',
        workspace_path: join(fixture.root, '.workspaces', 'task-1034-retrying'),
        updated_at: '2026-03-07T00:17:00.000Z'
      }
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const fallbackRetry = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'ISSUE-1034-RETRYING'
    );

    expect(compatibilityProjection.retrying.map((entry) => entry.issue_identifier)).toEqual([
      'ISSUE-1034-RETRYING'
    ]);
    expect(fallbackRetry?.payload.retry).toMatchObject({
      issue_identifier: 'ISSUE-1034-RETRYING',
      state: 'failed',
      workspace_path: join(fixture.root, '.workspaces', 'task-1034-retrying'),
      error: 'retryable failure pending rerun',
      last_event: 'failed',
      last_message: 'retryable failure pending rerun'
    });
  });

  it('keeps queued provider retries active on the selected run when retry attempt is missing', async () => {
    const providerIntakeState = createProviderIntakeState([
      {
        provider: 'linear',
        provider_key: 'linear:issue-1034-current',
        issue_id: 'issue-1034-current',
        issue_identifier: 'ISSUE-1034-CURRENT',
        issue_title: 'Queued retry without recorded attempt',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-07T00:17:00.000Z',
        task_id: 'task-1034-current',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-03-07T00:17:05.000Z',
        updated_at: '2026-03-07T00:17:10.000Z',
        last_delivery_id: 'delivery-selected-retry',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_020_000,
        run_id: null,
        run_manifest_path: null,
        launch_source: 'control-host',
        launch_token: 'selected-retry-launch',
        retry_queued: true,
        retry_attempt: null,
        retry_due_at: '2026-03-07T00:17:30.000Z',
        retry_error: null
      }
    ]);
    const fixture = await createFixture({
      taskId: 'task-1034-current',
      providerIntakeState
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-1034-current',
      issue_id: 'issue-1034-current',
      issue_identifier: 'ISSUE-1034-CURRENT',
      summary: 'selected run remains current authority',
      updated_at: '2026-03-07T00:17:00.000Z'
    });

    const selectedSnapshot = await fixture.runtime.snapshot().readSelectedRunSnapshot();

    expect(selectedSnapshot.selected?.providerRetryState).toEqual({
      active: true,
      attempt: null,
      due_at: '2026-03-07T00:17:30.000Z',
      error: null
    });
  });

  it('clears selected provider retry state when the matching authoritative claim is terminal', async () => {
    const providerIntakeState = createProviderIntakeState([
      {
        provider: 'linear',
        provider_key: 'linear:issue-co-554',
        issue_id: 'issue-co-554',
        issue_identifier: 'CO-554',
        issue_title: 'Terminal completed retry claim',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-05-18T19:20:00.000Z',
        task_id: 'task-co-554-completed-retry',
        mapping_source: 'provider_id_fallback',
        state: 'completed',
        reason: 'provider_issue_rehydrated_completed_run',
        accepted_at: '2026-05-18T19:05:00.000Z',
        updated_at: '2026-05-18T20:35:00.000Z',
        last_delivery_id: 'delivery-co-554-terminal-retry',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_779_112_800_000,
        run_id: 'run-co-554-completed',
        run_manifest_path: null,
        launch_source: null,
        launch_token: null,
        retry_queued: true,
        retry_attempt: 1,
        retry_due_at: '2026-05-18T20:36:00.000Z',
        retry_error: 'stale completed-run continuation'
      }
    ]);
    const fixture = await createFixture({
      taskId: 'task-co-554-completed-retry',
      providerIntakeState
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-co-554-completed-retry',
      run_id: 'run-co-554-completed',
      issue_provider: 'linear',
      issue_id: 'issue-co-554',
      issue_identifier: 'CO-554',
      summary: 'selected run has stale retry fields after terminal issue refresh',
      updated_at: '2026-05-18T20:35:00.000Z'
    });

    const selectedSnapshot = await fixture.runtime.snapshot().readSelectedRunSnapshot();

    expect(selectedSnapshot.selected?.issueIdentifier).toBe('CO-554');
    expect(selectedSnapshot.selected?.providerRetryState).toBeNull();
    expect(selectedSnapshot.providerIntake).toMatchObject({
      active_claim_count: 0,
      running_claim_count: 0,
      active_issue_identifiers: [],
      selected_claim: {
        issue_identifier: 'CO-554',
        retry: {
          active: false,
          attempt: 1,
          due_at: '2026-05-18T20:36:00.000Z',
          error: 'stale completed-run continuation'
        }
      }
    });
  });

  it('keeps authoritative retry due_at metadata when the queued retry has no recorded attempt yet', async () => {
    const providerIntakeState = createProviderIntakeState([]);
    const fixture = await createFixture({
      taskId: 'task-1034-current',
      providerIntakeState
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-1034-current',
      issue_identifier: 'task-1034-current',
      summary: 'selected run remains current authority',
      updated_at: '2026-03-07T00:17:00.000Z'
    });

    const retryPaths = await createSiblingRun(fixture.root, 'task-1034-retrying', 'run-3', {
      manifest: {
        status: 'failed',
        completed_at: null,
        summary: 'retryable failure pending rerun',
        workspace_path: join(fixture.root, '.workspaces', 'task-1034-retrying'),
        updated_at: '2026-03-07T00:17:00.000Z'
      }
    });
    providerIntakeState.claims.push({
      provider: 'linear',
      provider_key: 'linear:task-1034-retrying',
      issue_id: 'task-1034-retrying',
      issue_identifier: 'task-1034-retrying',
      issue_title: 'Retry issue without attempt',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-07T00:17:00.000Z',
      task_id: 'task-1034-retrying',
      mapping_source: 'provider_id_fallback',
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      accepted_at: '2026-03-07T00:17:05.000Z',
      updated_at: '2026-03-07T00:17:10.000Z',
      last_delivery_id: 'delivery-retrying',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_020_000,
      run_id: 'run-3',
      run_manifest_path: retryPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'retry-launch',
      retry_queued: true,
      retry_attempt: null,
      retry_due_at: '2026-03-07T00:17:30.000Z',
      retry_error: null
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const retryEntry = compatibilityProjection.retrying.find(
      (entry) => entry.issue_identifier === 'task-1034-retrying'
    );
    const retryIssue = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'task-1034-retrying'
    );

    expect(retryEntry).toMatchObject({
      issue_identifier: 'task-1034-retrying',
      state: 'resumable',
      attempt: null,
      due_at: '2026-03-07T00:17:30.000Z'
    });
    expect(retryIssue?.payload.retry).toMatchObject({
      issue_identifier: 'task-1034-retrying',
      attempt: null,
      due_at: '2026-03-07T00:17:30.000Z'
    });
    expect(retryIssue?.payload.attempts).toEqual({
      restart_count: null,
      current_retry_attempt: null
    });
  });

  it('preserves authoritative retry attempts on a running issue after a prior restart', async () => {
    const providerIntakeState = createProviderIntakeState([
      {
        provider: 'linear',
        provider_key: 'linear:issue-1035',
        issue_id: 'issue-1035',
        issue_identifier: 'ISSUE-1035',
        issue_title: 'Retrying running issue',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-07T00:18:00.000Z',
        task_id: 'task-1035-current',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-03-07T00:17:30.000Z',
        updated_at: '2026-03-07T00:18:10.000Z',
        last_delivery_id: 'delivery-1035',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_030_000,
        run_id: null,
        run_manifest_path: null,
        launch_source: 'control-host',
        launch_token: 'launch-1035',
        retry_queued: false,
        retry_attempt: 2,
        retry_due_at: null,
        retry_error: 'retryable failure pending rerun'
      }
    ]);
    const fixture = await createFixture({
      taskId: 'task-1035-current',
      providerIntakeState
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-1035-current',
      issue_identifier: 'ISSUE-1035',
      summary: 'selected run remains current authority',
      updated_at: '2026-03-07T00:15:00.000Z'
    });

    await createSiblingRun(fixture.root, 'task-1035-current', 'run-2', {
      manifest: {
        task_id: 'task-1035-current',
        issue_identifier: 'ISSUE-1035',
        status: 'failed',
        completed_at: null,
        summary: 'retryable failure pending rerun',
        updated_at: '2026-03-07T00:17:00.000Z'
      }
    });

    await createSiblingRun(fixture.root, 'task-1035-current', 'run-3', {
      manifest: {
        task_id: 'task-1035-current',
        issue_id: 'issue-1035',
        issue_identifier: 'ISSUE-1035',
        status: 'in_progress',
        summary: 'newer run is awaiting operator input',
        updated_at: '2026-03-07T00:18:00.000Z'
      },
      control: {
        latest_action: {
          action: 'pause',
          requested_by: 'telegram',
          requested_at: '2026-03-07T00:18:10.000Z',
          reason: 'awaiting operator'
        }
      },
      questions: [
        {
          question_id: 'q-1035-1',
          parent_run_id: 'run-3',
          from_run_id: 'child-run-3',
          from_manifest_path: null,
          prompt: 'Approve deploy?',
          urgency: 'high',
          status: 'queued',
          queued_at: '2026-03-07T00:18:20.000Z',
          expires_at: null,
          expires_in_ms: null,
          auto_pause: true,
          expiry_fallback: null
        }
      ]
    });

    const selectedSnapshot = await fixture.runtime.snapshot().readSelectedRunSnapshot();
    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const sameIssueRecord = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'ISSUE-1035'
    );

    expect(selectedSnapshot.selected).toMatchObject({
      issueIdentifier: 'ISSUE-1035',
      taskId: 'task-1035-current',
      runId: 'run-1',
      summary: 'selected run remains current authority'
    });
    expect(selectedSnapshot.selected?.questionSummary.queuedCount).toBe(0);
    expect(compatibilityProjection.selected).toMatchObject({
      issue_identifier: 'ISSUE-1035',
      run_id: 'run-1'
    });
    expect(compatibilityProjection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'ISSUE-1035',
        session_id: null,
        display_state: 'paused'
      })
    ]);
    expect(compatibilityProjection.retrying).toEqual([]);
    expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toEqual(['ISSUE-1035']);
    expect(sameIssueRecord?.aliases).toEqual(
      expect.arrayContaining(['ISSUE-1035', 'task-1035-current', 'run-1', 'run-3'])
    );
    expect(sameIssueRecord?.payload).toMatchObject({
      issue_identifier: 'ISSUE-1035',
      display_status: 'paused',
      status_reason: 'queued_questions',
      attempts: {
        restart_count: 1,
        current_retry_attempt: 2
      },
      last_error: null,
      question_summary: {
        queued_count: 1
      },
      running: {
        issue_identifier: 'ISSUE-1035',
        session_id: null,
        display_state: 'paused'
      },
      retry: {
        attempt: 2,
        due_at: null,
        error: 'retryable failure pending rerun'
      }
    });
  });

  it('keeps unmatched non-intake running sources visible when linear intake claims exist', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const providerIntakeState = createProviderIntakeState();
      const fixture = await createFixture({
        taskId: 'task-current-linear',
        providerIntakeState
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-current-linear',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:00:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      const linearSibling = await createSiblingRun(fixture.root, 'task-claim-backed', 'run-2', {
        manifest: {
          issue_provider: 'linear',
          issue_id: 'issue-active',
          issue_identifier: 'ISSUE-ACTIVE',
          status: 'in_progress',
          started_at: '2026-03-07T00:20:00.000Z',
          updated_at: '2026-03-07T00:29:00.000Z'
        }
      });
      providerIntakeState.claims.push({
        provider: 'linear',
        provider_key: 'linear:issue-active',
        issue_id: 'issue-active',
        issue_identifier: 'ISSUE-ACTIVE',
        issue_title: 'Claim-backed active issue',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-07T00:29:00.000Z',
        task_id: 'task-claim-backed',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-03-07T00:28:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        last_delivery_id: 'delivery-active',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_170_000,
        run_id: 'run-2',
        run_manifest_path: linearSibling.manifestPath,
        launch_source: 'control-host',
        launch_token: 'launch-active'
      });

      await createSiblingRun(fixture.root, 'task-local-active', 'run-3', {
        manifest: {
          issue_provider: 'local',
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          summary: 'local active run without provider intake claim'
        }
      });
      await createSiblingRun(fixture.root, 'task-linear-stale', 'run-4', {
        manifest: {
          issue_provider: 'linear',
          status: 'in_progress',
          started_at: '2026-03-07T00:05:00.000Z',
          updated_at: '2026-03-07T00:10:00.000Z',
          summary: 'linear historical run without a current intake claim'
        }
      });
      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT',
        'task-local-active',
        'ISSUE-ACTIVE'
      ]);
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === 'task-local-active')
      ).toBeDefined();
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === 'task-linear-stale')
      ).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('surfaces worker_host from provider proof/debug through selected and compatibility payloads', async () => {
    const fixture = await createFixture({
      taskId: 'task-worker-host'
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-worker-host',
      issue_id: 'issue-worker-host',
      issue_identifier: 'ISSUE-WORKER-HOST',
      status: 'in_progress',
      started_at: '2026-03-07T00:20:00.000Z',
      updated_at: '2026-03-07T00:21:00.000Z',
      summary: 'worker host should surface'
    });
    await seedProviderLinearWorkerProof(fixture.paths, {
      issue_id: 'issue-worker-host',
      issue_identifier: 'ISSUE-WORKER-HOST',
      pid: '4242',
      thread_id: 'thread-worker-host',
      latest_turn_id: 'turn-worker-host',
      latest_session_id: 'session-worker-host',
      latest_session_id_source: 'derived_from_thread_and_turn',
      turn_count: 3,
      last_event: 'turn_running',
      last_message: 'worker host is present',
      last_event_at: '2026-03-07T00:21:00.000Z',
      tokens: {
        input_tokens: 3,
        output_tokens: 2,
        total_tokens: 5
      },
      rate_limits: null,
      owner_phase: 'turn_running',
      owner_status: 'in_progress',
      workspace_path: '/tmp/worker-host-workspace',
      end_reason: null,
      updated_at: '2026-03-07T00:21:00.000Z',
      worker_host: 'worker-host-01'
    });

    const selectedSnapshot = await fixture.runtime.snapshot().readSelectedRunSnapshot();
    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const issueRecord = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'ISSUE-WORKER-HOST'
    );

    expect(selectedSnapshot.selected?.providerDebugSnapshot?.worker).toMatchObject({
      worker_host: 'worker-host-01'
    });
    expect(compatibilityProjection.selected).toMatchObject({
      issue_identifier: 'ISSUE-WORKER-HOST',
      worker_host: 'worker-host-01',
      provider_debug_snapshot: {
        worker: {
          worker_host: 'worker-host-01'
        }
      }
    });
    expect(compatibilityProjection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'ISSUE-WORKER-HOST',
        session_id: 'session-worker-host',
        worker_host: 'worker-host-01'
      })
    ]);
    expect(issueRecord?.payload).toMatchObject({
      issue_identifier: 'ISSUE-WORKER-HOST',
      worker_host: 'worker-host-01',
      provider_debug_snapshot: {
        worker: {
          worker_host: 'worker-host-01'
        }
      }
    });
  });

  it('does not revive historical in-progress manifests when provider intake state is present but empty', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-empty-intake-current',
        providerIntakeState: createProviderIntakeState([])
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-empty-intake-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      await createSiblingRun(fixture.root, 'task-empty-intake-stale', 'run-2', {
        manifest: {
          issue_provider: 'linear',
          issue_id: 'issue-stale',
          issue_identifier: 'ISSUE-STALE',
          status: 'in_progress',
          started_at: '2026-03-07T00:00:00.000Z',
          updated_at: '2026-03-07T00:05:00.000Z',
          summary: 'stale historical run'
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT'
      ]);
      expect(compatibilityProjection.issues.find((issue) => issue.issueIdentifier === 'ISSUE-STALE')).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps non-intake running sources visible when provider intake state is present but empty', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-empty-intake-current',
        providerIntakeState: createProviderIntakeState([])
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-empty-intake-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      await createSiblingRun(fixture.root, 'task-empty-intake-local', 'run-2', {
        manifest: {
          issue_provider: 'local',
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          summary: 'local active run without intake scoping'
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT',
        'task-empty-intake-local'
      ]);
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === 'task-empty-intake-local')
      ).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps explicitly identified null-provider running sources visible when provider intake state is present but empty', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-empty-intake-current',
        providerIntakeState: createProviderIntakeState([])
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-empty-intake-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      await createSiblingRun(fixture.root, 'task-empty-intake-null-provider', 'run-2', {
        manifest: {
          issue_identifier: 'ISSUE-NULL-PROVIDER',
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          summary: 'active run using the default null issue_provider'
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT',
        'ISSUE-NULL-PROVIDER'
      ]);
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === 'ISSUE-NULL-PROVIDER')
      ).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps explicitly identified null-provider running sources visible when provider intake state is missing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-missing-intake-current'
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-missing-intake-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      await createSiblingRun(fixture.root, 'task-missing-intake-null-provider', 'run-2', {
        manifest: {
          issue_identifier: 'ISSUE-NULL-PROVIDER',
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          summary: 'active null-provider run without an intake snapshot'
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT',
        'ISSUE-NULL-PROVIDER'
      ]);
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === 'ISSUE-NULL-PROVIDER')
      ).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps explicitly identified null-provider running sources visible when provider intake state has no active claims', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-completed-intake-current',
        providerIntakeState: createProviderIntakeState([
          {
            provider: 'linear',
            provider_key: 'linear:issue-completed',
            issue_id: 'issue-completed',
            issue_identifier: 'ISSUE-COMPLETED',
            issue_title: 'Completed Linear issue',
            issue_state: 'Done',
            issue_state_type: 'completed',
            issue_updated_at: '2026-03-07T00:26:00.000Z',
            task_id: 'task-completed-claim',
            mapping_source: 'provider_id_fallback',
            state: 'completed',
            reason: 'provider_issue_rehydrated_active_run',
            accepted_at: '2026-03-07T00:15:00.000Z',
            updated_at: '2026-03-07T00:26:00.000Z',
            last_delivery_id: 'delivery-completed',
            last_event: 'Issue',
            last_action: 'update',
            last_webhook_timestamp: 1_742_360_160_000,
            run_id: 'run-completed',
            run_manifest_path: null,
            launch_source: 'control-host',
            launch_token: 'launch-completed'
          }
        ])
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-completed-intake-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      await createSiblingRun(fixture.root, 'task-completed-intake-null-provider', 'run-2', {
        manifest: {
          issue_identifier: 'ISSUE-NULL-PROVIDER',
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          summary: 'active run using the default null issue_provider'
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT',
        'ISSUE-NULL-PROVIDER'
      ]);
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === 'ISSUE-NULL-PROVIDER')
      ).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps unmatched explicitly identified null-provider running sources visible when active linear claims exist', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:issue-active',
          issue_id: 'issue-active',
          issue_identifier: 'ISSUE-ACTIVE',
          issue_title: 'Claim-backed active issue',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-07T00:29:30.000Z',
          task_id: 'task-claim-backed',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-07T00:28:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          last_delivery_id: 'delivery-active',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_170_000,
          run_id: 'run-2',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-active'
        }
      ]);
      const fixture = await createFixture({
        taskId: 'task-null-provider-current',
        providerIntakeState
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-null-provider-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      await createSiblingRun(fixture.root, 'task-claim-backed', 'run-2', {
        manifest: {
          issue_provider: 'linear',
          issue_id: 'issue-active',
          issue_identifier: 'ISSUE-ACTIVE',
          status: 'in_progress',
          started_at: '2026-03-07T00:28:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z'
        }
      });
      await createSiblingRun(fixture.root, 'task-null-provider-active', 'run-3', {
        manifest: {
          issue_identifier: 'ISSUE-NULL-PROVIDER',
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:45.000Z',
          summary: 'active run using the default null issue_provider'
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT',
        'ISSUE-NULL-PROVIDER',
        'ISSUE-ACTIVE'
      ]);
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === 'ISSUE-NULL-PROVIDER')
      ).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('suppresses fallback-only null-provider running sources when provider intake state is present but empty', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-fallback-only-current',
        providerIntakeState: createProviderIntakeState([])
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-fallback-only-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      await createSiblingRun(fixture.root, 'rlm-CO', 'run-2', {
        manifest: {
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          summary: 'historical fallback-only null-provider run'
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT'
      ]);
      expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toEqual([
        'ISSUE-CURRENT'
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('suppresses fallback-only null-provider running sources when provider intake state is missing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-missing-intake-fallback-current'
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-missing-intake-fallback-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      await createSiblingRun(fixture.root, 'rlm-CO', 'run-2', {
        manifest: {
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          summary: 'historical fallback-only null-provider run without an intake snapshot'
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT'
      ]);
      expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toEqual([
        'ISSUE-CURRENT'
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps fresh explicitly identified null-provider running sources when started_at is newer than updated_at', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-null-provider-current',
        providerIntakeState: createProviderIntakeState([])
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-null-provider-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      await createSiblingRun(fixture.root, 'task-null-provider-fresh-start', 'run-2', {
        manifest: {
          issue_identifier: 'ISSUE-NULL-PROVIDER-FRESH-START',
          status: 'in_progress',
          started_at: '2026-03-07T00:29:45.000Z',
          updated_at: '2026-03-07T00:10:00.000Z',
          summary: 'fresh explicit null-provider run with stale updated_at'
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT',
        'ISSUE-NULL-PROVIDER-FRESH-START'
      ]);
      expect(
        compatibilityProjection.issues.find(
          (issue) => issue.issueIdentifier === 'ISSUE-NULL-PROVIDER-FRESH-START'
        )
      ).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not count the selected null-provider fallback manifest as current running activity without an active claim', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'local-mcp',
        providerIntakeState: createProviderIntakeState([])
      });
      await seedManifest(fixture.paths, {
        task_id: 'local-mcp',
        status: 'in_progress',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'control host fallback manifest'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running).toEqual([]);
      expect(compatibilityProjection.codexTotals.seconds_running).toBe(0);
      expect(compatibilityProjection.selected?.issue_identifier).toBe('local-mcp');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not count the selected null-provider fallback manifest as current running activity when provider intake state is missing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'local-mcp'
      });
      await seedManifest(fixture.paths, {
        task_id: 'local-mcp',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'control host fallback manifest without an intake snapshot'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running).toEqual([]);
      expect(compatibilityProjection.codexTotals.seconds_running).toBe(0);
      expect(compatibilityProjection.selected?.issue_identifier).toBe('local-mcp');
    } finally {
      vi.useRealTimers();
    }
  });

  it('suppresses selected synthetic linear task-id running rows when no canonical issue identity exists', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
      const fixture = await createFixture({
        taskId
      });
      await seedManifest(fixture.paths, {
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        issue_provider: 'linear',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'provider worker fallback manifest without canonical issue identity'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running).toEqual([]);
      expect(compatibilityProjection.codexTotals.seconds_running).toBeGreaterThan(0);
      expect(compatibilityProjection.issues).toEqual([]);
      expect(compatibilityProjection.selected?.issue_identifier).toBe(taskId);
    } finally {
      vi.useRealTimers();
    }
  });

  it('suppresses null-provider synthetic linear task-id provider-worker rows when no canonical issue identity exists', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
      const fixture = await createFixture({
        taskId
      });
      await seedManifest(fixture.paths, {
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'null-provider provider worker fallback manifest without canonical issue identity'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running).toEqual([]);
      expect(compatibilityProjection.codexTotals.seconds_running).toBeGreaterThan(0);
      expect(compatibilityProjection.issues).toEqual([]);
      expect(compatibilityProjection.selected?.issue_identifier).toBe(taskId);
    } finally {
      vi.useRealTimers();
    }
  });

  it('suppresses slug-shaped synthetic linear task-id provider-worker rows when no canonical issue identity exists', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const taskId = 'linear-lin-issue-1';
      const fixture = await createFixture({
        taskId
      });
      await seedManifest(fixture.paths, {
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'slug-shaped provider worker fallback manifest without canonical issue identity'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running).toEqual([]);
      expect(compatibilityProjection.codexTotals.seconds_running).toBeGreaterThan(0);
      expect(compatibilityProjection.issues).toEqual([]);
      expect(compatibilityProjection.selected?.issue_identifier).toBe(taskId);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps non-linear lookalike task ids authoritative when provider-linear-worker provenance is absent', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
      const fixture = await createFixture({
        taskId
      });
      await seedManifest(fixture.paths, {
        task_id: taskId,
        pipeline_title: 'Custom Background Worker',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'non-linear workflow that happens to use a linear-like task id'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([taskId]);
      expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toEqual([taskId]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps parent-child linear aliases authoritative when provider-linear-worker provenance is absent', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const issueIdentifier = 'linear-lin-issue-1';
      const taskId = `${issueIdentifier}-docs-review`;
      const fixture = await createFixture({
        taskId
      });
      await seedManifest(fixture.paths, {
        task_id: taskId,
        issue_identifier: issueIdentifier,
        issue_id: issueIdentifier,
        pipeline_title: 'Custom Background Worker',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'custom pipeline run with linear-like parent and child aliases'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        issueIdentifier
      ]);
      expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toEqual([
        issueIdentifier
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps non-linear selected rows visible even when their task id matches the synthetic linear pattern', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
      const fixture = await createFixture({
        taskId
      });
      await seedManifest(fixture.paths, {
        task_id: taskId,
        issue_provider: 'github',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'non-linear workflow with a Linear-shaped task id'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([taskId]);
      expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toEqual([taskId]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps non-linear selected rows visible when raw provider intake is missing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
      const fixture = await createFixture({
        taskId,
        readPersistedProviderIntakeState: () => null
      });
      await seedManifest(fixture.paths, {
        task_id: taskId,
        issue_provider: 'github',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'non-linear workflow with unavailable Linear provider intake'
      });

      const projection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const statePayload = await readCompatibilityState({
        readCompatibilityProjection: async () => projection
      });
      const uiDataset = buildUiDataset({
        projection,
        generatedAt: '2026-03-07T00:30:00.000Z'
      });

      expect(projection.providerIntake).toBeNull();
      expect(projection.providerIntakeUnavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(projection.running.map((entry) => entry.issue_identifier)).toEqual([taskId]);
      expect(projection.issues.map((issue) => issue.issueIdentifier)).toEqual([taskId]);
      expect(projection.selected?.issue_identifier).toBe(taskId);
      expect(statePayload.running_ids).toEqual([taskId]);
      expect(statePayload.selected?.issue_identifier).toBe(taskId);
      expect(uiDataset.running.map((entry) => entry.issue_identifier)).toEqual([taskId]);
      expect(uiDataset.selected_issue_identifier).toBe(taskId);
    } finally {
      vi.useRealTimers();
    }
  });

  it('suppresses synthetic Linear selected rows when raw provider intake is missing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
      const fixture = await createFixture({
        taskId,
        readPersistedProviderIntakeState: () => null
      });
      await seedManifest(fixture.paths, {
        task_id: taskId,
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'synthetic Linear fallback without raw provider intake'
      });

      const projection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const statePayload = await readCompatibilityState({
        readCompatibilityProjection: async () => projection
      });
      const uiDataset = buildUiDataset({
        projection,
        generatedAt: '2026-03-07T00:30:00.000Z'
      });

      expect(projection.providerIntake).toBeNull();
      expect(projection.providerIntakeUnavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(projection.running).toEqual([]);
      expect(projection.issues).toEqual([]);
      expect(projection.selected).toBeNull();
      expect(statePayload.running_ids).toEqual([]);
      expect(statePayload.selected).toBeNull();
      expect(uiDataset.running).toEqual([]);
      expect(uiDataset.selected_issue_identifier).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rebinds selected synthetic linear task-id rows to the canonical claim-backed issue identity', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
      const providerIntakeState = createProviderIntakeState();
      const fixture = await createFixture({
        taskId,
        providerIntakeState
      });
      providerIntakeState.claims.push({
        provider: 'linear',
        provider_key: 'linear:lin-issue-146',
        issue_id: 'lin-issue-146',
        issue_identifier: 'CO-146',
        issue_title: 'Claim-backed active issue',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-07T00:29:30.000Z',
        task_id: taskId,
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:30.000Z',
        last_delivery_id: 'delivery-co-146',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_170_000,
        run_id: 'run-1',
        run_manifest_path: fixture.paths.manifestPath,
        launch_source: 'control-host',
        launch_token: 'launch-co-146'
      });
      providerIntakeState.latest_provider_key = 'linear:lin-issue-146';
      providerIntakeState.latest_reason = 'provider_issue_rehydrated_active_run';

      await seedManifest(fixture.paths, {
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        issue_provider: 'linear',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'provider worker fallback manifest matched by claim'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.selected?.issue_identifier).toBe('CO-146');
      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual(['CO-146']);
      expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toEqual(['CO-146']);
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === taskId)
      ).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rebinds discovered synthetic linear task-id running rows to the canonical claim-backed issue identity', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
      const providerIntakeState = createProviderIntakeState();
      const fixture = await createFixture({
        taskId: 'task-current',
        providerIntakeState
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        status: 'in_progress',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      const siblingPaths = await createSiblingRun(fixture.root, taskId, 'run-2', {
        manifest: {
          task_id: taskId,
          pipeline_id: 'provider-linear-worker',
          issue_provider: 'linear',
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          summary: 'discovered provider worker fallback manifest matched by claim'
        }
      });
      providerIntakeState.claims.push({
        provider: 'linear',
        provider_key: 'linear:lin-issue-146',
        issue_id: 'lin-issue-146',
        issue_identifier: 'CO-146',
        issue_title: 'Claim-backed active sibling issue',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-07T00:29:30.000Z',
        task_id: taskId,
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:30.000Z',
        last_delivery_id: 'delivery-co-146-sibling',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_170_000,
        run_id: 'run-2',
        run_manifest_path: siblingPaths.manifestPath,
        launch_source: 'control-host',
        launch_token: 'launch-co-146-sibling'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.selected).toMatchObject({
        issue_identifier: 'ISSUE-CURRENT',
        run_id: 'run-1'
      });
      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT',
        'CO-146'
      ]);
      expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toEqual([
        'ISSUE-CURRENT',
        'CO-146'
      ]);
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === taskId)
      ).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rebinds synthetic child linear task-id rows to the canonical parent issue identity', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const parentTaskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
      const childTaskId = `${parentTaskId}-docs-review`;
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-146',
          issue_id: '0b49c08c-53a1-4225-8d09-28457165fbc8',
          issue_identifier: 'CO-146',
          issue_title: 'Claim-backed active issue',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-07T00:29:30.000Z',
          task_id: parentTaskId,
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          last_delivery_id: 'delivery-co-146',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_170_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-co-146'
        }
      ]);
      const fixture = await createFixture({
        taskId: childTaskId,
        providerIntakeState
      });

      await seedManifest(fixture.paths, {
        run_id: 'run-1',
        task_id: childTaskId,
        pipeline_id: 'docs-review',
        issue_provider: 'linear',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'provider worker child stream fallback manifest matched by parent claim'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.selected?.issue_identifier).toBe('CO-146');
      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual(['CO-146']);
      expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toEqual(['CO-146']);
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === childTaskId)
      ).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('suppresses child-shaped parent fallback aliases when no canonical child match exists', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const parentTaskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
      const childTaskId = `${parentTaskId}-docs-review`;
      const fixture = await createFixture({
        taskId: 'task-current'
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        status: 'in_progress',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      await createSiblingRun(fixture.root, childTaskId, 'run-child', {
        manifest: {
          task_id: childTaskId,
          pipeline_id: 'docs-review',
          issue_provider: 'linear',
          issue_id: parentTaskId,
          issue_identifier: parentTaskId,
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          summary: 'child-shaped provider worker fallback manifest without canonical identity'
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.selected).toMatchObject({
        issue_identifier: 'ISSUE-CURRENT',
        run_id: 'run-1'
      });
      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT'
      ]);
      expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toEqual([
        'ISSUE-CURRENT'
      ]);
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === parentTaskId)
      ).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not treat fallback-only local-mcp claim aliases as authoritative selected activity', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'local-mcp',
        providerIntakeState: createProviderIntakeState([
          {
            provider: 'linear',
            provider_key: 'linear:local-mcp',
            issue_id: 'local-mcp',
            issue_identifier: 'local-mcp',
            issue_title: 'Fallback-only local-mcp claim',
            issue_state: 'In Progress',
            issue_state_type: 'started',
            issue_updated_at: '2026-03-07T00:29:30.000Z',
            task_id: 'local-mcp',
            mapping_source: 'provider_id_fallback',
            state: 'running',
            reason: 'provider_issue_rehydrated_active_run',
            accepted_at: '2026-03-07T00:20:00.000Z',
            updated_at: '2026-03-07T00:29:30.000Z',
            last_delivery_id: 'delivery-local-mcp-fallback-alias',
            last_event: 'Issue',
            last_action: 'update',
            last_webhook_timestamp: 1_742_360_170_000,
            run_id: 'run-other',
            run_manifest_path: null,
            launch_source: 'control-host',
            launch_token: 'launch-local-mcp-fallback-alias'
          }
        ])
      });
      await seedManifest(fixture.paths, {
        task_id: 'local-mcp',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:45.000Z',
        summary: 'selected local-mcp fallback manifest with fallback-alias claim'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running).toEqual([]);
      expect(compatibilityProjection.codexTotals.seconds_running).toBe(0);
      expect(compatibilityProjection.selected?.issue_identifier).toBe('local-mcp');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the selected local-mcp run in running activity when it carries explicit issue identity', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'local-mcp',
        providerIntakeState: createProviderIntakeState([])
      });
      await seedManifest(fixture.paths, {
        task_id: 'local-mcp',
        issue_id: 'issue-local-mcp',
        issue_identifier: 'ISSUE-LOCAL-MCP',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'control host selected run with explicit issue identity'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-LOCAL-MCP'
      ]);
      expect(compatibilityProjection.codexTotals.seconds_running).toBeGreaterThan(0);
      expect(compatibilityProjection.selected?.issue_identifier).toBe('ISSUE-LOCAL-MCP');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not count the selected local-mcp run when explicit issue identity is stale without an active claim', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'local-mcp',
        providerIntakeState: createProviderIntakeState([])
      });
      await seedManifest(fixture.paths, {
        task_id: 'local-mcp',
        issue_id: 'issue-local-mcp',
        issue_identifier: 'ISSUE-LOCAL-MCP',
        status: 'in_progress',
        started_at: '2026-03-07T00:00:00.000Z',
        updated_at: '2026-03-07T00:10:00.000Z',
        summary: 'stale control host selected run with explicit issue identity'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running).toEqual([]);
      expect(compatibilityProjection.codexTotals.seconds_running).toBe(0);
      expect(compatibilityProjection.selected?.issue_identifier).toBe('ISSUE-LOCAL-MCP');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not count the selected local-mcp run when a matching intake claim is no longer active', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:issue-local-mcp',
          issue_id: 'issue-local-mcp',
          issue_identifier: 'ISSUE-LOCAL-MCP',
          issue_title: 'Completed local-mcp claim',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-03-07T00:29:30.000Z',
          task_id: 'local-mcp',
          mapping_source: 'provider_id_fallback',
          state: 'completed',
          reason: 'provider_issue_released:not_active',
          accepted_at: '2026-03-07T00:20:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          last_delivery_id: 'delivery-local-mcp-completed',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_170_000,
          run_id: 'run-1',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-local-mcp-completed'
        }
      ]);
      const fixture = await createFixture({
        taskId: 'local-mcp',
        providerIntakeState
      });
      await seedManifest(fixture.paths, {
        task_id: 'local-mcp',
        issue_id: 'issue-local-mcp',
        issue_identifier: 'ISSUE-LOCAL-MCP',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:45.000Z',
        summary: 'completed-claim control host selected run with explicit issue identity'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running).toEqual([]);
      expect(compatibilityProjection.codexTotals.seconds_running).toBe(0);
      expect(compatibilityProjection.selected?.issue_identifier).toBe('ISSUE-LOCAL-MCP');
    } finally {
      vi.useRealTimers();
    }
  });

  it('prunes terminal released completed provider rows from active dashboard issues', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T22:38:07.171Z'));
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:issue-co-181',
          issue_id: 'issue-co-181',
          issue_identifier: 'CO-181',
          issue_title: 'Completed provider refresh issue',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-04-14T16:02:35.110Z',
          task_id: 'linear-issue-co-181',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          accepted_at: '2026-04-14T15:00:00.000Z',
          updated_at: '2026-04-14T16:02:35.110Z',
          last_delivery_id: 'delivery-co-181',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_646_555_110,
          run_id: 'run-1',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-co-181',
          merge_closeout: {
            recorded_at: '2026-04-14T16:02:35.110Z',
            issue_id: 'issue-co-181',
            issue_identifier: 'CO-181',
            issue_state: 'Done',
            issue_state_type: 'completed',
            issue_updated_at: '2026-04-14T16:02:35.110Z',
            status: 'merged',
            reason: 'merged_and_transitioned_done',
            summary: 'Merged attached PR #479, reconciled shared root, and transitioned the Linear issue to Done.',
            attached_pr_urls: ['https://github.com/asabeko/CO/pull/479'],
            ignored_historical_pr_urls: [],
            conflicting_attached_pr_urls: [],
            pr: {
              url: 'https://github.com/asabeko/CO/pull/479',
              owner: 'asabeko',
              repo: 'CO',
              number: 479
            },
            snapshot: {
              state: 'MERGED',
              review_decision: 'APPROVED',
              merge_state_status: 'UNKNOWN',
              ready_to_merge: false,
              gate_reasons: [],
              action_required_reasons: [],
              unresolved_thread_count: 0,
              checks_pending: 0,
              checks_failed: 0,
              required_checks_pending: 0,
              required_checks_failed: 0,
              updated_at: '2026-04-14T16:02:16Z',
              merged_at: '2026-04-14T16:02:16Z',
              head_oid: 'abc123'
            },
            branch_recovery: null,
            merge_attempt: null,
            shared_root: {
              status: 'reconciled',
              reason: 'shared_root_reconciled',
              before_status: '## main...origin/main',
              after_status: '## main...origin/main'
            },
            linear_transition: {
              status: 'transitioned',
              attempted_at: '2026-04-14T16:02:35.110Z',
              previous_state: 'Merging',
              target_state: 'Done',
              issue_state: 'Done',
              issue_state_type: 'completed',
              issue_updated_at: '2026-04-14T16:02:35.110Z',
              error: null
            },
            github_rate_limit: null
          }
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-issue-co-181',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'issue-co-181',
            identifier: 'CO-181',
            title: 'Completed provider refresh issue',
            state: 'In Progress',
            state_type: 'started',
            updated_at: '2026-04-14T15:30:00.000Z'
          })
        }
      });
      await seedManifest(fixture.paths, {
        task_id: 'linear-issue-co-181',
        issue_provider: 'linear',
        issue_id: 'issue-co-181',
        issue_identifier: 'CO-181',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'succeeded',
        started_at: '2026-04-14T15:00:00.000Z',
        updated_at: '2026-04-14T16:02:35.110Z',
        completed_at: '2026-04-14T16:02:35.110Z',
        summary: 'Provider worker completed merge closeout.'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-14T22:38:07.171Z'
      });

      expect(compatibilityProjection.selected).toMatchObject({
        issue_identifier: 'CO-181',
        raw_status: 'succeeded',
        provider_debug_snapshot: {
          claim: {
            state: 'released',
            reason: 'provider_issue_released:not_active',
            issue_state: 'Done',
            issue_state_type: 'completed',
            issue_updated_at: '2026-04-14T16:02:35.110Z'
          },
          progress: {
            kind: 'merge_closeout',
            status: 'completed'
          }
        }
      });
      expect(compatibilityProjection.running).toEqual([]);
      expect(compatibilityProjection.retrying).toEqual([]);
      expect(compatibilityProjection.issues).toEqual([]);
      expect(uiDataset.counts.issues).toBe(0);
      expect(uiDataset.issues).toEqual([]);

      const doneClaim = providerIntakeState.claims[0]!;
      const activeAgainFixture = await createFixture({
        taskId: 'linear-issue-co-181-active-again',
        providerIntakeState: createProviderIntakeState([
          {
            ...doneClaim,
            task_id: 'linear-issue-co-181-active-again'
          }
        ]),
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'issue-co-181',
            identifier: 'CO-181',
            title: 'Reopened provider refresh issue',
            state: 'In Progress',
            state_type: 'started',
            updated_at: '2026-04-14T16:03:00.000Z'
          })
        }
      });
      await seedManifest(activeAgainFixture.paths, {
        task_id: 'linear-issue-co-181-active-again',
        issue_provider: 'linear',
        issue_id: 'issue-co-181',
        issue_identifier: 'CO-181',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'succeeded',
        started_at: '2026-04-14T15:00:00.000Z',
        updated_at: '2026-04-14T16:02:35.110Z',
        completed_at: '2026-04-14T16:02:35.110Z',
        summary: 'Provider worker completed merge closeout before a later active Linear update.'
      });

      const activeAgainProjection = await activeAgainFixture.runtime.snapshot().readCompatibilityProjection();
      const activeAgainUiDataset = buildUiDataset({
        projection: activeAgainProjection,
        generatedAt: '2026-04-14T22:38:07.171Z'
      });

      expect(activeAgainProjection.running).toEqual([]);
      expect(activeAgainProjection.retrying).toEqual([]);
      expect(activeAgainProjection.issues.map((issue) => issue.issueIdentifier)).toEqual(['CO-181']);
      expect(activeAgainUiDataset.counts.issues).toBe(1);
      expect(activeAgainUiDataset.issues.map((issue) => issue.issue_identifier)).toEqual(['CO-181']);

      const doneMergeCloseout = doneClaim.merge_closeout!;
      const canceledClaim: ProviderIntakeState['claims'][number] = {
        ...doneClaim,
        provider_key: 'linear:issue-co-canceled',
        issue_id: 'issue-co-canceled',
        issue_identifier: 'CO-CANCELED',
        issue_title: 'Canceled terminal provider row',
        issue_state: 'Duplicate',
        issue_state_type: 'canceled',
        task_id: 'linear-issue-co-canceled',
        merge_closeout: {
          ...doneMergeCloseout,
          issue_id: 'issue-co-canceled',
          issue_identifier: 'CO-CANCELED',
          issue_state: 'Duplicate',
          issue_state_type: 'canceled',
          linear_transition: doneMergeCloseout.linear_transition
            ? {
                ...doneMergeCloseout.linear_transition,
                previous_state: 'In Progress',
                target_state: 'Duplicate',
                issue_state: 'Duplicate',
                issue_state_type: 'canceled'
              }
            : null
        }
      };
      const canceledFixture = await createFixture({
        taskId: 'linear-issue-co-canceled',
        providerIntakeState: createProviderIntakeState([canceledClaim])
      });
      await seedManifest(canceledFixture.paths, {
        task_id: 'linear-issue-co-canceled',
        issue_provider: 'linear',
        issue_id: 'issue-co-canceled',
        issue_identifier: 'CO-CANCELED',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'succeeded',
        started_at: '2026-04-14T15:00:00.000Z',
        updated_at: '2026-04-14T16:02:35.110Z',
        completed_at: '2026-04-14T16:02:35.110Z',
        summary: 'Provider worker completed terminal closeout.'
      });

      const canceledProjection = await canceledFixture.runtime.snapshot().readCompatibilityProjection();
      const canceledUiDataset = buildUiDataset({
        projection: canceledProjection,
        generatedAt: '2026-04-14T22:38:07.171Z'
      });

      expect(canceledProjection.selected).toMatchObject({
        issue_identifier: 'CO-CANCELED',
        raw_status: 'succeeded',
        provider_debug_snapshot: {
          claim: {
            state: 'released',
            reason: 'provider_issue_released:not_active',
            issue_state: 'Duplicate',
            issue_state_type: 'canceled'
          },
          progress: {
            kind: 'workflow',
            status: 'completed'
          }
        }
      });
      expect(canceledProjection.running).toEqual([]);
      expect(canceledProjection.retrying).toEqual([]);
      expect(canceledProjection.issues).toEqual([]);
      expect(canceledUiDataset.counts.issues).toBe(0);
      expect(canceledUiDataset.issues).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('prunes terminal handoff-failed provider rows from active dashboard issues', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-26T07:34:37.478Z'));
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:issue-co-381',
          issue_id: 'issue-co-381',
          issue_identifier: 'CO-381',
          issue_title: 'Completed stale merge closeout',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-04-26T05:00:00.000Z',
          task_id: 'linear-issue-co-381',
          mapping_source: 'provider_id_fallback',
          state: 'handoff_failed',
          reason: 'provider_issue_handoff_failed',
          accepted_at: '2026-04-26T00:18:10.000Z',
          updated_at: '2026-04-26T07:34:09.880Z',
          last_delivery_id: null,
          last_event: 'poll_tick',
          last_action: 'reconcile',
          last_webhook_timestamp: null,
          run_id: 'run-381',
          run_manifest_path: null,
          retry_queued: null,
          retry_attempt: null,
          retry_due_at: null,
          retry_error: null,
          launch_source: 'control-host',
          launch_token: 'launch-381',
          merge_closeout: {
            recorded_at: '2026-04-26T03:09:45.820Z',
            issue_id: 'issue-co-381',
            issue_identifier: 'CO-381',
            issue_state: 'Merging',
            issue_state_type: 'started',
            issue_updated_at: '2026-04-26T02:59:13.159Z',
            attached_pr_urls: ['https://github.com/Kbediako/CO/pull/677'],
            ignored_historical_pr_urls: [],
            conflicting_attached_pr_urls: [],
            ignored_closed_unmerged_pr_urls: [],
            ignored_cross_issue_pr_urls: [],
            pr: {
              url: 'https://github.com/Kbediako/CO/pull/677',
              owner: 'Kbediako',
              repo: 'CO',
              number: 677
            },
            snapshot: {
              state: 'OPEN',
              review_decision: 'NONE',
              merge_state_status: 'CLEAN',
              ready_to_merge: false,
              gate_reasons: ['unacknowledged_bot_feedback=5'],
              action_required_reasons: ['unacknowledged_bot_feedback=5'],
              unresolved_thread_count: 0,
              checks_pending: 0,
              checks_failed: 0,
              required_checks_pending: 0,
              required_checks_failed: 0,
              updated_at: '2026-04-26T02:56:44Z',
              merged_at: null,
              head_oid: '4330b2a90508e64c750ac3ac77fc1ea65d638536',
              github_rate_limit: null
            },
            branch_recovery: null,
            merge_attempt: null,
            shared_root: null,
            linear_transition: null,
            github_rate_limit: null,
            status: 'action_required',
            reason: 'unacknowledged_bot_feedback=5',
            summary: 'Merge closeout is blocked by: unacknowledged_bot_feedback=5.'
          }
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-issue-co-381',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'issue-co-381',
            identifier: 'CO-381',
            title: 'Completed stale merge closeout',
            state: 'Done',
            state_type: 'completed',
            updated_at: '2026-04-26T05:00:00.000Z'
          })
        }
      });
      await seedManifest(fixture.paths, {
        task_id: 'linear-issue-co-381',
        issue_provider: 'linear',
        issue_id: 'issue-co-381',
        issue_identifier: 'CO-381',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-26T00:18:11.308Z',
        updated_at: '2026-04-26T02:04:41.878Z',
        completed_at: null,
        summary: 'Retained provider worker manifest still appears active after merge closeout failed.'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-26T07:34:37.478Z'
      });

      expect(compatibilityProjection.selected).toBeNull();
      expect(compatibilityProjection.running).toEqual([]);
      expect(compatibilityProjection.retrying).toEqual([]);
      expect(compatibilityProjection.issues).toEqual([]);
      expect(compatibilityProjection.providerIntake).toMatchObject({
        active_claim_count: 0,
        running_claim_count: 0,
        active_issue_identifiers: [],
        running_issue_identifiers: []
      });
      expect(uiDataset.counts.running).toBe(0);
      expect(uiDataset.counts.issues).toBe(0);
      expect(uiDataset.selected_issue_identifier).toBeNull();
      expect(uiDataset.selected).toBeNull();
      expect(uiDataset.running).toEqual([]);
      expect(uiDataset.issues).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('prunes merge-closeout action-required handoff-failed provider rows from active dashboard issues', async () => {
    const providerIntakeState = createProviderIntakeState([
      {
        provider: 'linear',
        provider_key: 'linear:issue-co-381',
        issue_id: 'issue-co-381',
        issue_identifier: 'CO-381',
        issue_title: 'Merging stale closeout',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-26T03:00:00.000Z',
        task_id: 'linear-issue-co-381',
        mapping_source: 'provider_id_fallback',
        state: 'handoff_failed',
        reason: 'provider_issue_merge_closeout_action_required',
        accepted_at: '2026-04-26T00:18:10.000Z',
        updated_at: '2026-04-26T07:34:09.880Z',
        last_delivery_id: null,
        last_event: 'poll_tick',
        last_action: 'reconcile',
        last_webhook_timestamp: null,
        run_id: 'run-381',
        run_manifest_path: null,
        retry_queued: null,
        retry_attempt: null,
        retry_due_at: null,
        retry_error: null,
        launch_source: 'control-host',
        launch_token: 'launch-381',
        merge_closeout: null
      }
    ]);
    const fixture = await createFixture({
      taskId: 'linear-issue-co-381',
      providerIntakeState,
      linearAdvisoryState: {
        tracked_issue: createTrackedIssue({
          id: 'issue-co-381',
          identifier: 'CO-381',
          title: 'Merging stale closeout',
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-04-26T03:00:00.000Z'
        })
      }
    });
    await seedManifest(fixture.paths, {
      task_id: 'linear-issue-co-381',
      issue_provider: 'linear',
      issue_id: 'issue-co-381',
      issue_identifier: 'CO-381',
      pipeline_id: 'provider-linear-worker',
      pipeline_title: 'Provider Linear Worker',
      status: 'in_progress',
      started_at: '2026-04-26T00:18:11.308Z',
      updated_at: '2026-04-26T02:04:41.878Z',
      completed_at: null,
      summary: 'Retained provider worker manifest still appears active after merge closeout requires action.'
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const uiDataset = buildUiDataset({
      projection: compatibilityProjection,
      generatedAt: '2026-04-26T07:34:37.478Z'
    });

    expect(compatibilityProjection.selected).toBeNull();
    expect(compatibilityProjection.running).toEqual([]);
    expect(compatibilityProjection.issues).toEqual([]);
    expect(compatibilityProjection.providerIntake).toMatchObject({
      active_claim_count: 0,
      active_issue_identifiers: []
    });
    expect(uiDataset.selected_issue_identifier).toBeNull();
    expect(uiDataset.running).toEqual([]);
    expect(uiDataset.issues).toEqual([]);
  });

  it('prunes stale in-progress provider rows when terminal released claim has no live worker', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T15:13:39.658Z'));
    const stalePid = 424241;
    vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      if (pid === stalePid && signal === 0) {
        const error = new Error('process not found') as NodeJS.ErrnoException;
        error.code = 'ESRCH';
        throw error;
      }
      return true;
    });
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:df69fabe-63c2-4b98-a226-9c37892b4f9d',
          issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
          issue_identifier: 'CO-183',
          issue_title: 'Expand Codex CLI 0.120 adoption and make spark file-search only',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-04-15T14:51:57.000Z',
          task_id: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          accepted_at: '2026-04-15T12:00:00.000Z',
          updated_at: '2026-04-15T14:51:57.000Z',
          last_delivery_id: 'delivery-co-183',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_726_317_000,
          run_id: 'run-1',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-co-183',
          merge_closeout: {
            recorded_at: '2026-04-15T14:51:57.000Z',
            issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
            issue_identifier: 'CO-183',
            issue_state: 'Done',
            issue_state_type: 'completed',
            issue_updated_at: '2026-04-15T14:51:57.000Z',
            status: 'merged',
            reason: 'merged_and_transitioned_done',
            summary: 'Merged attached PR #481 and transitioned the Linear issue to Done.',
            attached_pr_urls: ['https://github.com/asabeko/CO/pull/481'],
            ignored_historical_pr_urls: [],
            conflicting_attached_pr_urls: [],
            pr: {
              url: 'https://github.com/asabeko/CO/pull/481',
              owner: 'asabeko',
              repo: 'CO',
              number: 481
            },
            snapshot: {
              state: 'MERGED',
              review_decision: 'APPROVED',
              merge_state_status: 'UNKNOWN',
              ready_to_merge: false,
              gate_reasons: [],
              action_required_reasons: [],
              unresolved_thread_count: 0,
              checks_pending: 0,
              checks_failed: 0,
              required_checks_pending: 0,
              required_checks_failed: 0,
              updated_at: '2026-04-15T14:51:57Z',
              merged_at: '2026-04-15T14:51:57Z',
              head_oid: 'def456'
            },
            branch_recovery: null,
            merge_attempt: null,
            shared_root: {
              status: 'reconciled',
              reason: 'shared_root_reconciled',
              before_status: '## main...origin/main',
              after_status: '## main...origin/main'
            },
            linear_transition: {
              status: 'transitioned',
              attempted_at: '2026-04-15T14:51:57.000Z',
              previous_state: 'Merging',
              target_state: 'Done',
              issue_state: 'Done',
              issue_state_type: 'completed',
              issue_updated_at: '2026-04-15T14:51:57.000Z',
              error: null
            },
            github_rate_limit: null
          }
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
            identifier: 'CO-183',
            title: 'Expand Codex CLI 0.120 adoption and make spark file-search only',
            state: 'Done',
            state_type: 'completed',
            updated_at: '2026-04-15T14:51:57.000Z'
          })
        }
      });
      await seedManifest(fixture.paths, {
        task_id: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d',
        issue_provider: 'linear',
        issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
        issue_identifier: 'CO-183',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T12:00:00.000Z',
        updated_at: '2026-04-15T14:52:00.000Z',
        completed_at: null,
        summary: 'Stale manifest still says the provider worker is running.'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
        issue_identifier: 'CO-183',
        pid: String(stalePid),
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-15T14:40:00.000Z',
        last_event: 'turn_running',
        last_message: 'Worker turn still appears to be running from stale proof.',
        last_event_at: '2026-04-15T14:52:00.000Z',
        current_turn_activity: {
          event: 'turn_running',
          message_or_payload: 'Worker turn still appears to be running from stale proof.',
          recorded_at: '2026-04-15T14:52:00.000Z',
          source: 'session_log_hydration',
          turn_id: 'turn-1',
          session_id: 'thread-1-turn-1'
        },
        rate_limits: {},
        updated_at: '2026-04-15T14:52:00.000Z'
      });

      const selectedSnapshot = await fixture.runtime.snapshot().readSelectedRunSnapshot();
      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-15T15:13:39.658Z'
      });

      expect(selectedSnapshot.selected).toMatchObject({
        issueIdentifier: 'CO-183',
        rawStatus: 'in_progress',
        providerDebugSnapshot: {
          claim: {
            state: 'released',
            reason: 'provider_issue_released:not_active',
            issue_state: 'Done',
            issue_state_type: 'completed'
          }
        }
      });
      expect(selectedSnapshot.selected?.providerDebugSnapshot?.worker).toBeNull();
      expect(compatibilityProjection.selected).toBeNull();
      expect(compatibilityProjection.running).toEqual([]);
      expect(compatibilityProjection.retrying).toEqual([]);
      expect(compatibilityProjection.issues).toEqual([]);
      expect(uiDataset.counts.running).toBe(0);
      expect(uiDataset.counts.issues).toBe(0);
      expect(uiDataset.selected_issue_identifier).toBeNull();
      expect(uiDataset.selected).toBeNull();
      expect(uiDataset.running).toEqual([]);
      expect(uiDataset.issues).toEqual([]);

      const mixedLiveFixture = await createFixture({
        taskId: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-mixed-live',
        providerIntakeState: createProviderIntakeState([
          {
            ...providerIntakeState.claims[0]!,
            task_id: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-mixed-live',
            run_id: 'run-1',
            run_manifest_path: null
          },
          {
            ...providerIntakeState.claims[0]!,
            issue_state: 'In Progress',
            issue_state_type: 'started',
            issue_updated_at: '2026-04-15T15:12:00.000Z',
            task_id: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-mixed-live',
            state: 'running',
            reason: 'provider_issue_running',
            updated_at: '2026-04-15T15:12:00.000Z',
            run_id: 'run-2',
            run_manifest_path: null,
            last_delivery_id: 'delivery-co-183-live',
            launch_token: 'launch-co-183-live',
            merge_closeout: null
          }
        ]),
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
            identifier: 'CO-183',
            title: 'Expand Codex CLI 0.120 adoption and make spark file-search only',
            state: 'Done',
            state_type: 'completed',
            updated_at: '2026-04-15T14:51:57.000Z'
          })
        }
      });
      await seedManifest(mixedLiveFixture.paths, {
        task_id: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-mixed-live',
        issue_provider: 'linear',
        issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
        issue_identifier: 'CO-183',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T12:00:00.000Z',
        updated_at: '2026-04-15T14:52:00.000Z',
        completed_at: null,
        summary: 'Selected stale manifest is superseded by a live sibling.'
      });
      await seedProviderLinearWorkerProof(mixedLiveFixture.paths, {
        issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
        issue_identifier: 'CO-183',
        pid: '85191',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_running',
        last_message: 'Stale selected proof remains retained for audit.',
        last_event_at: '2026-04-15T14:52:00.000Z',
        rate_limits: {},
        updated_at: '2026-04-15T14:52:00.000Z'
      });
      const liveSibling = await createSiblingRun(
        mixedLiveFixture.root,
        'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-mixed-live',
        'run-2',
        {
          manifest: {
            task_id: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-mixed-live',
            issue_provider: 'linear',
            issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
            issue_identifier: 'CO-183',
            pipeline_id: 'provider-linear-worker',
            pipeline_title: 'Provider Linear Worker',
            status: 'in_progress',
            started_at: '2026-04-15T15:00:00.000Z',
            updated_at: '2026-04-15T15:12:00.000Z',
            completed_at: null,
            summary: 'Live sibling is the preferred same-issue source.'
          }
        }
      );
      await seedProviderLinearWorkerProof(liveSibling, {
        issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
        issue_identifier: 'CO-183',
        pid: '85192',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_running',
        last_message: 'Live sibling proof is current.',
        last_event_at: '2026-04-15T15:12:00.000Z',
        rate_limits: {},
        updated_at: '2026-04-15T15:12:00.000Z'
      });
      const mixedLiveProjection = await mixedLiveFixture.runtime
        .snapshot()
        .readCompatibilityProjection();
      expect(mixedLiveProjection.selected).toMatchObject({
        issue_identifier: 'CO-183',
        run_id: 'run-2',
        raw_status: 'in_progress'
      });
      expect(mixedLiveProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'CO-183'
      ]);
      expect(mixedLiveProjection.issues.map((issue) => issue.issueIdentifier)).toEqual(['CO-183']);

      const activeClaimFixture = await createFixture({
        taskId: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-active-claim',
        providerIntakeState: createProviderIntakeState([
          {
            ...providerIntakeState.claims[0]!,
            issue_state: 'In Progress',
            issue_state_type: 'started',
            issue_updated_at: '2026-04-15T15:13:00.000Z',
            task_id: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-active-claim',
            updated_at: '2026-04-15T15:13:00.000Z',
            run_id: 'run-1',
            run_manifest_path: null
          }
        ]),
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
            identifier: 'CO-183',
            title: 'Expand Codex CLI 0.120 adoption and make spark file-search only',
            state: 'Done',
            state_type: 'completed',
            updated_at: '2026-04-15T14:51:57.000Z'
          })
        }
      });
      await seedManifest(activeClaimFixture.paths, {
        task_id: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-active-claim',
        issue_provider: 'linear',
        issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
        issue_identifier: 'CO-183',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T15:00:00.000Z',
        updated_at: '2026-04-15T15:12:00.000Z',
        completed_at: null,
        summary: 'Provider claim has newer active issue truth than stale terminal tracked state.'
      });
      const activeClaimProjection = await activeClaimFixture.runtime
        .snapshot()
        .readCompatibilityProjection();
      expect(activeClaimProjection.selected).toMatchObject({
        issue_identifier: 'CO-183',
        raw_status: 'in_progress'
      });
      expect(activeClaimProjection.issues.map((issue) => issue.issueIdentifier)).toEqual(['CO-183']);

      const noCloseoutClaim: ProviderIntakeState['claims'][number] = {
        ...providerIntakeState.claims[0]!,
        task_id: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-race',
        run_id: 'run-1',
        merge_closeout: null
      };
      const noCloseoutFixture = await createFixture({
        taskId: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-race',
        providerIntakeState: createProviderIntakeState([noCloseoutClaim]),
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
            identifier: 'CO-183',
            title: 'Expand Codex CLI 0.120 adoption and make spark file-search only',
            state: 'Done',
            state_type: 'completed',
            updated_at: '2026-04-15T14:51:57.000Z'
          })
        }
      });
      await seedManifest(noCloseoutFixture.paths, {
        task_id: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-race',
        issue_provider: 'linear',
        issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
        issue_identifier: 'CO-183',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T12:00:00.000Z',
        updated_at: '2026-04-15T14:52:00.000Z',
        completed_at: null,
        summary: 'Closeout race manifest still says the provider worker is running.'
      });
      await seedProviderLinearWorkerProof(noCloseoutFixture.paths, {
        issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
        issue_identifier: 'CO-183',
        pid: '85191',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-15T14:40:00.000Z',
        last_event: 'turn_running',
        last_message: 'Worker proof remains visible until closeout evidence lands.',
        last_event_at: '2026-04-15T14:52:00.000Z',
        rate_limits: {},
        updated_at: '2026-04-15T14:52:00.000Z'
      });

      const noCloseoutProjection = await noCloseoutFixture.runtime.snapshot().readCompatibilityProjection();
      const noCloseoutUiDataset = buildUiDataset({
        projection: noCloseoutProjection,
        generatedAt: '2026-04-15T15:13:39.658Z'
      });

      expect(noCloseoutProjection.selected).toMatchObject({
        issue_identifier: 'CO-183',
        raw_status: 'in_progress'
      });
      expect(noCloseoutProjection.running).toEqual([]);
      expect(noCloseoutProjection.issues.map((issue) => issue.issueIdentifier)).toEqual(['CO-183']);
      expect(noCloseoutUiDataset.counts.running).toBe(0);
      expect(noCloseoutUiDataset.counts.issues).toBe(1);
      expect(noCloseoutUiDataset.selected_issue_identifier).toBe('CO-183');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps selected in-progress provider runs visible when same-issue run ids collide across task lanes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T15:13:39.658Z'));
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:df69fabe-63c2-4b98-a226-9c37892b4f9d',
          issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
          issue_identifier: 'CO-183',
          issue_title: 'Expand Codex CLI 0.120 adoption and make spark file-search only',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-04-15T14:51:57.000Z',
          task_id: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-old',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          accepted_at: '2026-04-15T12:00:00.000Z',
          updated_at: '2026-04-15T14:51:57.000Z',
          last_delivery_id: 'delivery-co-183',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_726_317_000,
          run_id: 'run-1',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-co-183'
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-live',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
            identifier: 'CO-183',
            title: 'Expand Codex CLI 0.120 adoption and make spark file-search only',
            state: 'Done',
            state_type: 'completed',
            updated_at: '2026-04-15T14:51:57.000Z'
          })
        }
      });
      await seedManifest(fixture.paths, {
        task_id: 'linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-live',
        issue_provider: 'linear',
        issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
        issue_identifier: 'CO-183',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T15:00:00.000Z',
        updated_at: '2026-04-15T15:12:00.000Z',
        summary: 'A newer selected provider run is still live.'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'df69fabe-63c2-4b98-a226-9c37892b4f9d',
        issue_identifier: 'CO-183',
        pid: '85192',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        current_turn_started_at: '2026-04-15T15:00:00.000Z',
        last_event: 'turn_running',
        last_message: 'A newer selected provider run is still live.',
        last_event_at: '2026-04-15T15:12:00.000Z',
        rate_limits: {},
        updated_at: '2026-04-15T15:12:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-15T15:13:39.658Z'
      });

      expect(compatibilityProjection.selected).toMatchObject({
        issue_identifier: 'CO-183',
        raw_status: 'in_progress'
      });
      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'CO-183'
      ]);
      expect(compatibilityProjection.codexTotals.seconds_running).toBeGreaterThan(0);
      expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toEqual(['CO-183']);
      expect(uiDataset.counts.running).toBe(1);
      expect(uiDataset.counts.issues).toBe(1);
      expect(uiDataset.selected_issue_identifier).toBe('CO-183');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not count a selected stale terminal provider claim as a running CO STATUS row', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T16:39:00.000Z'));
    const stalePid = 424242;
    vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      if (pid === stalePid && signal === 0) {
        const error = new Error('process not found') as NodeJS.ErrnoException;
        error.code = 'ESRCH';
        throw error;
      }
      return true;
    });
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-194',
          issue_id: 'lin-issue-194',
          issue_identifier: 'CO-194',
          issue_title: 'Terminal stale merging claim',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-15T16:38:07.274Z',
          task_id: 'linear-72286a49-e68b-435a-be72-74d5c28feb09',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
          accepted_at: '2026-04-15T16:00:01.000Z',
          updated_at: '2026-04-15T16:38:07.274Z',
          last_delivery_id: 'delivery-co-194',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_754_287_274,
          run_id: 'run-1',
          run_manifest_path: null,
          launch_source: null,
          launch_token: null
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-72286a49-e68b-435a-be72-74d5c28feb09',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-194',
            identifier: 'CO-194',
            title: 'Terminal stale merging claim',
            state: 'Done',
            state_type: 'completed',
            updated_at: '2026-04-15T16:38:07.274Z'
          })
        }
      });
      providerIntakeState.claims[0]!.run_manifest_path = fixture.paths.manifestPath;
      await seedManifest(fixture.paths, {
        task_id: 'linear-72286a49-e68b-435a-be72-74d5c28feb09',
        issue_provider: 'linear',
        issue_id: 'lin-issue-194',
        issue_identifier: 'CO-194',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T16:00:00.000Z',
        updated_at: '2026-04-15T16:04:00.000Z',
        summary: 'Stale worker still reports in progress.'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'lin-issue-194',
        issue_identifier: 'CO-194',
        pid: stalePid,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_running',
        last_message: 'stale worker still reports running',
        updated_at: '2026-04-15T16:04:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-15T16:39:00.000Z'
      });

      expect(compatibilityProjection.selected).toMatchObject({
        issue_identifier: 'CO-194',
        raw_status: 'in_progress',
        provider_debug_snapshot: {
          claim: {
            state: 'released',
            reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
            issue_state: 'Merging',
            issue_state_type: 'started'
          }
        }
      });
      expect(compatibilityProjection.selected?.provider_debug_snapshot?.worker).toBeNull();
      expect(compatibilityProjection.running).toEqual([]);
      expect(uiDataset.counts.running).toBe(0);
      expect(uiDataset.running).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a selected provider claim running when dead-pid proof is stale for the current run stage', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T16:39:00.000Z'));
    const stalePid = 424244;
    vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      if (pid === stalePid && signal === 0) {
        const error = new Error('process not found') as NodeJS.ErrnoException;
        error.code = 'ESRCH';
        throw error;
      }
      return true;
    });
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-194',
          issue_id: 'lin-issue-194',
          issue_identifier: 'CO-194',
          issue_title: 'Terminal stale merging claim',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-15T16:38:07.274Z',
          task_id: 'linear-72286a49-e68b-435a-be72-74d5c28feb09',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
          accepted_at: '2026-04-15T16:00:01.000Z',
          updated_at: '2026-04-15T16:38:07.274Z',
          last_delivery_id: 'delivery-co-194',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_754_287_274,
          run_id: 'run-1',
          run_manifest_path: null,
          launch_source: null,
          launch_token: null
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-72286a49-e68b-435a-be72-74d5c28feb09',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-194',
            identifier: 'CO-194',
            title: 'Terminal stale merging claim',
            state: 'Done',
            state_type: 'completed',
            updated_at: '2026-04-15T16:38:07.274Z'
          })
        }
      });
      providerIntakeState.claims[0]!.run_manifest_path = fixture.paths.manifestPath;
      await seedManifest(fixture.paths, {
        task_id: 'linear-72286a49-e68b-435a-be72-74d5c28feb09',
        issue_provider: 'linear',
        issue_id: 'lin-issue-194',
        issue_identifier: 'CO-194',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T16:10:00.000Z',
        updated_at: '2026-04-15T16:15:00.000Z',
        summary: 'Restarted worker still in progress.'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'lin-issue-194',
        issue_identifier: 'CO-194',
        pid: stalePid,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        attempt_started_at: '2026-04-15T16:00:00.000Z',
        last_event: 'turn_running',
        last_message: 'old proof from previous attempt',
        updated_at: '2026-04-15T16:04:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-15T16:39:00.000Z'
      });

      expect(compatibilityProjection.running).toHaveLength(1);
      expect(compatibilityProjection.running[0]).toMatchObject({
        issue_identifier: 'CO-194'
      });
      expect(uiDataset.counts.running).toBe(1);
      expect(uiDataset.running[0]).toMatchObject({
        issue_identifier: 'CO-194'
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a selected provider claim running when terminal tracked truth is older than the claim', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T16:39:00.000Z'));
    const stalePid = 424243;
    vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      if (pid === stalePid && signal === 0) {
        const error = new Error('process not found') as NodeJS.ErrnoException;
        error.code = 'ESRCH';
        throw error;
      }
      return true;
    });
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-194',
          issue_id: 'lin-issue-194',
          issue_identifier: 'CO-194',
          issue_title: 'Terminal stale merging claim',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-15T16:38:07.274Z',
          task_id: 'linear-72286a49-e68b-435a-be72-74d5c28feb09',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
          accepted_at: '2026-04-15T16:00:01.000Z',
          updated_at: '2026-04-15T16:38:07.274Z',
          last_delivery_id: 'delivery-co-194',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_754_287_274,
          run_id: 'run-1',
          run_manifest_path: null,
          launch_source: null,
          launch_token: null
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-72286a49-e68b-435a-be72-74d5c28feb09',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-194',
            identifier: 'CO-194',
            title: 'Terminal stale merging claim',
            state: 'Done',
            state_type: 'completed',
            updated_at: '2026-04-15T16:37:59.000Z'
          })
        }
      });
      providerIntakeState.claims[0]!.run_manifest_path = fixture.paths.manifestPath;
      await seedManifest(fixture.paths, {
        task_id: 'linear-72286a49-e68b-435a-be72-74d5c28feb09',
        issue_provider: 'linear',
        issue_id: 'lin-issue-194',
        issue_identifier: 'CO-194',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T16:00:00.000Z',
        updated_at: '2026-04-15T16:04:00.000Z',
        summary: 'Stale worker still reports in progress.'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'lin-issue-194',
        issue_identifier: 'CO-194',
        pid: stalePid,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_running',
        last_message: 'stale worker still reports running',
        updated_at: '2026-04-15T16:04:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-15T16:39:00.000Z'
      });

      expect(compatibilityProjection.running).toHaveLength(1);
      expect(compatibilityProjection.running[0]).toMatchObject({
        issue_identifier: 'CO-194'
      });
      expect(uiDataset.counts.running).toBe(1);
      expect(uiDataset.running[0]).toMatchObject({
        issue_identifier: 'CO-194'
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a selected provider claim running when the retained claim lacks issue freshness', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T16:39:00.000Z'));
    const stalePid = 424245;
    vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      if (pid === stalePid && signal === 0) {
        const error = new Error('process not found') as NodeJS.ErrnoException;
        error.code = 'ESRCH';
        throw error;
      }
      return true;
    });
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-194',
          issue_id: 'lin-issue-194',
          issue_identifier: 'CO-194',
          issue_title: 'Terminal stale merging claim',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: null,
          task_id: 'linear-72286a49-e68b-435a-be72-74d5c28feb09',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
          accepted_at: '2026-04-15T16:00:01.000Z',
          updated_at: '2026-04-15T16:38:07.274Z',
          last_delivery_id: 'delivery-co-194',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_754_287_274,
          run_id: 'run-1',
          run_manifest_path: null,
          launch_source: null,
          launch_token: null
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-72286a49-e68b-435a-be72-74d5c28feb09',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-194',
            identifier: 'CO-194',
            title: 'Terminal stale merging claim',
            state: 'Done',
            state_type: 'completed',
            updated_at: '2026-04-15T16:38:07.274Z'
          })
        }
      });
      providerIntakeState.claims[0]!.run_manifest_path = fixture.paths.manifestPath;
      await seedManifest(fixture.paths, {
        task_id: 'linear-72286a49-e68b-435a-be72-74d5c28feb09',
        issue_provider: 'linear',
        issue_id: 'lin-issue-194',
        issue_identifier: 'CO-194',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T16:00:00.000Z',
        updated_at: '2026-04-15T16:04:00.000Z',
        summary: 'Stale worker still reports in progress.'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'lin-issue-194',
        issue_identifier: 'CO-194',
        pid: stalePid,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_running',
        last_message: 'stale worker still reports running',
        updated_at: '2026-04-15T16:04:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-15T16:39:00.000Z'
      });

      expect(compatibilityProjection.running).toHaveLength(1);
      expect(compatibilityProjection.running[0]).toMatchObject({
        issue_identifier: 'CO-194'
      });
      expect(uiDataset.counts.running).toBe(1);
      expect(uiDataset.running[0]).toMatchObject({
        issue_identifier: 'CO-194'
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores unrelated retained local-mcp claims when evaluating the selected run', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const providerIntakeState = createProviderIntakeState();
      const fixture = await createFixture({
        taskId: 'local-mcp',
        providerIntakeState
      });
      providerIntakeState.claims.push({
        provider: 'linear',
        provider_key: 'linear:issue-other',
        issue_id: 'issue-other',
        issue_identifier: 'ISSUE-OTHER',
        issue_title: 'Completed unrelated local-mcp claim',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-03-07T00:29:30.000Z',
        task_id: 'local-mcp',
        mapping_source: 'provider_id_fallback',
        state: 'completed',
        reason: 'provider_issue_released:not_active',
        accepted_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:30.000Z',
        last_delivery_id: 'delivery-local-mcp-other',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_170_000,
        run_id: 'run-1',
        run_manifest_path: fixture.paths.manifestPath,
        launch_source: 'control-host',
        launch_token: 'launch-local-mcp-other'
      });
      providerIntakeState.latest_provider_key = 'linear:issue-other';
      providerIntakeState.latest_reason = 'provider_issue_released:not_active';
      await seedManifest(fixture.paths, {
        task_id: 'local-mcp',
        issue_id: 'issue-local-mcp',
        issue_identifier: 'ISSUE-LOCAL-MCP',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:45.000Z',
        summary: 'selected local-mcp run with unrelated retained claim'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-LOCAL-MCP'
      ]);
      expect(compatibilityProjection.codexTotals.seconds_running).toBeGreaterThan(0);
      expect(compatibilityProjection.selected?.issue_identifier).toBe('ISSUE-LOCAL-MCP');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps released pending-reopen started provider workers visible while intake rehydrates', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T01:27:12.200Z'));
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-185',
          issue_id: 'lin-issue-185',
          issue_identifier: 'CO-185',
          issue_title: 'Provider helper constraints',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-15T01:18:56.003Z',
          task_id: 'linear-9a54c7d8-518f-4452-95aa-c5852008b38d',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
          accepted_at: '2026-04-15T01:09:24.461Z',
          updated_at: '2026-04-15T01:26:48.590Z',
          last_delivery_id: 'delivery-co-185',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_685_936_003,
          run_id: 'run-1',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-co-185'
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-9a54c7d8-518f-4452-95aa-c5852008b38d',
        providerIntakeState
      });
      await seedManifest(fixture.paths, {
        task_id: 'linear-9a54c7d8-518f-4452-95aa-c5852008b38d',
        issue_provider: 'linear',
        issue_id: 'lin-issue-185',
        issue_identifier: 'CO-185',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T01:09:24.461Z',
        updated_at: '2026-04-15T01:26:45.204Z',
        summary: 'waiting on child lane'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'CO-185'
      ]);
      expect(compatibilityProjection.running[0]).toMatchObject({
        issue_id: 'lin-issue-185',
        state: 'In Progress'
      });
      expect(compatibilityProjection.codexTotals.seconds_running).toBeGreaterThan(0);
      expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toContain('CO-185');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps ordinary released not-active started provider workers visible while intake rehydrates', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T23:00:00.000Z'));
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-195',
          issue_id: 'lin-issue-195',
          issue_identifier: 'CO-195',
          issue_title: 'Ordinary released live worker',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-15T22:55:00.000Z',
          task_id: 'linear-ordinary-released-live-worker',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          accepted_at: '2026-04-15T22:45:00.000Z',
          updated_at: '2026-04-15T22:56:00.000Z',
          last_delivery_id: 'delivery-co-195',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_764_500_000,
          run_id: 'run-ordinary-live',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-co-195'
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-ordinary-released-live-worker',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-195',
            identifier: 'CO-195',
            title: 'Ordinary released live worker',
            state: 'In Progress',
            state_type: 'started',
            updated_at: '2026-04-15T22:59:00.000Z'
          })
        }
      });
      await seedManifest(fixture.paths, {
        task_id: 'linear-ordinary-released-live-worker',
        issue_provider: 'linear',
        issue_id: 'lin-issue-195',
        issue_identifier: 'CO-195',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T22:45:00.000Z',
        updated_at: '2026-04-15T22:59:00.000Z',
        summary: 'ordinary released worker still running'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-15T23:00:00.000Z'
      });

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'CO-195'
      ]);
      expect(compatibilityProjection.issues.map((issue) => issue.issueIdentifier)).toContain('CO-195');
      expect(uiDataset.counts.running).toBe(1);
      expect(uiDataset.running.map((entry) => entry.issue_identifier)).toEqual(['CO-195']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not count ordinary released not-active workers from cached started metadata alone', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T23:00:00.000Z'));
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-195',
          issue_id: 'lin-issue-195',
          issue_identifier: 'CO-195',
          issue_title: 'Ordinary released cached-only worker',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-15T22:55:00.000Z',
          task_id: 'linear-ordinary-released-cached-only-worker',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          accepted_at: '2026-04-15T22:45:00.000Z',
          updated_at: '2026-04-15T22:56:00.000Z',
          last_delivery_id: 'delivery-co-195',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_764_500_000,
          run_id: 'run-ordinary-cached-only',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-co-195'
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-ordinary-released-cached-only-worker',
        providerIntakeState
      });
      await seedManifest(fixture.paths, {
        task_id: 'linear-ordinary-released-cached-only-worker',
        issue_provider: 'linear',
        issue_id: 'lin-issue-195',
        issue_identifier: 'CO-195',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T22:45:00.000Z',
        updated_at: '2026-04-15T22:59:00.000Z',
        summary: 'ordinary released cached-only worker'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-15T23:00:00.000Z'
      });

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([]);
      expect(uiDataset.counts.running).toBe(0);
      expect(uiDataset.running.map((entry) => entry.issue_identifier)).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps ordinary released not-active workers visible when fresh tracked state supersedes stale cached metadata', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T23:00:00.000Z'));
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-198',
          issue_id: 'lin-issue-198',
          issue_identifier: 'CO-198',
          issue_title: 'Ordinary released live worker with stale cache',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-04-15T22:30:00.000Z',
          task_id: 'linear-ordinary-released-live-worker-stale-cache',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          accepted_at: '2026-04-15T22:45:00.000Z',
          updated_at: '2026-04-15T22:56:00.000Z',
          last_delivery_id: 'delivery-co-198',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_764_500_000,
          run_id: 'run-ordinary-live-stale-cache',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-co-198'
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-ordinary-released-live-worker-stale-cache',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-198',
            identifier: 'CO-198',
            title: 'Ordinary released live worker with stale cache',
            state: 'In Progress',
            state_type: 'started',
            updated_at: '2026-04-15T22:59:00.000Z'
          })
        }
      });
      await seedManifest(fixture.paths, {
        task_id: 'linear-ordinary-released-live-worker-stale-cache',
        issue_provider: 'linear',
        issue_id: 'lin-issue-198',
        issue_identifier: 'CO-198',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T22:45:00.000Z',
        updated_at: '2026-04-15T22:59:00.000Z',
        summary: 'ordinary released worker still running with fresh tracked truth'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-15T23:00:00.000Z'
      });
      const statePayload = await readCompatibilityState({
        controlStore: fixture.controlStore,
        paths: fixture.paths,
        readCompatibilityProjection: async () => compatibilityProjection
      });

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'CO-198'
      ]);
      expect(statePayload.running_ids).toEqual(['CO-198']);
      expect(statePayload.retrying_ids).toEqual([]);
      const issue = compatibilityProjection.issues.find((entry) => entry.issueIdentifier === 'CO-198');
      expect(issue?.payload.provider_debug_snapshot?.claim).toMatchObject({
        state: 'released',
        reason: 'provider_issue_released:not_active',
        issue_state: 'Done',
        issue_state_type: 'completed'
      });
      expect(issue?.payload.provider_debug_snapshot?.live_linear_state).toMatchObject({
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-04-15T22:59:00.000Z'
      });
      expect(uiDataset.counts.running).toBe(1);
      expect(uiDataset.running).toEqual([
        expect.objectContaining({
          issue_identifier: 'CO-198',
          issue_id: 'lin-issue-198',
          id: 'CO-198',
          bucket: 'running',
          state: 'In Progress',
          reason: null,
          aliases: expect.arrayContaining(['CO-198', 'lin-issue-198'])
        })
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('surfaces live Ready truth when stale released not-active Blocked cache retains only completed blockers', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T04:00:00.000Z'));
    try {
      const completedBlocker = {
        id: 'lin-blocker-207',
        identifier: 'CO-207',
        state: 'Done',
        state_type: 'completed'
      };
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-196',
          issue_id: 'lin-issue-196',
          issue_identifier: 'CO-196',
          issue_title: 'Add Codex plugin marketplace distribution path',
          issue_state: 'Blocked',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-16T22:48:01.000Z',
          issue_blocked_by: [completedBlocker],
          task_id: 'linear-lin-issue-196',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          accepted_at: '2026-04-16T22:48:05.000Z',
          updated_at: '2026-04-16T22:48:10.000Z',
          last_delivery_id: 'delivery-co-196',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_828_881_000,
          run_id: 'run-co-196-manual-start',
          run_manifest_path: '/tmp/provider-run/run-co-196-manual-start/manifest.json',
          launch_source: 'control-host',
          launch_token: 'launch-co-196'
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-lin-issue-196',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-196',
            identifier: 'CO-196',
            title: 'Add Codex plugin marketplace distribution path',
            state: 'Ready',
            state_type: 'unstarted',
            updated_at: '2026-04-17T03:33:27.936Z',
            blocked_by: [completedBlocker]
          })
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-17T04:00:00.000Z'
      });

      expect(compatibilityProjection.issues).toHaveLength(1);
      const issue = compatibilityProjection.issues[0];
      expect(issue?.payload.provider_debug_snapshot?.claim).toMatchObject({
        state: 'released',
        reason: 'provider_issue_released:not_active',
        issue_state: 'Blocked',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-16T22:48:01.000Z'
      });
      expect(issue?.payload.provider_debug_snapshot?.live_linear_state).toMatchObject({
        state: 'Ready',
        state_type: 'unstarted',
        updated_at: '2026-04-17T03:33:27.936Z'
      });
      expect(uiDataset.counts.issues).toBe(1);
      expect(uiDataset.issues).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails closed on top-level tracked fallback when persisted advisory truth conflicts with explicit selected identity', async () => {
    const providerIntakeState = createProviderIntakeState([
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-196',
        issue_id: 'lin-issue-196',
        issue_identifier: 'CO-196',
        issue_title: 'Current tracked issue',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-17T04:00:00.000Z',
        task_id: 'linear-co-196-stale-advisory-fallback',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-04-17T03:58:00.000Z',
        updated_at: '2026-04-17T03:59:00.000Z',
        run_id: 'provider-run-196',
        run_manifest_path: null,
        launch_source: 'control-host',
        launch_token: 'launch-co-196'
      }
    ]);
    const fixture = await createFixture({
      taskId: 'linear-co-196-stale-advisory-fallback',
      providerIntakeState,
      linearAdvisoryState: {
        tracked_issue: createTrackedIssue({
          id: 'lin-issue-1',
          identifier: 'CO-1',
          title: 'Stale advisory issue',
          updated_at: '2026-03-22T04:01:03.255Z'
        })
      }
    });
    await seedManifest(fixture.paths, {
      task_id: 'linear-co-196-stale-advisory-fallback',
      issue_provider: 'linear',
      issue_id: 'lin-issue-196',
      issue_identifier: 'CO-196',
      summary: 'selected issue has explicit identity but no tracked payload',
      updated_at: '2026-04-17T04:00:00.000Z'
    });

    const snapshot = fixture.runtime.snapshot();
    const selectedSnapshot = await snapshot.readSelectedRunSnapshot();
    const compatibilityProjection = await snapshot.readCompatibilityProjection();
    const uiDataset = buildUiDataset({
      projection: compatibilityProjection,
      generatedAt: '2026-04-17T04:00:00.000Z'
    });

    expect(selectedSnapshot.selected?.issueIdentifier).toBe('CO-196');
    expect(selectedSnapshot.selected?.tracked?.linear ?? null).toBeNull();
    expect(selectedSnapshot.tracked?.linear ?? null).toBeNull();
    expect(compatibilityProjection.tracked?.linear ?? null).toBeNull();
    expect((uiDataset as { tracked?: { linear?: unknown } }).tracked?.linear ?? null).toBeNull();
  });

  it('fails closed on advisory fallback when provider intake has marked the advisory state stale', async () => {
    const fixture = await createFixture({
      taskId: 'linear-co-294-stale-advisory-state',
      linearAdvisoryState: {
        tracked_issue: createTrackedIssue({
          id: 'lin-issue-294',
          identifier: 'CO-294',
          title: 'Stale advisory issue',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-22T04:01:03.255Z'
        }),
        stale_source: {
          source: 'provider-intake',
          reason: 'provider_intake_newer_than_linear_advisory',
          marked_at: '2026-04-21T16:00:00.000Z',
          provider_intake_updated_at: '2026-04-21T16:00:00.000Z',
          advisory_updated_at: '2026-03-22T04:01:03.255Z'
        }
      }
    });
    await seedManifest(fixture.paths, {
      task_id: 'linear-co-294-stale-advisory-state',
      issue_provider: 'linear',
      issue_id: 'lin-issue-294',
      issue_identifier: 'CO-294',
      summary: 'selected issue has no authoritative tracked payload',
      updated_at: '2026-04-21T16:00:00.000Z'
    });

    const snapshot = fixture.runtime.snapshot();
    const selectedSnapshot = await snapshot.readSelectedRunSnapshot();
    const compatibilityProjection = await snapshot.readCompatibilityProjection();
    const uiDataset = buildUiDataset({
      projection: compatibilityProjection,
      generatedAt: '2026-04-21T16:00:00.000Z'
    });

    expect(selectedSnapshot.selected?.issueIdentifier).toBe('CO-294');
    expect(selectedSnapshot.selected?.tracked?.linear ?? null).toBeNull();
    expect(selectedSnapshot.tracked?.linear ?? null).toBeNull();
    expect(compatibilityProjection.selected?.tracked?.linear ?? null).toBeNull();
    expect(compatibilityProjection.tracked?.linear ?? null).toBeNull();
    expect((uiDataset as { tracked?: { linear?: unknown } }).tracked?.linear ?? null).toBeNull();
  });

  it('ignores stale advisory fallback that matches only a non-authoritative selected alias', async () => {
    const fixture = await createFixture({
      taskId: 'local-mcp',
      linearAdvisoryState: {
        tracked_issue: createTrackedIssue({
          id: 'local-mcp',
          identifier: 'CO-1',
          title: 'Stale advisory issue',
          state: 'Done',
          state_type: 'completed',
          updated_at: '2026-03-22T04:01:03.255Z'
        })
      }
    });
    await seedProviderLinearWorkerProof(fixture.paths, {
      issue_id: 'lin-issue-196',
      issue_identifier: 'CO-196',
      owner_phase: 'turn_running',
      owner_status: 'in_progress',
      last_event: 'turn_running',
      last_message: 'current worker is running',
      last_event_at: '2026-04-17T04:01:00.000Z',
      updated_at: '2026-04-17T04:01:00.000Z'
    });
    await seedManifest(fixture.paths, {
      task_id: 'local-mcp',
      issue_provider: 'linear',
      issue_id: 'local-mcp',
      issue_identifier: 'CO-196',
      summary: 'selected issue has authoritative identifier and fallback issue id alias',
      updated_at: '2026-04-17T04:00:00.000Z'
    });

    const snapshot = fixture.runtime.snapshot();
    const selectedSnapshot = await snapshot.readSelectedRunSnapshot();
    const compatibilityProjection = await snapshot.readCompatibilityProjection();
    const uiDataset = buildUiDataset({
      projection: compatibilityProjection,
      generatedAt: '2026-04-17T04:00:00.000Z'
    });

    expect(selectedSnapshot.selected?.issueIdentifier).toBe('CO-196');
    expect(selectedSnapshot.selected?.issueId).toBe('local-mcp');
    expect(selectedSnapshot.selected?.compatibilityState ?? null).toBeNull();
    expect(selectedSnapshot.selected?.displayStatus).toBe('in_progress');
    expect(selectedSnapshot.selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      source: 'run_summary',
      message: 'selected issue has authoritative identifier and fallback issue id alias'
    });
    expect(selectedSnapshot.selected?.tracked?.linear ?? null).toBeNull();
    expect(selectedSnapshot.selected?.providerDebugSnapshot?.live_linear_state).toEqual({
      state: null,
      state_type: null,
      updated_at: null
    });
    expect(selectedSnapshot.selected?.providerDebugSnapshot?.progress ?? null).toBeNull();
    expect(selectedSnapshot.selected?.providerDebugSnapshot?.stall_classification ?? null).toBeNull();
    expect(selectedSnapshot.tracked?.linear ?? null).toBeNull();
    expect(compatibilityProjection.selected?.tracked).toHaveProperty('linear', null);
    expect(compatibilityProjection.selected?.display_status).toBe('in_progress');
    expect(compatibilityProjection.selected?.latest_event).toMatchObject({
      event: 'in_progress',
      source: 'run_summary',
      message: 'selected issue has authoritative identifier and fallback issue id alias'
    });
    expect(compatibilityProjection.selected?.provider_debug_snapshot?.live_linear_state).toEqual({
      state: null,
      state_type: null,
      updated_at: null
    });
    expect(compatibilityProjection.selected?.provider_debug_snapshot?.progress ?? null).toBeNull();
    expect(
      compatibilityProjection.selected?.provider_debug_snapshot?.stall_classification ?? null
    ).toBeNull();
    expect(compatibilityProjection.issues).toHaveLength(1);
    expect(compatibilityProjection.issues[0]?.payload.display_status).toBe('in_progress');
    expect(compatibilityProjection.issues[0]?.payload.latest_event).toMatchObject({
      event: 'in_progress',
      source: 'run_summary',
      message: 'selected issue has authoritative identifier and fallback issue id alias'
    });
    expect(compatibilityProjection.issues[0]?.payload.tracked).toHaveProperty('linear', null);
    expect(
      compatibilityProjection.issues[0]?.payload.provider_debug_snapshot?.live_linear_state
    ).toEqual({
      state: null,
      state_type: null,
      updated_at: null
    });
    expect(
      compatibilityProjection.issues[0]?.payload.provider_debug_snapshot?.progress ?? null
    ).toBeNull();
    expect(
      compatibilityProjection.issues[0]?.payload.provider_debug_snapshot?.stall_classification ?? null
    ).toBeNull();
    expect(compatibilityProjection.tracked?.linear ?? null).toBeNull();
    expect(
      (
        uiDataset as {
          selected?: {
            tracked?: { linear?: unknown };
            display_status?: string | null;
            latest_event?: { event?: string | null; source?: string | null; message?: string | null } | null;
            provider_debug_snapshot?: {
              live_linear_state?: {
                state?: string | null;
                state_type?: string | null;
                updated_at?: string | null;
              };
              progress?: unknown;
              stall_classification?: string | null;
            } | null;
          };
        }
      ).selected?.tracked
    ).toHaveProperty('linear', null);
    expect(
      (
        uiDataset as {
          selected?: {
            display_status?: string | null;
          };
        }
      ).selected?.display_status
    ).toBe('in_progress');
    expect(
      (
        uiDataset as {
          selected?: {
            latest_event?: { event?: string | null; source?: string | null; message?: string | null } | null;
          };
        }
      ).selected?.latest_event
    ).toMatchObject({
      event: 'in_progress',
      source: 'run_summary',
      message: 'selected issue has authoritative identifier and fallback issue id alias'
    });
    expect(
      (
        uiDataset as {
          selected?: {
            provider_debug_snapshot?: {
              live_linear_state?: {
                state?: string | null;
                state_type?: string | null;
                updated_at?: string | null;
              };
            } | null;
          };
        }
      ).selected?.provider_debug_snapshot?.live_linear_state
    ).toEqual({
      state: null,
      state_type: null,
        updated_at: null
      });
    expect(
      (
        uiDataset as {
          selected?: {
            provider_debug_snapshot?: {
              progress?: unknown;
              stall_classification?: string | null;
            } | null;
          };
        }
      ).selected?.provider_debug_snapshot?.progress ?? null
    ).toBeNull();
    expect(
      (
        uiDataset as {
          selected?: {
            provider_debug_snapshot?: {
              progress?: unknown;
              stall_classification?: string | null;
            } | null;
          };
        }
      ).selected?.provider_debug_snapshot?.stall_classification ?? null
    ).toBeNull();
    expect(
      (uiDataset as { issues?: Array<{ tracked?: { linear?: unknown } }> }).issues?.every(
        (issue) =>
          Object.prototype.hasOwnProperty.call(issue, 'tracked') &&
          issue.tracked !== undefined &&
          Object.prototype.hasOwnProperty.call(issue.tracked, 'linear') &&
          issue.tracked.linear === null
      )
    ).toBe(true);
  });

  it('keeps matching tracked truth when issue id is only a task fallback alias', async () => {
    const fixture = await createFixture({
      taskId: 'linear-co-196-valid-identifier-only',
      linearAdvisoryState: {
        tracked_issue: createTrackedIssue({
          id: 'lin-issue-196',
          identifier: 'CO-196',
          title: 'Current advisory issue',
          updated_at: '2026-04-17T04:00:00.000Z'
        })
      }
    });
    await seedManifest(fixture.paths, {
      task_id: 'linear-co-196-valid-identifier-only',
      issue_provider: 'linear',
      issue_identifier: 'CO-196',
      summary: 'selected issue has authoritative identifier and fallback issue id alias',
      updated_at: '2026-04-17T04:00:00.000Z'
    });

    const snapshot = fixture.runtime.snapshot();
    const selectedSnapshot = await snapshot.readSelectedRunSnapshot();
    const compatibilityProjection = await snapshot.readCompatibilityProjection();
    const uiDataset = buildUiDataset({
      projection: compatibilityProjection,
      generatedAt: '2026-04-17T04:00:00.000Z'
    });

    expect(selectedSnapshot.selected?.issueIdentifier).toBe('CO-196');
    expect(selectedSnapshot.selected?.issueId).toBe('linear-co-196-valid-identifier-only');
    expect(selectedSnapshot.selected?.tracked?.linear?.identifier).toBe('CO-196');
    expect(selectedSnapshot.selected?.tracked?.linear?.id).toBe('lin-issue-196');
    expect(selectedSnapshot.tracked?.linear?.identifier).toBe('CO-196');
    expect(compatibilityProjection.selected?.tracked.linear?.identifier).toBe('CO-196');
    expect(compatibilityProjection.issues).toHaveLength(1);
    expect(compatibilityProjection.issues[0]?.payload.tracked.linear?.identifier).toBe('CO-196');
    expect(compatibilityProjection.tracked?.linear?.identifier).toBe('CO-196');
    expect(
      (uiDataset as { selected?: { tracked?: { linear?: { identifier?: string | null } } } })
        .selected?.tracked?.linear?.identifier
    ).toBe('CO-196');
    expect(
      (uiDataset as { issues?: Array<{ tracked?: { linear?: { identifier?: string | null } } }> })
      .issues?.[0]?.tracked?.linear?.identifier
    ).toBe('CO-196');
  });

  it('keeps current tracked truth when any authoritative selected alias matches', async () => {
    for (const manifest of [
      {
        task_id: 'linear-co-196-valid-id-stale-identifier',
        issue_provider: 'linear',
        issue_id: 'lin-issue-196',
        issue_identifier: 'CO-OLD',
        summary: 'selected issue id is authoritative while identifier is stale',
        updated_at: '2026-04-17T04:00:00.000Z'
      },
      {
        task_id: 'linear-co-196-stale-id-valid-identifier',
        issue_provider: 'linear',
        issue_id: 'lin-issue-old',
        issue_identifier: 'CO-196',
        summary: 'selected issue identifier is authoritative while id is stale',
        updated_at: '2026-04-17T04:00:00.000Z'
      }
    ]) {
      const fixture = await createFixture({
        taskId: manifest.task_id,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-196',
            identifier: 'CO-196',
            title: 'Current advisory issue',
            updated_at: '2026-04-17T04:00:00.000Z'
          })
        }
      });
      await seedManifest(fixture.paths, manifest);

      const snapshot = fixture.runtime.snapshot();
      const selectedSnapshot = await snapshot.readSelectedRunSnapshot();
      const compatibilityProjection = await snapshot.readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-17T04:00:00.000Z'
      });

      expect(selectedSnapshot.selected?.tracked?.linear?.id).toBe('lin-issue-196');
      expect(selectedSnapshot.selected?.tracked?.linear?.identifier).toBe('CO-196');
      expect(selectedSnapshot.tracked?.linear?.identifier).toBe('CO-196');
      expect(compatibilityProjection.selected?.tracked.linear?.identifier).toBe('CO-196');
      expect(compatibilityProjection.tracked?.linear?.identifier).toBe('CO-196');
      expect(
        (uiDataset as { selected?: { tracked?: { linear?: { identifier?: string | null } } } })
          .selected?.tracked?.linear?.identifier
      ).toBe('CO-196');
    }
  });

  it('prunes ordinary released not-active workers when fresh proof has a dead pid', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T23:00:00.000Z'));
    const stalePid = 424247;
    vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      if (pid === stalePid && signal === 0) {
        const error = new Error('process not found') as NodeJS.ErrnoException;
        error.code = 'ESRCH';
        throw error;
      }
      return true;
    });
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-198',
          issue_id: 'lin-issue-198',
          issue_identifier: 'CO-198',
          issue_title: 'Ordinary released worker with dead proof',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-04-15T22:30:00.000Z',
          task_id: 'linear-ordinary-released-live-worker-dead-proof',
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          accepted_at: '2026-04-15T22:45:00.000Z',
          updated_at: '2026-04-15T22:56:00.000Z',
          last_delivery_id: 'delivery-co-198',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_764_500_000,
          run_id: 'run-ordinary-live-dead-proof',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-co-198'
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-ordinary-released-live-worker-dead-proof',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-198',
            identifier: 'CO-198',
            title: 'Ordinary released worker with dead proof',
            state: 'In Progress',
            state_type: 'started',
            updated_at: '2026-04-15T22:59:00.000Z'
          })
        }
      });
      await seedManifest(fixture.paths, {
        task_id: 'linear-ordinary-released-live-worker-dead-proof',
        issue_provider: 'linear',
        issue_id: 'lin-issue-198',
        issue_identifier: 'CO-198',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-15T22:45:00.000Z',
        updated_at: '2026-04-15T22:59:00.000Z',
        summary: 'ordinary released worker has stale local proof'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'lin-issue-198',
        issue_identifier: 'CO-198',
        pid: String(stalePid),
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_running',
        last_message: 'dead local worker still reports running',
        updated_at: '2026-04-15T22:59:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-15T23:00:00.000Z'
      });

      expect(compatibilityProjection.running).toEqual([]);
      expect(uiDataset.counts.running).toBe(0);
      expect(uiDataset.running).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('prunes accepted pending-revalidation workers when fresh local proof has a dead pid', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T06:16:00.000Z'));
    const stalePid = 3391;
    vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      if (pid === stalePid && signal === 0) {
        const error = new Error('process not found') as NodeJS.ErrnoException;
        error.code = 'ESRCH';
        throw error;
      }
      return true;
    });
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-196',
          issue_id: 'lin-issue-196',
          issue_identifier: 'CO-196',
          issue_title: 'Accepted pending revalidation with dead local proof',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-17T06:15:00.000Z',
          task_id: 'linear-5561a9a9-39dd-4ed4-99a0-896553327669',
          mapping_source: 'provider_id_fallback',
          state: 'accepted',
          reason: 'provider_issue_rehydration_pending_revalidation',
          accepted_at: '2026-04-17T03:45:02.315Z',
          updated_at: '2026-04-17T06:15:00.000Z',
          last_delivery_id: 'delivery-co-196',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_870_500_000,
          run_id: '2026-04-17T03-45-02-315Z-f469b275',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-co-196'
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-5561a9a9-39dd-4ed4-99a0-896553327669',
        featureToggles: {
          coordinator: {
            agent: {
              max_concurrent_agents: 3
            }
          }
        },
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-196',
            identifier: 'CO-196',
            title: 'Accepted pending revalidation with dead local proof',
            state: 'In Progress',
            state_type: 'started',
            updated_at: '2026-04-17T06:15:00.000Z'
          })
        }
      });
      providerIntakeState.claims[0]!.run_manifest_path = fixture.paths.manifestPath;
      await seedManifest(fixture.paths, {
        task_id: 'linear-5561a9a9-39dd-4ed4-99a0-896553327669',
        issue_provider: 'linear',
        issue_id: 'lin-issue-196',
        issue_identifier: 'CO-196',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-17T03:45:02.315Z',
        updated_at: '2026-04-17T06:15:00.000Z',
        summary: 'stale worker still reports running'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'lin-issue-196',
        issue_identifier: 'CO-196',
        pid: stalePid,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_running',
        last_message: 'dead local worker still reports running',
        updated_at: '2026-04-17T06:15:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-17T06:16:00.000Z'
      });

      expect(compatibilityProjection.maxConcurrentAgents).toBe(3);
      expect(compatibilityProjection.running).toEqual([]);
      expect(uiDataset.counts.max_allowed).toBe(3);
      expect(uiDataset.counts.running).toBe(0);
      expect(uiDataset.running).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('prunes accepted pending-revalidation workers when the local proof is stale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T06:16:00.000Z'));
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-211',
          issue_id: 'lin-issue-211',
          issue_identifier: 'CO-211',
          issue_title: 'Accepted pending revalidation with stale local proof',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-17T06:15:00.000Z',
          task_id: 'linear-issue-211-stale-proof',
          mapping_source: 'provider_id_fallback',
          state: 'accepted',
          reason: 'provider_issue_rehydration_pending_revalidation',
          accepted_at: '2026-04-17T05:45:00.000Z',
          updated_at: '2026-04-17T06:15:00.000Z',
          last_delivery_id: 'delivery-co-211',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_870_500_000,
          run_id: 'run-stale-proof',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-co-211'
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-issue-211-stale-proof',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-211',
            identifier: 'CO-211',
            title: 'Accepted pending revalidation with stale local proof',
            state: 'In Progress',
            state_type: 'started',
            updated_at: '2026-04-17T06:15:00.000Z'
          })
        }
      });
      providerIntakeState.claims[0]!.run_manifest_path = fixture.paths.manifestPath;
      await seedManifest(fixture.paths, {
        task_id: 'linear-issue-211-stale-proof',
        issue_provider: 'linear',
        issue_id: 'lin-issue-211',
        issue_identifier: 'CO-211',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-17T06:00:00.000Z',
        updated_at: '2026-04-17T06:15:00.000Z',
        summary: 'accepted pending revalidation still points at an older attempt proof'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'lin-issue-211',
        issue_identifier: 'CO-211',
        attempt_started_at: '2026-04-17T05:55:00.000Z',
        pid: 59516,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_running',
        last_message: 'older attempt proof still reports running',
        updated_at: '2026-04-17T05:55:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-17T06:16:00.000Z'
      });

      expect(compatibilityProjection.running).toEqual([]);
      expect(uiDataset.counts.running).toBe(0);
      expect(uiDataset.running).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps accepted pending-revalidation workers running when local proof is still live', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T06:16:00.000Z'));
    const livePid = 59516;
    vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      if (pid === livePid && signal === 0) {
        return true;
      }
      return true;
    });
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-210',
          issue_id: 'lin-issue-210',
          issue_identifier: 'CO-210',
          issue_title: 'Accepted pending revalidation with live local proof',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-17T06:15:00.000Z',
          task_id: 'linear-issue-210-live-proof',
          mapping_source: 'provider_id_fallback',
          state: 'accepted',
          reason: 'provider_issue_rehydration_pending_revalidation',
          accepted_at: '2026-04-17T05:50:00.000Z',
          updated_at: '2026-04-17T06:15:00.000Z',
          last_delivery_id: 'delivery-co-210',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_744_870_500_000,
          run_id: 'run-live-proof',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-co-210'
        }
      ]);
      const fixture = await createFixture({
        taskId: 'linear-issue-210-live-proof',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-210',
            identifier: 'CO-210',
            title: 'Accepted pending revalidation with live local proof',
            state: 'In Progress',
            state_type: 'started',
            updated_at: '2026-04-17T06:15:00.000Z'
          })
        }
      });
      providerIntakeState.claims[0]!.run_manifest_path = fixture.paths.manifestPath;
      await seedManifest(fixture.paths, {
        task_id: 'linear-issue-210-live-proof',
        issue_provider: 'linear',
        issue_id: 'lin-issue-210',
        issue_identifier: 'CO-210',
        pipeline_id: 'provider-linear-worker',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        started_at: '2026-04-17T05:50:00.000Z',
        updated_at: '2026-04-17T06:15:00.000Z',
        summary: 'live worker is still running'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'lin-issue-210',
        issue_identifier: 'CO-210',
        pid: livePid,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_running',
        last_message: 'live local worker still reports running',
        updated_at: '2026-04-17T06:15:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const uiDataset = buildUiDataset({
        projection: compatibilityProjection,
        generatedAt: '2026-04-17T06:16:00.000Z'
      });

      expect(compatibilityProjection.running).toHaveLength(1);
      expect(compatibilityProjection.running[0]).toMatchObject({
        issue_identifier: 'CO-210'
      });
      expect(uiDataset.counts.running).toBe(1);
      expect(uiDataset.running[0]).toMatchObject({
        issue_identifier: 'CO-210',
        pid: livePid
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('suppresses null-provider running sources when a matching intake claim is no longer active', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-null-provider-claimed-current',
        providerIntakeState: createProviderIntakeState([
          {
            provider: 'linear',
            provider_key: 'linear:issue-completed',
            issue_id: 'issue-completed',
            issue_identifier: 'ISSUE-COMPLETED',
            issue_title: 'Completed Linear issue',
            issue_state: 'Done',
            issue_state_type: 'completed',
            issue_updated_at: '2026-03-07T00:26:00.000Z',
            task_id: 'task-null-provider-claimed-stale',
            mapping_source: 'provider_id_fallback',
            state: 'completed',
            reason: 'provider_issue_rehydrated_active_run',
            accepted_at: '2026-03-07T00:15:00.000Z',
            updated_at: '2026-03-07T00:26:00.000Z',
            last_delivery_id: 'delivery-completed',
            last_event: 'Issue',
            last_action: 'update',
            last_webhook_timestamp: 1_742_360_160_000,
            run_id: 'run-stale',
            run_manifest_path: null,
            launch_source: 'control-host',
            launch_token: 'launch-completed'
          }
        ])
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-null-provider-claimed-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      await createSiblingRun(fixture.root, 'task-null-provider-claimed-stale', 'run-2', {
        manifest: {
          task_id: 'task-null-provider-claimed-stale',
          issue_id: 'issue-completed',
          issue_identifier: 'ISSUE-COMPLETED',
          status: 'in_progress',
          started_at: '2026-03-07T00:05:00.000Z',
          updated_at: '2026-03-07T00:10:00.000Z',
          summary: 'historical default-provider run claimed by a completed intake record'
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT'
      ]);
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === 'ISSUE-COMPLETED')
      ).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not suppress local running sources when linear claims only match by shared identifiers', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-claim-provider-current',
        providerIntakeState: createProviderIntakeState([
          {
            provider: 'linear',
            provider_key: 'linear:issue-local',
            issue_id: 'issue-local',
            issue_identifier: 'ISSUE-LOCAL',
            issue_title: 'Linear claim should not suppress a local run',
            issue_state: 'Done',
            issue_state_type: 'completed',
            issue_updated_at: '2026-03-07T00:29:00.000Z',
            task_id: 'task-shared',
            mapping_source: 'provider_id_fallback',
            state: 'completed',
            reason: 'provider_issue_rehydrated_active_run',
            accepted_at: '2026-03-07T00:10:00.000Z',
            updated_at: '2026-03-07T00:29:00.000Z',
            last_delivery_id: 'delivery-local',
            last_event: 'Issue',
            last_action: 'update',
            last_webhook_timestamp: 1_742_360_140_000,
            run_id: 'run-linear-claim',
            run_manifest_path: null,
            launch_source: 'control-host',
            launch_token: 'launch-local'
          }
        ])
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-claim-provider-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      await createSiblingRun(fixture.root, 'task-shared', 'run-2', {
        manifest: {
          task_id: 'task-shared',
          issue_provider: 'local',
          issue_identifier: 'ISSUE-LOCAL',
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          summary: 'local active run that shares identifiers with a linear claim'
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT',
        'ISSUE-LOCAL'
      ]);
      expect(
        compatibilityProjection.issues.find((issue) => issue.issueIdentifier === 'ISSUE-LOCAL')
      ).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses run id as the final same-issue representative tiebreak when timestamps collide', async () => {
    const fixture = await createFixture({
      taskId: 'task-1036-current'
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-1036-current',
      issue_identifier: 'ISSUE-1036',
      summary: 'selected run remains current authority',
      started_at: '2026-03-07T00:15:00.000Z',
      updated_at: '2026-03-07T00:15:00.000Z'
    });

    await createSiblingRun(fixture.root, 'task-1036-current', 'run-2', {
      manifest: {
        task_id: 'task-1036-current',
        issue_identifier: 'ISSUE-1036',
        status: 'in_progress',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:20:00.000Z',
        summary: 'older lexical run id'
      }
    });

    await createSiblingRun(fixture.root, 'task-1036-current', 'run-3', {
      manifest: {
        task_id: 'task-1036-current',
        issue_identifier: 'ISSUE-1036',
        status: 'in_progress',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:20:00.000Z',
        summary: 'newer lexical run id'
      }
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const sameIssueRecord = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'ISSUE-1036'
    );

    expect(compatibilityProjection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'ISSUE-1036',
        session_id: null
      })
    ]);
    expect(sameIssueRecord?.payload.running).toMatchObject({
      issue_identifier: 'ISSUE-1036',
      session_id: null
    });
  });

  it('keeps same-issue telemetry aggregated across authoritative runtime sources while the issue projection prefers one running row', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-1037-current'
      });

      await seedManifest(fixture.paths, {
        task_id: 'task-1037-current',
        issue_id: 'issue-1037',
        issue_identifier: 'ISSUE-1037',
        started_at: '2026-03-07T00:10:00.000Z',
        updated_at: '2026-03-07T00:20:00.000Z',
        summary: 'older selected run still owns the selected slot'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'issue-1037',
        issue_identifier: 'ISSUE-1037',
        latest_session_id: 'thread-selected-turn-2',
        turn_count: 2,
        last_message: 'selected proof is stale',
        last_event_at: '2026-03-07T00:20:00.000Z',
        tokens: {
          input_tokens: 11,
          output_tokens: 7,
          total_tokens: 18
        },
        rate_limits: {
          limit_id: 'coding',
          primary: {
            remaining: 3
          }
        },
        child_lanes: [
          {
            task_id: 'task-1037-current-docs',
            run_id: 'child-run-1',
            stream: 'docs',
            purpose: 'docs lane',
            pipeline_id: 'provider-linear-child-lane',
            status: 'in_progress',
            launched_at: '2026-03-07T00:34:00.000Z',
            decision: 'pending',
            summary: 'Child lane docs is running.',
            summary_recorded_at: '2026-03-07T00:35:00.000Z'
          }
        ],
        updated_at: '2026-03-07T00:35:00.000Z'
      });

      const newerSibling = await createSiblingRun(fixture.root, 'task-1037-current', 'run-2', {
        manifest: {
          task_id: 'task-1037-current',
          issue_id: 'issue-1037',
          issue_identifier: 'ISSUE-1037',
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:00.000Z',
          summary: 'newer sibling run has fresher telemetry'
        }
      });
      await seedProviderLinearWorkerProof(newerSibling, {
        issue_id: 'issue-1037',
        issue_identifier: 'ISSUE-1037',
        latest_session_id: 'thread-sibling-turn-1',
        turn_count: 1,
        last_message: 'sibling proof is current',
        last_event_at: '2026-03-07T00:29:00.000Z',
        tokens: {
          input_tokens: 5,
          output_tokens: 3,
          total_tokens: 8
        },
        rate_limits: {
          limit_id: 'coding',
          primary: {
            remaining: 17
          }
        },
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const sameIssueRecord = compatibilityProjection.issues.find(
        (issue) => issue.issueIdentifier === 'ISSUE-1037'
      );

      expect(compatibilityProjection.running).toEqual([
        expect.objectContaining({
          issue_identifier: 'ISSUE-1037',
          session_id: 'thread-sibling-turn-1',
          turn_count: 1,
          tokens: {
            input_tokens: 5,
            output_tokens: 3,
            total_tokens: 8
          }
        })
      ]);
      expect(sameIssueRecord?.payload.running).toMatchObject({
        issue_identifier: 'ISSUE-1037',
        session_id: 'thread-sibling-turn-1',
        turn_count: 1
      });
      expect(compatibilityProjection.codexTotals).toEqual({
        input_tokens: 16,
        output_tokens: 10,
        total_tokens: 26,
        seconds_running: 1500
      });
      expect(compatibilityProjection.rateLimits).toEqual({
        limit_id: 'coding',
        primary: {
          remaining: 17
        }
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('prefers the freshest current-turn activity timestamp when selecting compatibility Codex rate limits', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-rate-limit-current-turn'
      });

      await seedManifest(fixture.paths, {
        task_id: 'task-rate-limit-current-turn',
        issue_id: 'issue-rate-limit-current-turn',
        issue_identifier: 'ISSUE-RATE-LIMIT-CURRENT-TURN',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'issue-rate-limit-current-turn',
        issue_identifier: 'ISSUE-RATE-LIMIT-CURRENT-TURN',
        last_event_at: '2026-03-07T00:28:00.000Z',
        current_turn_activity: {
          event: 'token_count',
          message_or_payload: 'Refreshed Codex budgets.',
          recorded_at: '2026-03-07T00:29:30.000Z',
          source: 'session_log_hydration',
          turn_id: 'turn-2',
          session_id: 'thread-current-turn-2'
        },
        rate_limits: {
          source: 'current-turn-activity',
          primary: {
            remaining: 3
          }
        },
        updated_at: '2026-03-07T00:29:30.000Z'
      });

      const sibling = await createSiblingRun(fixture.root, 'task-rate-limit-sibling', 'run-2', {
        manifest: {
          task_id: 'task-rate-limit-sibling',
          issue_id: 'issue-rate-limit-sibling',
          issue_identifier: 'ISSUE-RATE-LIMIT-SIBLING',
          status: 'in_progress',
          started_at: '2026-03-07T00:21:00.000Z',
          updated_at: '2026-03-07T00:29:00.000Z'
        }
      });
      await seedProviderLinearWorkerProof(sibling, {
        issue_id: 'issue-rate-limit-sibling',
        issue_identifier: 'ISSUE-RATE-LIMIT-SIBLING',
        last_event_at: '2026-03-07T00:29:00.000Z',
        rate_limits: {
          source: 'last-event-only',
          primary: {
            remaining: 17
          }
        },
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.rateLimits).toEqual({
        source: 'current-turn-activity',
        primary: {
          remaining: 3
        }
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('prefers semantic provider progress over the generic in_progress fallback in running rows', async () => {
    const fixture = await createFixture({
      taskId: 'task-1037-event-current'
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-1037-event-current',
      issue_id: 'issue-1037-event',
      issue_identifier: 'ISSUE-1037-EVENT',
      status: 'in_progress',
      started_at: '2026-03-07T00:25:00.000Z',
      updated_at: '2026-03-07T00:29:00.000Z',
      summary: 'generic manifest fallback'
    });
    await seedProviderLinearWorkerProof(fixture.paths, {
      issue_id: 'issue-1037-event',
      issue_identifier: 'ISSUE-1037-EVENT',
      pid: '4242',
      turn_count: 1,
      last_event: 'turn.completed',
      last_message: 'Codex turn completed',
      last_event_at: '2026-03-07T00:29:30.000Z',
      updated_at: '2026-03-07T00:29:30.000Z'
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const sameIssueRecord = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'ISSUE-1037-EVENT'
    );

    expect(compatibilityProjection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'ISSUE-1037-EVENT',
        pid: '4242',
        last_event: 'turn.completed',
        last_message: 'Codex turn completed',
        last_event_at: '2026-03-07T00:29:30.000Z',
        event_source: 'legacy_proof_last_message'
      })
    ]);
    expect(sameIssueRecord?.payload.running).toMatchObject({
      issue_identifier: 'ISSUE-1037-EVENT',
      pid: '4242',
      last_event: 'turn.completed',
      last_message: 'Codex turn completed',
      last_event_at: '2026-03-07T00:29:30.000Z',
      event_source: 'legacy_proof_last_message'
    });
  });

  it('projects authoritative budget exhaustion event text into running rows', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:29:45.000Z'));

    try {
      const providerIntakeState = createProviderIntakeState();
      providerIntakeState.polling = {
        next_poll_in_ms: 43_000,
        linear_budget: {
          observed_at: '2026-03-07T00:29:45.000Z',
          source: 'control-host-polling',
          suppression: 'cooldown',
          suppression_reason: 'linear_budget_shared_cooldown',
          retry_after_seconds: 43,
          cooldown_until: '2026-03-07T00:30:28.000Z',
          cooldown_active: true,
          request_id: 'polling-budget-1',
          requests: {
            remaining: 0,
            limit: 30,
            reset_at: '2026-03-07T00:30:28.000Z'
          },
          endpoint_requests: null,
          complexity: {
            remaining: 180,
            limit: 200,
            reset_at: '2026-03-07T00:30:07.000Z'
          },
          endpoint_complexity: null
        }
      };
      const fixture = await createFixture({
        taskId: 'task-1037-budget-event',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'issue-1037-budget-event',
            identifier: 'ISSUE-1037-BUDGET-EVENT',
            title: 'Polling is paused by Linear request exhaustion',
            updated_at: '2026-03-07T00:29:45.000Z'
          })
        }
      });

      await seedManifest(fixture.paths, {
        task_id: 'task-1037-budget-event',
        issue_id: 'issue-1037-budget-event',
        issue_identifier: 'ISSUE-1037-BUDGET-EVENT',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'provider worker turn is active'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'issue-1037-budget-event',
        issue_identifier: 'ISSUE-1037-BUDGET-EVENT',
        pid: '4242',
        turn_count: 3,
        last_event: 'account/ratelimits/updated',
        last_message: 'rate limits updated',
        last_event_at: '2026-03-07T00:29:30.000Z',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        updated_at: '2026-03-07T00:29:30.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const sameIssueRecord = compatibilityProjection.issues.find(
        (issue) => issue.issueIdentifier === 'ISSUE-1037-BUDGET-EVENT'
      );

      expect(compatibilityProjection.running).toEqual([
        expect.objectContaining({
          issue_identifier: 'ISSUE-1037-BUDGET-EVENT',
          display_event: 'linear requests exhausted; next tracked-issue refresh at 43s'
        })
      ]);
      expect(sameIssueRecord?.payload.running?.display_event).toBe(
        'linear requests exhausted; next tracked-issue refresh at 43s'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('derives cooldown next-refresh projection from persisted shared-budget state even when raw scheduling overstates it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:00:00.000Z'));

    try {
      const fixture = await createFixture({
        providerIntakeState: {
          ...createProviderIntakeState(),
          polling: {
            enabled: true,
            interval_ms: 15_000,
            checking: true,
            queued: false,
            last_mode: 'poll',
            last_requested_at: '2026-03-07T00:00:00.000Z',
            next_poll_at: '2026-03-07T00:58:11.000Z',
            next_poll_in_ms: (58 * 60 + 11) * 1000,
            updated_at: '2026-03-07T00:00:00.000Z',
            operation_started_at: '2026-03-07T00:00:00.000Z',
            linear_budget: {
              observed_at: '2026-03-07T00:00:00.000Z',
              source: 'control-host-polling',
              suppression: 'cooldown',
              suppression_reason: 'linear_budget_shared_cooldown',
              retry_after_seconds: 29 * 60 + 32,
              cooldown_until: '2026-03-07T00:29:32.000Z',
              cooldown_active: true,
              request_id: 'polling-budget-rehydrate',
              requests: {
                remaining: 0,
                limit: 30,
                reset_at: '2026-03-07T00:29:32.000Z'
              },
              endpoint_requests: null,
              complexity: null,
              endpoint_complexity: null
            }
          }
        }
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      expect(compatibilityProjection.polling).toMatchObject({
        checking: true,
        next_poll_in_ms: (58 * 60 + 11) * 1000,
        next_refresh_state: 'cooldown',
        next_refresh_at: '2026-03-07T00:29:32.000Z',
        next_refresh_in_ms: (29 * 60 + 32) * 1000
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('limits shared polling exhaustion events to the tracked running issue', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:29:45.000Z'));

    try {
      const providerIntakeState = createProviderIntakeState();
      providerIntakeState.polling = {
        next_poll_in_ms: 43_000,
        linear_budget: {
          observed_at: '2026-03-07T00:29:45.000Z',
          source: 'control-host-polling',
          suppression: 'cooldown',
          suppression_reason: 'linear_budget_shared_cooldown',
          retry_after_seconds: 43,
          cooldown_until: '2026-03-07T00:30:28.000Z',
          cooldown_active: true,
          request_id: 'polling-budget-owner',
          requests: {
            remaining: 0,
            limit: 30,
            reset_at: '2026-03-07T00:30:28.000Z'
          },
          endpoint_requests: null,
          complexity: {
            remaining: 180,
            limit: 200,
            reset_at: '2026-03-07T00:30:07.000Z'
          },
          endpoint_complexity: null
        }
      };
      const fixture = await createFixture({
        taskId: 'task-1037-budget-owner',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'issue-1037-budget-owner',
            identifier: 'ISSUE-1037-BUDGET-OWNER',
            title: 'Tracked refresh is paused by Linear request exhaustion',
            updated_at: '2026-03-07T00:29:45.000Z'
          })
        }
      });

      await seedManifest(fixture.paths, {
        task_id: 'task-1037-budget-owner',
        issue_id: 'issue-1037-budget-owner',
        issue_identifier: 'ISSUE-1037-BUDGET-OWNER',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z',
        summary: 'provider worker turn is active'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'issue-1037-budget-owner',
        issue_identifier: 'ISSUE-1037-BUDGET-OWNER',
        pid: '4242',
        turn_count: 3,
        last_event: 'account/ratelimits/updated',
        last_message: 'rate limits updated',
        last_event_at: '2026-03-07T00:29:30.000Z',
        linear_budget: {
          observed_at: '2026-03-07T00:29:00.000Z',
          source: 'worker-proof',
          suppression: 'none',
          suppression_reason: null,
          retry_after_seconds: null,
          cooldown_until: null,
          cooldown_active: false,
          request_id: 'worker-budget-owner',
          requests: {
            remaining: 8,
            limit: 30,
            reset_at: '2026-03-07T00:31:00.000Z'
          },
          endpoint_requests: null,
          complexity: {
            remaining: 180,
            limit: 200,
            reset_at: '2026-03-07T00:30:07.000Z'
          },
          endpoint_complexity: null
        },
        updated_at: '2026-03-07T00:29:30.000Z'
      });

      const sibling = await createSiblingRun(fixture.root, 'task-1037-budget-sibling', 'run-2', {
        manifest: {
          task_id: 'task-1037-budget-sibling',
          issue_id: 'issue-1037-budget-sibling',
          issue_identifier: 'ISSUE-1037-BUDGET-SIBLING',
          status: 'in_progress',
          started_at: '2026-03-07T00:26:00.000Z',
          updated_at: '2026-03-07T00:29:10.000Z',
          summary: 'adjacent provider work is active'
        }
      });
      await seedProviderLinearWorkerProof(sibling, {
        issue_id: 'issue-1037-budget-sibling',
        issue_identifier: 'ISSUE-1037-BUDGET-SIBLING',
        pid: '5252',
        turn_count: 1,
        last_event: 'turn.started',
        last_message: 'turn started',
        last_event_at: '2026-03-07T00:29:35.000Z',
        updated_at: '2026-03-07T00:29:35.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const trackedEntry = compatibilityProjection.running.find(
        (entry) => entry.issue_identifier === 'ISSUE-1037-BUDGET-OWNER'
      );
      const siblingEntry = compatibilityProjection.running.find(
        (entry) => entry.issue_identifier === 'ISSUE-1037-BUDGET-SIBLING'
      );

      expect(trackedEntry?.display_event).toBe(
        'linear requests exhausted; next tracked-issue refresh at 43s'
      );
      expect(siblingEntry?.display_event).not.toBe(
        'linear requests exhausted; next tracked-issue refresh at 43s'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps shared polling exhaustion visible even when a newer worker proof reports healthier Linear budget', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:29:00.000Z'));
    try {
      const providerIntakeState = createProviderIntakeState();
      providerIntakeState.polling = {
        next_poll_in_ms: 43_000,
        linear_budget: {
          observed_at: '2026-03-07T00:29:00.000Z',
          source: 'control-host-polling',
          suppression: 'cooldown',
          suppression_reason: 'linear_budget_shared_cooldown',
          retry_after_seconds: 43,
          cooldown_until: '2026-03-07T00:29:43.000Z',
          cooldown_active: true,
          request_id: 'polling-budget-shared-authoritative',
          requests: {
            remaining: 0,
            limit: 30,
            reset_at: '2026-03-07T00:29:43.000Z'
          },
          endpoint_requests: null,
          complexity: {
            remaining: 180,
            limit: 200,
            reset_at: '2026-03-07T00:30:07.000Z'
          },
          endpoint_complexity: null
        }
      };
      const fixture = await createFixture({
        taskId: 'task-1037-shared-polling-authoritative',
        providerIntakeState,
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'issue-1037-shared-polling-authoritative',
            identifier: 'ISSUE-1037-SHARED-POLLING-AUTHORITATIVE',
            title: 'Tracked refresh is paused by shared Linear cooldown',
            updated_at: '2026-03-07T00:29:00.000Z'
          })
        }
      });

      await seedManifest(fixture.paths, {
        task_id: 'task-1037-shared-polling-authoritative',
        issue_id: 'issue-1037-shared-polling-authoritative',
        issue_identifier: 'ISSUE-1037-SHARED-POLLING-AUTHORITATIVE',
        status: 'in_progress',
        started_at: '2026-03-07T00:25:00.000Z',
        updated_at: '2026-03-07T00:29:30.000Z',
        summary: 'tracked issue is still running while refresh is paused'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'issue-1037-shared-polling-authoritative',
        issue_identifier: 'ISSUE-1037-SHARED-POLLING-AUTHORITATIVE',
        pid: '4242',
        turn_count: 3,
        last_event: 'account/ratelimits/updated',
        last_message: 'rate limits updated',
        last_event_at: '2026-03-07T00:29:30.000Z',
        rate_limits: {
          source: 'seeded-proof'
        },
        linear_budget: {
          observed_at: '2026-03-07T00:29:30.000Z',
          source: 'worker-proof',
          suppression: 'none',
          suppression_reason: null,
          retry_after_seconds: null,
          cooldown_until: null,
          cooldown_active: false,
          request_id: 'worker-budget-shared-authoritative',
          requests: {
            remaining: 12,
            limit: 30,
            reset_at: '2026-03-07T00:31:00.000Z'
          },
          endpoint_requests: null,
          complexity: {
            remaining: 180,
            limit: 200,
            reset_at: '2026-03-07T00:30:07.000Z'
          },
          endpoint_complexity: null
        },
        updated_at: '2026-03-07T00:29:30.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const runningEntry = compatibilityProjection.running.find(
        (entry) => entry.issue_identifier === 'ISSUE-1037-SHARED-POLLING-AUTHORITATIVE'
      );

      expect(runningEntry?.display_event).toBe(
        'linear requests exhausted; next tracked-issue refresh at 43s'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('surfaces endpoint-specific Linear request exhaustion with the operator-facing requests event text', async () => {
    const fixture = await createFixture({
      taskId: 'task-1037-endpoint-budget-event'
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-1037-endpoint-budget-event',
      issue_id: 'issue-1037-endpoint-budget-event',
      issue_identifier: 'ISSUE-1037-ENDPOINT-BUDGET-EVENT',
      status: 'in_progress',
      started_at: '2026-03-07T00:25:00.000Z',
      updated_at: '2026-03-07T00:29:00.000Z',
      summary: 'provider worker turn is active'
    });
    await seedProviderLinearWorkerProof(fixture.paths, {
      issue_id: 'issue-1037-endpoint-budget-event',
      issue_identifier: 'ISSUE-1037-ENDPOINT-BUDGET-EVENT',
      pid: '4242',
      turn_count: 3,
      last_event: 'account/ratelimits/updated',
      last_message: 'rate limits updated',
      last_event_at: '2026-03-07T00:29:30.000Z',
      rate_limits: {
        source: 'seeded-proof'
      },
      linear_budget: {
        observed_at: '2026-03-07T00:29:30.000Z',
        source: 'worker-proof',
        suppression: 'cooldown',
        suppression_reason: 'linear_budget_endpoint_requests_exhausted',
        retry_after_seconds: 43,
        cooldown_until: '2026-03-07T00:30:13.000Z',
        cooldown_active: true,
        request_id: 'worker-endpoint-budget',
        requests: {
          remaining: 12,
          limit: 30,
          reset_at: '2026-03-07T00:30:50.000Z'
        },
        endpoint_requests: {
          remaining: 0,
          limit: 12,
          reset_at: '2026-03-07T00:30:13.000Z'
        },
        complexity: {
          remaining: 180,
          limit: 200,
          reset_at: '2026-03-07T00:30:07.000Z'
        },
        endpoint_complexity: null
      },
      updated_at: '2026-03-07T00:29:30.000Z'
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

    expect(compatibilityProjection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'ISSUE-1037-ENDPOINT-BUDGET-EVENT',
        display_event: 'linear requests exhausted; next tracked-issue refresh at 43s'
      })
    ]);
  });

  it('surfaces endpoint-specific legacy Codex request exhaustion with the operator-facing codex budget event text', async () => {
    const fixture = await createFixture({
      taskId: 'task-1037-codex-endpoint-budget-event'
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-1037-codex-endpoint-budget-event',
      issue_id: 'issue-1037-codex-endpoint-budget-event',
      issue_identifier: 'ISSUE-1037-CODEX-ENDPOINT-BUDGET-EVENT',
      status: 'in_progress',
      started_at: '2026-03-07T00:25:00.000Z',
      updated_at: '2026-03-07T00:29:00.000Z',
      summary: 'provider worker turn is active'
    });
    await seedProviderLinearWorkerProof(fixture.paths, {
      issue_id: 'issue-1037-codex-endpoint-budget-event',
      issue_identifier: 'ISSUE-1037-CODEX-ENDPOINT-BUDGET-EVENT',
      pid: '4242',
      turn_count: 3,
      last_event: 'account/ratelimits/updated',
      last_message: 'rate limits updated',
      last_event_at: '2026-03-07T00:29:30.000Z',
      rate_limits: {
        source: 'legacy-proof',
        requests: {
          remaining: 12,
          limit: 30,
          reset_at: '2026-03-07T00:30:50.000Z'
        },
        endpoint_requests: {
          remaining: 0,
          limit: 12,
          reset_at: '2026-03-07T00:30:13.000Z'
        }
      },
      updated_at: '2026-03-07T00:29:30.000Z'
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

    expect(compatibilityProjection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'ISSUE-1037-CODEX-ENDPOINT-BUDGET-EVENT',
        display_event: 'codex requests bucket exhausted; worker paused until reset'
      })
    ]);
  });

  it('preserves active Linear stage labels instead of collapsing them to generic running', async () => {
    const fixture = await createFixture({
      taskId: 'task-1037-stage-active',
      linearAdvisoryState: {
        tracked_issue: createTrackedIssue({
          id: 'issue-1037-stage-active',
          identifier: 'ISSUE-1037-STAGE-ACTIVE',
          title: 'Implementation work is still in progress',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-07T00:29:45.000Z'
        })
      }
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-1037-stage-active',
      issue_id: 'issue-1037-stage-active',
      issue_identifier: 'ISSUE-1037-STAGE-ACTIVE',
      status: 'in_progress',
      started_at: '2026-03-07T00:25:00.000Z',
      updated_at: '2026-03-07T00:29:00.000Z',
      summary: 'implementation is active'
    });
    await seedProviderLinearWorkerProof(fixture.paths, {
      issue_id: 'issue-1037-stage-active',
      issue_identifier: 'ISSUE-1037-STAGE-ACTIVE',
      pid: '4242',
      turn_count: 3,
      last_event: 'turn/completed',
      last_message: 'turn completed (completed)',
      last_event_at: '2026-03-07T00:29:30.000Z',
      updated_at: '2026-03-07T00:29:30.000Z'
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const sameIssueRecord = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'ISSUE-1037-STAGE-ACTIVE'
    );

    expect(compatibilityProjection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'ISSUE-1037-STAGE-ACTIVE',
        display_state: 'In Progress'
      })
    ]);
    expect(sameIssueRecord?.payload.display_status).toBe('In Progress');
    expect(sameIssueRecord?.payload.running?.display_state).toBe('In Progress');
  });

  it('projects operator-visible workflow phase into running display state', async () => {
    const fixture = await createFixture({
      taskId: 'task-1037-stage-current',
      linearAdvisoryState: {
        tracked_issue: createTrackedIssue({
          id: 'issue-1037-stage',
          identifier: 'ISSUE-1037-STAGE',
          title: 'Review handoff pending merge',
          state: 'In Review',
          updated_at: '2026-03-07T00:29:45.000Z'
        })
      }
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-1037-stage-current',
      issue_id: 'issue-1037-stage',
      issue_identifier: 'ISSUE-1037-STAGE',
      status: 'in_progress',
      started_at: '2026-03-07T00:25:00.000Z',
      updated_at: '2026-03-07T00:29:00.000Z',
      summary: 'awaiting reviewer handoff'
    });
    await seedProviderLinearWorkerProof(fixture.paths, {
      issue_id: 'issue-1037-stage',
      issue_identifier: 'ISSUE-1037-STAGE',
      pid: '4242',
      turn_count: 3,
      last_event: 'turn/completed',
      last_message: 'turn completed (completed)',
      last_event_at: '2026-03-07T00:29:30.000Z',
      updated_at: '2026-03-07T00:29:30.000Z'
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const sameIssueRecord = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'ISSUE-1037-STAGE'
    );

    expect(compatibilityProjection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'ISSUE-1037-STAGE',
        display_state: 'In Review'
      })
    ]);
    expect(sameIssueRecord?.payload.display_status).toBe('In Review');
    expect(sameIssueRecord?.payload.running?.display_state).toBe('In Review');
  });

  it('does not let queued workflow states override an active running display state', async () => {
    const fixture = await createFixture({
      taskId: 'task-1037-stage-ready',
      linearAdvisoryState: {
        tracked_issue: createTrackedIssue({
          id: 'issue-1037-stage-ready',
          identifier: 'ISSUE-1037-STAGE-READY',
          title: 'Refresh lag still shows Ready',
          state: 'Ready',
          state_type: 'unstarted',
          updated_at: '2026-03-07T00:29:45.000Z'
        })
      }
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-1037-stage-ready',
      issue_id: 'issue-1037-stage-ready',
      issue_identifier: 'ISSUE-1037-STAGE-READY',
      status: 'in_progress',
      started_at: '2026-03-07T00:25:00.000Z',
      updated_at: '2026-03-07T00:29:00.000Z',
      summary: 'worker is still running'
    });
    await seedProviderLinearWorkerProof(fixture.paths, {
      issue_id: 'issue-1037-stage-ready',
      issue_identifier: 'ISSUE-1037-STAGE-READY',
      pid: '4343',
      turn_count: 2,
      last_event: 'turn/completed',
      last_message: 'turn completed (completed)',
      last_event_at: '2026-03-07T00:29:30.000Z',
      updated_at: '2026-03-07T00:29:30.000Z'
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const sameIssueRecord = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'ISSUE-1037-STAGE-READY'
    );

    expect(compatibilityProjection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'ISSUE-1037-STAGE-READY',
        display_state: 'in_progress'
      })
    ]);
    expect(sameIssueRecord?.payload.display_status).toBe('in_progress');
    expect(sameIssueRecord?.payload.running?.display_state).toBe('in_progress');
  });

  it('does not let custom unstarted state types override an active running display state', async () => {
    const fixture = await createFixture({
      taskId: 'task-1037-stage-custom-backlog',
      linearAdvisoryState: {
        tracked_issue: createTrackedIssue({
          id: 'issue-1037-stage-custom-backlog',
          identifier: 'ISSUE-1037-STAGE-CUSTOM-BACKLOG',
          title: 'Custom backlog label should not replace a live run',
          state: 'Queued Up',
          state_type: 'unstarted',
          updated_at: '2026-03-07T00:29:45.000Z'
        })
      }
    });

    await seedManifest(fixture.paths, {
      task_id: 'task-1037-stage-custom-backlog',
      issue_id: 'issue-1037-stage-custom-backlog',
      issue_identifier: 'ISSUE-1037-STAGE-CUSTOM-BACKLOG',
      status: 'in_progress',
      started_at: '2026-03-07T00:25:00.000Z',
      updated_at: '2026-03-07T00:29:00.000Z',
      summary: 'worker is still running'
    });
    await seedProviderLinearWorkerProof(fixture.paths, {
      issue_id: 'issue-1037-stage-custom-backlog',
      issue_identifier: 'ISSUE-1037-STAGE-CUSTOM-BACKLOG',
      pid: '4444',
      turn_count: 2,
      last_event: 'turn/completed',
      last_message: 'turn completed (completed)',
      last_event_at: '2026-03-07T00:29:30.000Z',
      updated_at: '2026-03-07T00:29:30.000Z'
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const sameIssueRecord = compatibilityProjection.issues.find(
      (issue) => issue.issueIdentifier === 'ISSUE-1037-STAGE-CUSTOM-BACKLOG'
    );

    expect(compatibilityProjection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'ISSUE-1037-STAGE-CUSTOM-BACKLOG',
        display_state: 'in_progress'
      })
    ]);
    expect(sameIssueRecord?.payload.display_status).toBe('in_progress');
    expect(sameIssueRecord?.payload.running?.display_state).toBe('in_progress');
  });

  it('excludes completed sibling telemetry from runtime rows and codex totals', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-telemetry-current'
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-telemetry-current',
        issue_identifier: 'ISSUE-TELEMETRY',
        started_at: '2026-03-07T00:10:00.000Z',
        updated_at: '2026-03-07T00:20:00.000Z'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-TELEMETRY',
        latest_session_id: 'thread-current-turn-2',
        turn_count: 2,
        last_message: 'current run active',
        last_event_at: '2026-03-07T00:20:00.000Z',
        tokens: {
          input_tokens: 21,
          output_tokens: 13,
          total_tokens: 34,
          reasoning_output_tokens: 9
        },
        updated_at: '2026-03-07T00:20:00.000Z'
      });

      const completedSibling = await createSiblingRun(fixture.root, 'task-telemetry-completed', 'run-2', {
        manifest: {
          task_id: 'task-telemetry-completed',
          issue_identifier: 'ISSUE-TELEMETRY-COMPLETED',
          status: 'succeeded',
          started_at: '2026-03-07T00:05:00.000Z',
          updated_at: '2026-03-07T00:15:00.000Z',
          completed_at: '2026-03-07T00:15:00.000Z'
        }
      });
      await seedProviderLinearWorkerProof(completedSibling, {
        issue_id: 'issue-completed',
        issue_identifier: 'ISSUE-TELEMETRY-COMPLETED',
        latest_session_id: 'thread-completed-turn-1',
        turn_count: 1,
        tokens: {
          input_tokens: 12,
          output_tokens: 8,
          total_tokens: 20,
          reasoning_output_tokens: 99
        },
        updated_at: '2026-03-07T00:15:00.000Z'
      });

      const runningSibling = await createSiblingRun(fixture.root, 'task-telemetry-running', 'run-3', {
        manifest: {
          task_id: 'task-telemetry-running',
          issue_identifier: 'ISSUE-TELEMETRY-RUNNING',
          status: 'in_progress',
          started_at: '2026-03-07T00:25:00.000Z',
          updated_at: '2026-03-07T00:29:00.000Z'
        }
      });
      await seedProviderLinearWorkerProof(runningSibling, {
        issue_id: 'issue-running',
        issue_identifier: 'ISSUE-TELEMETRY-RUNNING',
        latest_session_id: 'thread-running-turn-1',
        turn_count: 1,
        tokens: {
          input_tokens: 5,
          output_tokens: 3,
          total_tokens: 8,
          reasoning_output_tokens: 2
        },
        rate_limits: {
          limit_id: 'coding',
          primary: {
            remaining: 17
          }
        },
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            issue_identifier: 'ISSUE-TELEMETRY',
            session_id: 'thread-current-turn-2',
            turn_count: 2,
            tokens: {
              input_tokens: 21,
              output_tokens: 13,
              total_tokens: 34,
              reasoning_output_tokens: 9
            }
          }),
          expect.objectContaining({
            issue_identifier: 'ISSUE-TELEMETRY-RUNNING',
            session_id: 'thread-running-turn-1',
            turn_count: 1
          })
        ])
      );
      expect(compatibilityProjection.codexTotals).toEqual({
        input_tokens: 26,
        output_tokens: 16,
        total_tokens: 42,
        reasoning_output_tokens: 11,
        seconds_running: 1500
      });
      expect(compatibilityProjection.rateLimits).toEqual({
        limit_id: 'coding',
        primary: {
          remaining: 17
        }
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('filters historical in-progress manifests to active intake claims and keeps unavailable token totals null', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const providerIntakeState = createProviderIntakeState([
        {
          provider: 'linear',
          provider_key: 'linear:issue-current',
          issue_id: 'issue-current',
          issue_identifier: 'ISSUE-CURRENT',
          issue_title: 'Current selected issue',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-07T00:29:00.000Z',
          task_id: 'task-telemetry-current',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-07T00:20:00.000Z',
          updated_at: '2026-03-07T00:29:00.000Z',
          last_delivery_id: 'delivery-current',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_140_000,
          run_id: 'run-1',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-current'
        },
        {
          provider: 'linear',
          provider_key: 'linear:issue-active',
          issue_id: 'issue-active',
          issue_identifier: 'ISSUE-ACTIVE',
          issue_title: 'Other active issue',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-07T00:29:30.000Z',
          task_id: 'task-telemetry-active',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-07T00:28:00.000Z',
          updated_at: '2026-03-07T00:29:30.000Z',
          last_delivery_id: 'delivery-active',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_170_000,
          run_id: 'run-2',
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-active'
        }
      ]);
      providerIntakeState.polling = {
        linear_budget: {
          observed_at: '2026-03-07T00:29:45.000Z',
          source: 'control-host-polling',
          suppression: 'none',
          suppression_reason: null,
          retry_after_seconds: null,
          cooldown_until: null,
          cooldown_active: false,
          request_id: 'polling-1',
          requests: {
            remaining: 17,
            limit: 30,
            reset_at: '2026-03-07T00:30:42.000Z'
          },
          endpoint_requests: null,
          complexity: {
            remaining: 180,
            limit: 200,
            reset_at: '2026-03-07T00:30:07.000Z'
          },
          endpoint_complexity: null
        }
      };

      const fixture = await createFixture({
        taskId: 'task-telemetry-current',
        providerIntakeState
      });

      await seedManifest(fixture.paths, {
        task_id: 'task-telemetry-current',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:25:00.000Z'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        latest_session_id: 'session-current',
        turn_count: 2,
        tokens: {
          input_tokens: null,
          output_tokens: null,
          total_tokens: null
        },
        rate_limits: {
          source: 'legacy-proof'
        },
        linear_budget: {
          observed_at: '2026-03-07T00:25:00.000Z',
          source: 'worker-proof',
          suppression: 'none',
          suppression_reason: null,
          retry_after_seconds: null,
          cooldown_until: null,
          cooldown_active: false,
          request_id: 'worker-1',
          requests: {
            remaining: 4,
            limit: 30,
            reset_at: '2026-03-07T00:25:42.000Z'
          },
          endpoint_requests: null,
          complexity: null,
          endpoint_complexity: null
        },
        updated_at: '2026-03-07T00:25:00.000Z'
      });

      const activeSibling = await createSiblingRun(fixture.root, 'task-telemetry-active', 'run-2', {
        manifest: {
          task_id: 'task-telemetry-active',
          issue_id: 'issue-active',
          issue_identifier: 'ISSUE-ACTIVE',
          status: 'in_progress',
          started_at: '2026-03-07T00:28:00.000Z',
          updated_at: '2026-03-07T00:29:00.000Z'
        }
      });
      await seedProviderLinearWorkerProof(activeSibling, {
        issue_id: 'issue-active',
        issue_identifier: 'ISSUE-ACTIVE',
        latest_session_id: 'session-active',
        turn_count: 1,
        tokens: {
          input_tokens: null,
          output_tokens: null,
          total_tokens: null
        },
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      const staleSibling = await createSiblingRun(fixture.root, 'task-telemetry-stale', 'run-3', {
        manifest: {
          task_id: 'task-telemetry-stale',
          issue_id: 'issue-stale',
          issue_identifier: 'ISSUE-STALE',
          status: 'in_progress',
          started_at: '2026-03-07T00:00:00.000Z',
          updated_at: '2026-03-07T00:05:00.000Z'
        }
      });
      await seedProviderLinearWorkerProof(staleSibling, {
        issue_id: 'issue-stale',
        issue_identifier: 'ISSUE-STALE',
        latest_session_id: 'session-stale',
        turn_count: 99,
        tokens: {
          input_tokens: 500,
          output_tokens: 400,
          total_tokens: 900
        },
        rate_limits: {
          source: 'stale-proof'
        },
        updated_at: '2026-03-07T00:05:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.running.map((entry) => entry.issue_identifier)).toEqual([
        'ISSUE-CURRENT',
        'ISSUE-ACTIVE'
      ]);
      expect(compatibilityProjection.issues.find((issue) => issue.issueIdentifier === 'ISSUE-STALE')).toBeUndefined();
      expect(compatibilityProjection.codexTotals).toEqual({
        input_tokens: null,
        output_tokens: null,
        total_tokens: null,
        seconds_running: 720
      });
      expect(compatibilityProjection.rateLimits).toMatchObject({
        codex: {
          source: 'legacy-proof'
        },
        linear_budget: {
          observed_at: '2026-03-07T00:29:45.000Z',
          source: 'control-host-polling',
          suppression: 'none',
          suppression_reason: null,
          retry_after_seconds: null,
          cooldown_until: null,
          cooldown_active: false,
          request_id: 'polling-1',
          scope_kind: 'token',
          scope_key: 'legacy',
          viewer_id: null,
          workspace_id: null,
          token_fingerprints: [],
          requests: {
            remaining: 17,
            limit: 30,
            reset_at: '2026-03-07T00:30:42.000Z'
          },
          endpoint_requests: null,
          complexity: {
            remaining: 180,
            limit: 200,
            reset_at: '2026-03-07T00:30:07.000Z'
          },
          endpoint_complexity: null,
          endpoint_name: null,
          selected_endpoint_key: null,
          request_complexity: null,
          endpoints: {},
          reservations: [],
          reservations_active: 0
        }
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves codex rate limits when the same proof also carries worker proof linear budget', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-telemetry-budget'
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-telemetry-budget',
        issue_id: 'issue-budget',
        issue_identifier: 'ISSUE-BUDGET',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:00.000Z'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'issue-budget',
        issue_identifier: 'ISSUE-BUDGET',
        rate_limits: {
          source: 'legacy-proof'
        },
        linear_budget: {
          observed_at: '2026-03-07T00:29:00.000Z',
          source: 'worker-proof',
          suppression: 'none',
          suppression_reason: null,
          retry_after_seconds: null,
          cooldown_until: null,
          cooldown_active: false,
          request_id: 'worker-budget-1',
          requests: {
            remaining: 8,
            limit: 30,
            reset_at: '2026-03-07T00:30:42.000Z'
          },
          endpoint_requests: null,
          complexity: null,
          endpoint_complexity: null
        },
        updated_at: '2026-03-07T00:29:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.rateLimits).toEqual({
        codex: {
          source: 'legacy-proof'
        },
        linear_budget: {
          observed_at: '2026-03-07T00:29:00.000Z',
          source: 'worker-proof',
          suppression: 'none',
          suppression_reason: null,
          retry_after_seconds: null,
          cooldown_until: null,
          cooldown_active: false,
          request_id: 'worker-budget-1',
          requests: {
            remaining: 8,
            limit: 30,
            reset_at: '2026-03-07T00:30:42.000Z'
          },
          endpoint_requests: null,
          complexity: null,
          endpoint_complexity: null
        }
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps polling linear budget authoritative over newer legacy proof rate limits', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const providerIntakeState = createProviderIntakeState();
      providerIntakeState.polling = {
        linear_budget: {
          observed_at: '2026-03-07T00:29:45.000Z',
          source: 'control-host-polling',
          suppression: 'none',
          suppression_reason: null,
          retry_after_seconds: null,
          cooldown_until: null,
          cooldown_active: false,
          request_id: 'polling-1',
          requests: {
            remaining: 17,
            limit: 30,
            reset_at: '2026-03-07T00:30:42.000Z'
          },
          endpoint_requests: null,
          complexity: {
            remaining: 180,
            limit: 200,
            reset_at: '2026-03-07T00:30:07.000Z'
          },
          endpoint_complexity: null
        }
      };

      const fixture = await createFixture({
        taskId: 'task-telemetry-polling-budget',
        providerIntakeState
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-telemetry-polling-budget',
        issue_id: 'issue-budget',
        issue_identifier: 'ISSUE-BUDGET',
        started_at: '2026-03-07T00:20:00.000Z',
        updated_at: '2026-03-07T00:29:59.000Z'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'issue-budget',
        issue_identifier: 'ISSUE-BUDGET',
        rate_limits: {
          source: 'legacy-proof',
          requests: {
            remaining: 1,
            limit: 30,
            reset_at: '2026-03-07T00:31:00.000Z'
          }
        },
        updated_at: '2026-03-07T00:29:59.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.rateLimits).toMatchObject({
        codex: {
          source: 'legacy-proof',
          requests: {
            remaining: 1,
            limit: 30,
            reset_at: '2026-03-07T00:31:00.000Z'
          }
        },
        linear_budget: {
          observed_at: '2026-03-07T00:29:45.000Z',
          source: 'control-host-polling',
          suppression: 'none',
          suppression_reason: null,
          retry_after_seconds: null,
          cooldown_until: null,
          cooldown_active: false,
          request_id: 'polling-1',
          scope_kind: 'token',
          scope_key: 'legacy',
          viewer_id: null,
          workspace_id: null,
          token_fingerprints: [],
          requests: {
            remaining: 17,
            limit: 30,
            reset_at: '2026-03-07T00:30:42.000Z'
          },
          endpoint_requests: null,
          complexity: {
            remaining: 180,
            limit: 200,
            reset_at: '2026-03-07T00:30:07.000Z'
          },
          endpoint_complexity: null,
          endpoint_name: null,
          selected_endpoint_key: null,
          request_complexity: null,
          endpoints: {},
          reservations: [],
          reservations_active: 0
        }
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps runtime rows deduped by preferred same-issue source while telemetry retains all authoritative runtime activity', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'task-telemetry-selected'
      });
      await seedManifest(fixture.paths, {
        task_id: 'task-telemetry-selected',
        issue_identifier: 'ISSUE-TELEMETRY-SAME',
        started_at: '2026-03-07T00:00:00.000Z',
        updated_at: '2026-03-07T00:10:00.000Z'
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'issue-same',
        issue_identifier: 'ISSUE-TELEMETRY-SAME',
        latest_session_id: 'session-old',
        turn_count: 1,
        tokens: {
          input_tokens: 1,
          output_tokens: 2,
          total_tokens: 3
        },
        rate_limits: {
          source: 'old'
        },
        updated_at: '2026-03-07T00:10:00.000Z'
      });

      const restartedSibling = await createSiblingRun(fixture.root, 'task-telemetry-restarted', 'run-2', {
        manifest: {
          task_id: 'task-telemetry-restarted',
          issue_identifier: 'ISSUE-TELEMETRY-SAME',
          status: 'in_progress',
          started_at: '2026-03-07T00:20:00.000Z',
          updated_at: '2026-03-07T00:25:00.000Z'
        }
      });
      await seedProviderLinearWorkerProof(restartedSibling, {
        issue_id: 'issue-same',
        issue_identifier: 'ISSUE-TELEMETRY-SAME',
        latest_session_id: 'session-new',
        turn_count: 2,
        tokens: {
          input_tokens: 100,
          output_tokens: 200,
          total_tokens: 300
        },
        rate_limits: {
          source: 'new'
        },
        updated_at: '2026-03-07T00:25:00.000Z'
      });

      const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const sameIssue = compatibilityProjection.issues.find(
        (issue) => issue.issueIdentifier === 'ISSUE-TELEMETRY-SAME'
      );

      expect(compatibilityProjection.running).toEqual([
        expect.objectContaining({
          issue_identifier: 'ISSUE-TELEMETRY-SAME',
          session_id: 'session-new',
          turn_count: 2,
          tokens: {
            input_tokens: 100,
            output_tokens: 200,
            total_tokens: 300
          }
        })
      ]);
      expect(sameIssue?.payload.running).toMatchObject({
        issue_identifier: 'ISSUE-TELEMETRY-SAME',
        session_id: 'session-new',
        turn_count: 2,
        tokens: {
          input_tokens: 100,
          output_tokens: 200,
          total_tokens: 300
        }
      });
      expect(compatibilityProjection.codexTotals).toEqual({
        input_tokens: 101,
        output_tokens: 202,
        total_tokens: 303,
        seconds_running: 2400
      });
      expect(compatibilityProjection.rateLimits).toEqual({
        source: 'new'
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('invalidates the cached snapshot on publish', async () => {
    const fixture = await createFixture();
    const initialSnapshot = fixture.runtime.snapshot();

    await initialSnapshot.readSelectedRunSnapshot();
    await seedManifest(fixture.paths, {
      summary: 'published summary',
      updated_at: '2026-03-07T00:15:00.000Z'
    });
    fixture.controlStore.setLatestAction({
      action: 'pause',
      requestedBy: 'ui',
      reason: 'manual pause'
    });

    fixture.runtime.publish({ source: 'run.updated', eventSeq: 1 });

    const refreshedSnapshot = fixture.runtime.snapshot();
    const refreshedSelectedRun = await refreshedSnapshot.readSelectedRunSnapshot();

    expect(refreshedSnapshot).not.toBe(initialSnapshot);
    expect(refreshedSelectedRun.selected?.summary).toBe('published summary');
    expect(refreshedSelectedRun.selected?.displayStatus).toBe('paused');
    expect(refreshedSelectedRun.selected?.statusReason).toBe('control_pause');
  });

  it('refreshes the cached runtime after an accepted requestRefresh', async () => {
    const fixture = await createFixture();

    await fixture.runtime.snapshot().readSelectedRunSnapshot();
    await seedManifest(fixture.paths, {
      summary: 'refreshed summary',
      updated_at: '2026-03-07T00:20:00.000Z'
    });
    fixture.controlStore.setLatestAction({
      action: 'pause',
      requestedBy: 'ui',
      reason: 'manual pause'
    });

    await fixture.runtime.requestRefresh();
    const refreshedSelectedRun = await fixture.runtime.snapshot().readSelectedRunSnapshot();

    expect(refreshedSelectedRun.selected?.summary).toBe('refreshed summary');
    expect(refreshedSelectedRun.selected?.displayStatus).toBe('paused');
    expect(refreshedSelectedRun.selected?.statusReason).toBe('control_pause');
  });

  it('keeps selected-run dispatch summaries aligned after requestRefresh invalidates live advisory caches', async () => {
    const fixture = await createFixture({
      taskId: 'task-1024',
      featureToggles: buildLiveLinearDispatchPilot(),
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
    const realFetch = globalThis.fetch;

    vi.stubGlobal('fetch', async (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      if (url.toString() === 'https://api.linear.app/graphql') {
        return buildLiveLinearGraphqlResponse();
      }
      return realFetch(input, init);
    });

    const initialSnapshot = fixture.runtime.snapshot();
    const initialDispatch = await initialSnapshot.readDispatchEvaluation();

    expect(initialDispatch.evaluation.summary.reason).not.toBe('dispatch_source_live_deferred');

    await seedManifest(fixture.paths, {
      summary: 'refreshed summary',
      updated_at: '2026-03-07T00:20:00.000Z'
    });

    await fixture.runtime.requestRefresh();
    const refreshedSnapshot = fixture.runtime.snapshot();
    const refreshedSelectedRun = await refreshedSnapshot.readSelectedRunSnapshot();
    const refreshedDispatch = await refreshedSnapshot.readDispatchEvaluation();

    expect(refreshedSelectedRun.selected?.summary).toBe('refreshed summary');
    expect(refreshedSelectedRun.dispatchPilot?.reason).toBe('dispatch_source_live_deferred');
    expect(refreshedDispatch.evaluation.summary.reason).toBe('recommendation_available');
  });

  it('preserves the previous cached snapshot when accepted refresh warmup fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'control-runtime-'));
    cleanupRoots.push(root);

    const env = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1023'
    };
    const paths = resolveRunPaths(env, 'run-1');
    let snapshotCalls = 0;
    const controlStore = {
      snapshot() {
        snapshotCalls += 1;
        if (snapshotCalls >= 5) {
          throw new Error('snapshot warmup failed');
        }
        return {
          run_id: 'run-1',
          control_seq: 0,
          latest_action: null,
          feature_toggles: null,
          transport_mutation: null
        };
      }
    };

    await mkdir(paths.runDir, { recursive: true });
    await seedManifest(paths, {
      summary: 'initial summary',
      updated_at: '2026-03-07T00:00:00.000Z'
    });

    const runtime = createControlRuntime({
      controlStore,
      questionQueue: { list: () => [] },
      paths,
      linearAdvisoryState: { tracked_issue: null },
      env
    });

    const initialSnapshot = runtime.snapshot();
    const initialSelectedRun = await initialSnapshot.readSelectedRunSnapshot();
    await seedManifest(paths, {
      summary: 'should stay hidden',
      updated_at: '2026-03-07T00:30:00.000Z'
    });

    await expect(runtime.requestRefresh()).rejects.toThrow(
      'snapshot warmup failed'
    );

    const repeatedSnapshot = runtime.snapshot();
    const repeatedSelectedRun = await repeatedSnapshot.readSelectedRunSnapshot();

    expect(repeatedSnapshot).toBe(initialSnapshot);
    expect(initialSelectedRun.selected?.summary).toBe('initial summary');
    expect(repeatedSelectedRun.selected?.summary).toBe('initial summary');
  });

  it('single-flights explicit dispatch reads and invalidates the advisory cache on publish', async () => {
    const fixture = await createFixture({
      taskId: 'task-1024',
      featureToggles: buildLiveLinearDispatchPilot(),
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
    const realFetch = globalThis.fetch;
    let linearFetchCount = 0;

    vi.stubGlobal('fetch', async (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      if (url.toString() === 'https://api.linear.app/graphql') {
        linearFetchCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return buildLiveLinearGraphqlResponse();
      }
      return realFetch(input, init);
    });

    const snapshot = fixture.runtime.snapshot();
    const [firstDispatch, secondDispatch] = await Promise.all([
      snapshot.readDispatchEvaluation(),
      snapshot.readDispatchEvaluation()
    ]);

    expect(firstDispatch.evaluation.failure ?? null).toBeNull();
    expect(secondDispatch.evaluation.failure ?? null).toBeNull();
    expect(linearFetchCount).toBe(1);

    fixture.runtime.publish({ source: 'run.updated', eventSeq: 1 });

    const refreshedSnapshot = fixture.runtime.snapshot();
    const [thirdDispatch, fourthDispatch] = await Promise.all([
      refreshedSnapshot.readDispatchEvaluation(),
      refreshedSnapshot.readDispatchEvaluation()
    ]);

    expect(thirdDispatch.evaluation.failure ?? null).toBeNull();
    expect(fourthDispatch.evaluation.failure ?? null).toBeNull();
    expect(linearFetchCount).toBe(2);
  });

  it('does not fall back to the selected run identifier when dispatch evaluation has no tracked issue or recommendation identifier', async () => {
    vi.spyOn(liveLinearAdvisoryRuntimeModule, 'createLiveLinearAdvisoryRuntime').mockImplementation(
      () =>
        ({
          readSnapshotSummary: () => ({
            advisory_only: true,
            configured: true,
            enabled: false,
            kill_switch: false,
            status: 'disabled',
            source_status: 'disabled',
            reason: 'pilot_disabled_default_off',
            source_setup: null
          }),
          readDispatchEvaluation: async () => ({
            summary: {
              advisory_only: true,
              configured: true,
              enabled: false,
              kill_switch: false,
              status: 'disabled',
              source_status: 'disabled',
              reason: 'pilot_disabled_default_off',
              source_setup: null
            },
            recommendation: null,
            failure: null
          }),
          invalidate: () => {}
        }) satisfies ReturnType<typeof liveLinearAdvisoryRuntimeModule.createLiveLinearAdvisoryRuntime>
    );

    const fixture = await createFixture({
      taskId: 'task-1024-no-dispatch-issue'
    });

    const dispatch = await fixture.runtime.snapshot().readDispatchEvaluation();

    expect(dispatch.issueIdentifier).toBeNull();
    expect(dispatch.evaluation.recommendation).toBeNull();
  });

  it('retries explicit dispatch reads after a transient live evaluation failure on the same snapshot', async () => {
    let dispatchReadCount = 0;
    vi.spyOn(liveLinearAdvisoryRuntimeModule, 'createLiveLinearAdvisoryRuntime').mockImplementation(
      () =>
        ({
          readSnapshotSummary: () => ({
            advisory_only: true,
            configured: true,
            enabled: true,
            kill_switch: false,
            status: 'ready',
            source_status: 'ready',
            reason: 'dispatch_source_live_deferred',
            source_setup: {
              provider: 'linear',
              workspace_id: 'lin-workspace-1',
              team_id: 'lin-team-live',
              project_id: 'lin-project-1'
            }
          }),
          readDispatchEvaluation: async () => {
            dispatchReadCount += 1;
            if (dispatchReadCount === 1) {
              throw new Error('transient linear failure');
            }
            return {
              summary: {
                advisory_only: true,
                configured: true,
                enabled: true,
                kill_switch: false,
                status: 'ready',
                source_status: 'ready',
                reason: 'recommendation_available',
                source_setup: {
                  provider: 'linear',
                  workspace_id: 'lin-workspace-1',
                  team_id: 'lin-team-live',
                  project_id: 'lin-project-1'
                }
              },
              recommendation: {
                issue_identifier: 'task-1024-retry',
                dispatch_id: 'dispatch-advisory',
                summary: 'route advisory to queue',
                rationale: 'signal threshold met',
                confidence: 0.7,
                generated_at: null,
                source_setup: {
                  provider: 'linear',
                  workspace_id: 'lin-workspace-1',
                  team_id: 'lin-team-live',
                  project_id: 'lin-project-1'
                },
                tracked_issue: null
              },
              failure: null
            };
          },
          invalidate: () => {}
        }) satisfies ReturnType<typeof liveLinearAdvisoryRuntimeModule.createLiveLinearAdvisoryRuntime>
    );

    const fixture = await createFixture({
      taskId: 'task-1024-retry'
    });

    const snapshot = fixture.runtime.snapshot();

    await expect(snapshot.readDispatchEvaluation()).rejects.toThrow('transient linear failure');

    const recoveredDispatch = await snapshot.readDispatchEvaluation();

    expect(recoveredDispatch.evaluation.failure ?? null).toBeNull();
    expect(recoveredDispatch.evaluation.summary.reason).toBe('recommendation_available');
    expect(dispatchReadCount).toBe(2);
  });

  it('surfaces provider intake state and follows the handed-off child run manifest when present', async () => {
    const root = await mkdtemp(join(tmpdir(), 'control-runtime-provider-intake-'));
    cleanupRoots.push(root);
    const env = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'local-mcp'
    };
    const paths = resolveRunPaths(env, 'run-1');
    await mkdir(paths.runDir, { recursive: true });
    await seedManifest(paths, {
      task_id: 'local-mcp',
      summary: 'control host'
    });
    const childManifestPath = join(root, '.runs', 'task-1303-child', 'cli', 'run-child', 'manifest.json');
    const controlStore = new ControlStateStore({ runId: 'run-1' });
    const runtime = createControlRuntime({
      controlStore,
      questionQueue: { list: () => [] },
      paths,
      linearAdvisoryState: { tracked_issue: null },
      providerIntakeState: {
        schema_version: 1,
        updated_at: '2026-03-19T04:10:00.000Z',
        rehydrated_at: '2026-03-19T04:10:00.000Z',
        latest_provider_key: 'linear:lin-issue-1',
        latest_reason: 'provider_issue_rehydrated_active_run',
        claims: [
          {
            provider: 'linear',
            provider_key: 'linear:lin-issue-1',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-2',
            issue_title: 'Autonomous intake handoff',
            issue_state: 'In Progress',
            issue_state_type: 'started',
            issue_updated_at: '2026-03-19T04:09:00.000Z',
            task_id: 'task-1303-child',
            mapping_source: 'provider_id_fallback',
            state: 'running',
            reason: 'provider_issue_rehydrated_active_run',
            accepted_at: '2026-03-19T04:09:30.000Z',
            updated_at: '2026-03-19T04:10:00.000Z',
            last_delivery_id: 'delivery-1',
            last_event: 'Issue',
            last_action: 'update',
            last_webhook_timestamp: 1_742_360_000_000,
            run_id: 'run-child',
            run_manifest_path: childManifestPath
          }
        ]
      }
    });

    await createSiblingRun(root, 'task-1303-child', 'run-child', {
      manifest: {
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        provider_control_host_task_id: 'local-mcp',
        provider_control_host_run_id: 'run-1',
        status: 'in_progress',
        summary: 'child run is active'
      }
    });

    const snapshot = await runtime.snapshot().readSelectedRunSnapshot();

    expect(snapshot.selected?.issueIdentifier).toBe('CO-2');
    expect(snapshot.selected?.taskId).toBe('task-1303-child');
    expect(snapshot.selected?.runId).toBe('run-child');
    expect(snapshot.providerIntake).toMatchObject({
      summary_scope: 'single_claim',
      active_claim_count: 1,
      running_claim_count: 1,
      selected_claim: {
        issue_identifier: 'CO-2',
        task_id: 'task-1303-child',
        state: 'running',
        run_id: 'run-child'
      }
    });
  });

  it('fails closed with an unavailable reason when persisted provider intake authority cannot be read', async () => {
    const providerIntakeState = createProviderIntakeState([
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-424',
        issue_id: 'lin-issue-424',
        issue_identifier: 'CO-424',
        issue_title: 'Stale selected claim',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-05-01T02:10:00.000Z',
        task_id: 'linear-co-424-stale',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'stale cached provider-intake summary',
        accepted_at: '2026-05-01T02:09:46.790Z',
        updated_at: '2026-05-01T02:10:46.790Z',
        last_delivery_id: 'delivery-424',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_746_067_846_790,
        run_id: 'stale-provider-run',
        run_manifest_path: '/tmp/stale-provider-run/manifest.json',
        launch_source: 'control-host',
        launch_token: 'launch-424'
      }
    ]);
    const fixture = await createFixture({
      taskId: 'local-mcp',
      providerIntakeState,
      linearAdvisoryState: {
        tracked_issue: createTrackedIssue({
          id: 'lin-issue-424',
          identifier: 'CO-424',
          title: 'Stale advisory selected claim',
          updated_at: '2026-05-01T02:10:00.000Z'
        })
      },
      readPersistedProviderIntakeState: () => {
        throw new Error('provider-intake-state.json unreadable');
      }
    });
    const staleRunDir = join(fixture.root, '.runs', 'linear-co-424-stale', 'cli', 'stale-provider-run');
    await mkdir(staleRunDir, { recursive: true });
    await writeFile(
      join(staleRunDir, 'manifest.json'),
      JSON.stringify({
        run_id: 'stale-provider-run',
        task_id: 'linear-co-424-stale',
        status: 'in_progress',
        started_at: '2026-05-01T02:09:46.790Z',
        updated_at: '2026-05-01T02:10:46.790Z',
        completed_at: null,
        summary: 'Stale selected claim',
        issue_provider: 'linear',
        issue_id: 'lin-issue-424',
        issue_identifier: 'CO-424'
      }),
      'utf8'
    );

    const projection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const statePayload = await readCompatibilityState({
      readCompatibilityProjection: async () => projection
    });
    const uiDataset = buildUiDataset({
      projection,
      generatedAt: '2026-05-01T02:41:32.000Z'
    });

    expect(projection.providerIntake).toBeNull();
    expect(projection.selected?.issue_identifier).toBe('local-mcp');
    expect(projection.running.map((entry) => entry.issue_identifier)).not.toContain('CO-424');
    expect(projection.tracked).toBeNull();
    expect(projection.providerIntakeUnavailable).toEqual({
      reason: 'raw_provider_intake_read_failed',
      updated_at: null
    });
    expect(statePayload.provider_intake).toBeNull();
    expect(statePayload.running_ids).not.toContain('CO-424');
    expect(statePayload.tracked).toBeUndefined();
    expect(statePayload.selected?.issue_identifier).toBe('local-mcp');
    expect(statePayload.selected?.display_status).toBe('in_progress');
    expect(statePayload.selected?.latest_event?.source).toBe('run_summary');
    expect(statePayload.selected?.tracked.linear).toBeNull();
    expect(statePayload.selected?.provider_debug_snapshot?.live_linear_state).toEqual({
      state: null,
      state_type: null,
      updated_at: null
    });
    expect(statePayload.provider_intake_unavailable).toEqual({
      reason: 'raw_provider_intake_read_failed',
      updated_at: null
    });
    expect(uiDataset.provider_intake).toBeNull();
    expect(uiDataset.running.map((entry) => entry.issue_identifier)).not.toContain('CO-424');
    expect(uiDataset.tracked).toBeUndefined();
    expect(uiDataset.selected_issue_identifier).toBe('local-mcp');
    expect(uiDataset.selected?.display_status).toBe('in_progress');
    expect(uiDataset.selected?.latest_event?.source).toBe('run_summary');
    expect(uiDataset.selected?.tracked.linear).toBeNull();
    expect(uiDataset.selected?.provider_debug_snapshot?.live_linear_state).toEqual({
      state: null,
      state_type: null,
      updated_at: null
    });
    expect(uiDataset.provider_intake_unavailable).toEqual({
      reason: 'raw_provider_intake_read_failed',
      updated_at: null
    });
  });

  it('keeps explicitly identified null-provider linear-looking task ids visible when raw intake is unavailable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T02:41:32.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'local-mcp',
        readPersistedProviderIntakeState: () => null
      });
      await createSiblingRun(fixture.root, 'linear-custom-background-run', 'run-null-provider', {
        manifest: {
          issue_identifier: 'ISSUE-NULL-PROVIDER',
          status: 'in_progress',
          started_at: '2026-05-01T02:39:00.000Z',
          updated_at: '2026-05-01T02:40:30.000Z',
          summary: 'explicit null-provider run with a linear-looking task id'
        }
      });

      const projection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const statePayload = await readCompatibilityState({
        readCompatibilityProjection: async () => projection
      });
      const uiDataset = buildUiDataset({
        projection,
        generatedAt: '2026-05-01T02:41:32.000Z'
      });

      expect(projection.providerIntake).toBeNull();
      expect(projection.providerIntakeUnavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(projection.running.map((entry) => entry.issue_identifier)).toContain(
        'ISSUE-NULL-PROVIDER'
      );
      expect(statePayload.running_ids).toContain('ISSUE-NULL-PROVIDER');
      expect(uiDataset.running.map((entry) => entry.issue_identifier)).toContain(
        'ISSUE-NULL-PROVIDER'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('suppresses proof-bearing advisory-rebound rows when raw intake is unavailable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T02:41:32.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'local-mcp',
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-424',
            identifier: 'CO-424',
            title: 'Stale advisory provider worker issue',
            updated_at: '2026-05-01T02:10:46.790Z'
          })
        },
        readPersistedProviderIntakeState: () => null
      });
      await seedProviderLinearWorkerProof(fixture.paths, {
        issue_id: 'lin-issue-424',
        issue_identifier: 'CO-424',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_running',
        last_message: 'stale provider worker proof',
        last_event_at: '2026-05-01T02:40:30.000Z',
        updated_at: '2026-05-01T02:40:30.000Z'
      });

      const projection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const statePayload = await readCompatibilityState({
        readCompatibilityProjection: async () => projection
      });
      const uiDataset = buildUiDataset({
        projection,
        generatedAt: '2026-05-01T02:41:32.000Z'
      });

      expect(projection.providerIntake).toBeNull();
      expect(projection.providerIntakeUnavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(projection.selected).toBeNull();
      expect(projection.running.map((entry) => entry.issue_identifier)).not.toContain('CO-424');
      expect(statePayload.selected).toBeNull();
      expect(statePayload.running_ids).not.toContain('CO-424');
      expect(uiDataset.selected_issue_identifier).toBeNull();
      expect(uiDataset.running.map((entry) => entry.issue_identifier)).not.toContain('CO-424');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not fill partial explicit proof identities from advisory when raw intake is unavailable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T02:41:32.000Z'));
    try {
      const issueIdOnly = await createFixture({
        taskId: 'local-mcp',
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-424',
            identifier: 'CO-424',
            title: 'Stale advisory provider worker issue',
            updated_at: '2026-05-01T02:10:46.790Z'
          })
        },
        readPersistedProviderIntakeState: () => null
      });
      await seedManifest(issueIdOnly.paths, {
        task_id: 'local-mcp',
        issue_id: 'issue-explicit-id-only',
        updated_at: '2026-05-01T02:40:30.000Z'
      });
      await seedProviderLinearWorkerProof(issueIdOnly.paths, {
        issue_id: 'issue-explicit-id-only',
        issue_identifier: 'CO-424',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_running',
        last_message: 'stale provider worker proof',
        last_event_at: '2026-05-01T02:40:30.000Z',
        updated_at: '2026-05-01T02:40:30.000Z'
      });

      const issueIdOnlyProjection = await issueIdOnly.runtime.snapshot().readCompatibilityProjection();
      const issueIdOnlyStatePayload = await readCompatibilityState({
        readCompatibilityProjection: async () => issueIdOnlyProjection
      });
      const issueIdOnlyUiDataset = buildUiDataset({
        projection: issueIdOnlyProjection,
        generatedAt: '2026-05-01T02:41:32.000Z'
      });

      expect(issueIdOnlyProjection.providerIntake).toBeNull();
      expect(issueIdOnlyProjection.selected?.issue_identifier).toBe('local-mcp');
      expect(issueIdOnlyProjection.running.map((entry) => entry.issue_identifier)).not.toContain(
        'CO-424'
      );
      expect(issueIdOnlyStatePayload.selected?.issue_identifier).toBe('local-mcp');
      expect(issueIdOnlyStatePayload.running_ids).not.toContain('CO-424');
      expect(issueIdOnlyUiDataset.selected_issue_identifier).toBe('local-mcp');
      expect(issueIdOnlyUiDataset.running.map((entry) => entry.issue_identifier)).not.toContain(
        'CO-424'
      );

      const issueIdentifierOnly = await createFixture({
        taskId: 'local-mcp',
        linearAdvisoryState: {
          tracked_issue: createTrackedIssue({
            id: 'lin-issue-424',
            identifier: 'CO-424',
            title: 'Stale advisory provider worker issue',
            updated_at: '2026-05-01T02:10:46.790Z'
          })
        },
        readPersistedProviderIntakeState: () => null
      });
      await seedManifest(issueIdentifierOnly.paths, {
        task_id: 'local-mcp',
        issue_identifier: 'CO-424',
        updated_at: '2026-05-01T02:40:30.000Z'
      });
      await seedProviderLinearWorkerProof(issueIdentifierOnly.paths, {
        issue_id: 'lin-issue-424',
        issue_identifier: 'CO-424',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        last_event: 'turn_running',
        last_message: 'stale provider worker proof',
        last_event_at: '2026-05-01T02:40:30.000Z',
        updated_at: '2026-05-01T02:40:30.000Z'
      });

      const issueIdentifierOnlyProjection =
        await issueIdentifierOnly.runtime.snapshot().readCompatibilityProjection();
      const issueIdentifierOnlyStatePayload = await readCompatibilityState({
        readCompatibilityProjection: async () => issueIdentifierOnlyProjection
      });
      const issueIdentifierOnlyUiDataset = buildUiDataset({
        projection: issueIdentifierOnlyProjection,
        generatedAt: '2026-05-01T02:41:32.000Z'
      });

      expect(issueIdentifierOnlyProjection.providerIntake).toBeNull();
      expect(issueIdentifierOnlyProjection.selected?.issue_identifier).toBe('CO-424');
      expect(issueIdentifierOnlyProjection.selected?.issue_id).not.toBe('lin-issue-424');
      expect(issueIdentifierOnlyStatePayload.selected?.issue_identifier).toBe('CO-424');
      expect(issueIdentifierOnlyStatePayload.selected?.issue_id).not.toBe('lin-issue-424');
      expect(issueIdentifierOnlyUiDataset.selected_issue_identifier).toBe('CO-424');
      expect(issueIdentifierOnlyUiDataset.selected?.issue_id).not.toBe('lin-issue-424');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps proof-bearing explicit null-provider rows visible when raw intake is unavailable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T02:41:32.000Z'));
    try {
      const fixture = await createFixture({
        taskId: 'local-mcp',
        readPersistedProviderIntakeState: () => null
      });
      const proofRun = await createSiblingRun(fixture.root, 'task-proof-null-provider', 'run-proof', {
        manifest: {
          issue_id: 'issue-null-proof',
          issue_identifier: 'ISSUE-NULL-PROOF',
          status: 'in_progress',
          started_at: '2026-05-01T02:39:00.000Z',
          updated_at: '2026-05-01T02:40:30.000Z',
          summary: 'explicit null-provider run with provider worker proof'
        }
      });
      await seedProviderLinearWorkerProof(proofRun, {
        issue_id: 'issue-null-proof',
        issue_identifier: 'ISSUE-NULL-PROOF',
        updated_at: '2026-05-01T02:40:30.000Z'
      });

      const projection = await fixture.runtime.snapshot().readCompatibilityProjection();
      const statePayload = await readCompatibilityState({
        readCompatibilityProjection: async () => projection
      });
      const uiDataset = buildUiDataset({
        projection,
        generatedAt: '2026-05-01T02:41:32.000Z'
      });

      expect(projection.providerIntake).toBeNull();
      expect(projection.providerIntakeUnavailable).toEqual({
        reason: 'raw_provider_intake_unavailable',
        updated_at: null
      });
      expect(projection.running.map((entry) => entry.issue_identifier)).toContain(
        'ISSUE-NULL-PROOF'
      );
      expect(statePayload.running_ids).toContain('ISSUE-NULL-PROOF');
      expect(uiDataset.running.map((entry) => entry.issue_identifier)).toContain(
        'ISSUE-NULL-PROOF'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves the accepted Linear advisory fallback after duplicate delivery when raw intake is unavailable', async () => {
    const fixture = await createFixture({
      taskId: 'local-mcp',
      linearAdvisoryState: {
        latest_accepted_at: '2026-05-01T02:40:00.000Z',
        latest_delivery_id: 'delivery-accepted',
        latest_result: 'duplicate',
        seen_deliveries: [
          {
            delivery_id: 'delivery-accepted',
            outcome: 'accepted'
          }
        ],
        tracked_issue: createTrackedIssue({
          id: 'lin-issue-459',
          identifier: 'CO-459',
          title: 'Fresh raw provider intake truth',
          updated_at: '2026-05-01T02:40:00.000Z'
        })
      },
      readPersistedProviderIntakeState: () => null
    });

    const projection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const statePayload = await readCompatibilityState({
      readCompatibilityProjection: async () => projection
    });
    const uiDataset = buildUiDataset({
      projection,
      generatedAt: '2026-05-01T02:41:32.000Z'
    });

    expect(projection.providerIntake).toBeNull();
    expect(projection.providerIntakeUnavailable).toEqual({
      reason: 'raw_provider_intake_unavailable',
      updated_at: null
    });
    expect(projection.tracked?.linear?.identifier).toBe('CO-459');
    expect(statePayload.provider_intake).toBeNull();
    expect(statePayload.tracked?.linear?.identifier).toBe('CO-459');
    expect(uiDataset.provider_intake).toBeNull();
    expect(uiDataset.tracked?.linear?.identifier).toBe('CO-459');
  });

  it('serializes concurrent running provider intake as a scoped selected claim with aggregate counts', async () => {
    const providerIntakeState = createProviderIntakeState([
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-175',
        issue_id: 'lin-issue-175',
        issue_identifier: 'CO-175',
        issue_title: 'Claim one',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-18T06:09:00.000Z',
        task_id: 'linear-co-175',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-04-18T06:09:05.000Z',
        updated_at: '2026-04-18T06:09:30.000Z',
        last_delivery_id: 'delivery-175',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_744_960_570_000,
        run_id: 'run-175',
        run_manifest_path: '/tmp/run-175/manifest.json',
        retry_queued: true,
        retry_attempt: 2,
        retry_due_at: '2026-04-18T06:10:30.000Z',
        retry_error: 'selected-claim retry detail',
        launch_source: 'control-host',
        launch_token: 'launch-175'
      },
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-240',
        issue_id: 'lin-issue-240',
        issue_identifier: 'CO-240',
        issue_title: 'Claim two',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-18T06:08:00.000Z',
        task_id: 'linear-co-240',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-04-18T06:08:05.000Z',
        updated_at: '2026-04-18T06:08:30.000Z',
        last_delivery_id: 'delivery-240',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_744_960_510_000,
        run_id: 'run-240',
        run_manifest_path: '/tmp/run-240/manifest.json',
        launch_source: 'control-host',
        launch_token: 'launch-240'
      },
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-242',
        issue_id: 'lin-issue-242',
        issue_identifier: 'CO-242',
        issue_title: 'Claim three',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-18T06:07:00.000Z',
        task_id: 'linear-co-242',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-04-18T06:07:05.000Z',
        updated_at: '2026-04-18T06:07:30.000Z',
        last_delivery_id: 'delivery-242',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_744_960_450_000,
        run_id: 'run-242',
        run_manifest_path: '/tmp/run-242/manifest.json',
        launch_source: 'control-host',
        launch_token: 'launch-242'
      }
    ]);
    providerIntakeState.updated_at = '2026-04-18T06:10:00.000Z';
    providerIntakeState.rehydrated_at = null;
    providerIntakeState.latest_provider_key = 'linear:lin-issue-175';
    providerIntakeState.latest_reason = 'provider_issue_rehydrated_active_run';

    const fixture = await createFixture({
      taskId: 'local-mcp',
      providerIntakeState
    });

    const projection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const statePayload = await readCompatibilityState({
      readCompatibilityProjection: async () => projection
    });

    expect(projection.providerIntake).toMatchObject({
      summary_scope: 'selected_claim',
      selection_strategy: 'state_rank_updated_at',
      claim_count: 3,
      active_claim_count: 3,
      running_claim_count: 3,
      active_issue_identifiers: ['CO-175', 'CO-240', 'CO-242'],
      running_issue_identifiers: ['CO-175', 'CO-240', 'CO-242'],
      selected_claim: {
        issue_identifier: 'CO-175',
        task_id: 'linear-co-175',
        state: 'running',
        retry: {
          active: true,
          attempt: 2,
          due_at: '2026-04-18T06:10:30.000Z',
          error: 'selected-claim retry detail'
        }
      }
    });
    expect(statePayload.provider_intake).toEqual({
      summary_scope: 'selected_claim',
      selection_strategy: 'state_rank_updated_at',
      claim_count: 3,
      active_claim_count: 3,
      running_claim_count: 3,
      active_issue_identifiers: ['CO-175', 'CO-240', 'CO-242'],
      running_issue_identifiers: ['CO-175', 'CO-240', 'CO-242'],
      selected_claim: {
        issue_identifier: 'CO-175',
        task_id: 'linear-co-175',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        run_id: 'run-175',
        freshness: 'rehydrated',
        retry: {
          active: true,
          attempt: 2,
          due_at: '2026-04-18T06:10:30.000Z',
          error: 'selected-claim retry detail'
        },
        worker_host: null
      },
      rehydrated_at: null,
      is_rehydrated: true,
      updated_at: '2026-04-18T06:10:00.000Z'
    });
  });

  it('keeps accepted no-run pending-revalidation claims active but not running in status and UI payloads', async () => {
    const providerIntakeState = createProviderIntakeState([
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-399',
        issue_id: 'lin-issue-399',
        issue_identifier: 'CO-399',
        issue_title: 'Running claim one',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-28T03:20:00.000Z',
        task_id: 'linear-co-399',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-04-28T03:20:05.000Z',
        updated_at: '2026-04-28T03:20:30.000Z',
        last_delivery_id: 'delivery-399',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_745_810_400_000,
        run_id: 'run-399',
        run_manifest_path: '/tmp/run-399/manifest.json',
        launch_source: 'control-host',
        launch_token: 'launch-399'
      },
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-403',
        issue_id: 'lin-issue-403',
        issue_identifier: 'CO-403',
        issue_title: 'Running claim two',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-28T03:21:00.000Z',
        task_id: 'linear-co-403',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-04-28T03:21:05.000Z',
        updated_at: '2026-04-28T03:21:30.000Z',
        last_delivery_id: 'delivery-403',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_745_810_460_000,
        run_id: 'run-403',
        run_manifest_path: '/tmp/run-403/manifest.json',
        launch_source: 'control-host',
        launch_token: 'launch-403'
      },
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-406',
        issue_id: 'lin-issue-406',
        issue_identifier: 'CO-406',
        issue_title: 'Accepted no-run recover claim',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-28T03:29:00.000Z',
        task_id: 'linear-co-406',
        mapping_source: 'provider_id_fallback',
        state: 'accepted',
        reason: 'provider_issue_rehydration_pending_revalidation',
        accepted_at: '2026-04-28T03:29:05.000Z',
        updated_at: '2026-04-28T03:29:30.000Z',
        last_delivery_id: 'delivery-406',
        last_event: 'Issue',
        last_action: 'recover',
        last_webhook_timestamp: 1_745_810_940_000,
        run_id: null,
        run_manifest_path: null,
        launch_source: null,
        launch_token: null
      }
    ]);
    providerIntakeState.updated_at = '2026-04-28T03:30:00.000Z';
    providerIntakeState.rehydrated_at = null;
    providerIntakeState.latest_provider_key = 'linear:lin-issue-406';
    providerIntakeState.latest_reason = 'provider_issue_rehydration_pending_revalidation';

    const fixture = await createFixture({
      taskId: 'local-mcp',
      featureToggles: {
        coordinator: {
          agent: {
            max_concurrent_agents: 3
          }
        }
      },
      providerIntakeState
    });

    const projection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const statePayload = await readCompatibilityState({
      readCompatibilityProjection: async () => projection
    });
    const uiDataset = buildUiDataset({
      projection,
      generatedAt: '2026-04-28T03:30:00.000Z'
    });

    expect(projection.providerIntake).toMatchObject({
      claim_count: 3,
      active_claim_count: 3,
      running_claim_count: 2,
      active_issue_identifiers: ['CO-403', 'CO-399', 'CO-406'],
      running_issue_identifiers: ['CO-403', 'CO-399'],
      selected_claim: {
        issue_identifier: 'CO-403',
        state: 'running'
      }
    });
    expect(projection.running.map((entry) => entry.issue_identifier)).not.toContain('CO-406');
    expect(projection.providerIntake?.active_issue_identifiers).toContain('CO-406');
    expect(statePayload.provider_intake).toMatchObject({
      active_claim_count: 3,
      running_claim_count: 2,
      active_issue_identifiers: ['CO-403', 'CO-399', 'CO-406'],
      running_issue_identifiers: ['CO-403', 'CO-399']
    });
    expect(uiDataset.provider_intake).toMatchObject({
      active_claim_count: 3,
      running_claim_count: 2,
      active_issue_identifiers: ['CO-403', 'CO-399', 'CO-406'],
      running_issue_identifiers: ['CO-403', 'CO-399']
    });
    expect(uiDataset.counts.max_allowed).toBe(3);
    expect(uiDataset.running.map((entry) => entry.issue_identifier)).not.toContain('CO-406');
  });

  it('surfaces provider polling health through compatibility projections when a provider handoff is registered', async () => {
    const fixture = await createFixture();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {}),
      refresh: vi.fn(async () => {})
    } as unknown as ProviderIssueHandoffService;

    initializeProviderPollingHealth(providerIssueHandoff, { intervalMs: 15000 });
    markProviderPollingStarted(providerIssueHandoff, {
      mode: 'poll',
      atMs: Date.parse('2026-03-07T00:00:05.000Z')
    });
    markProviderPollingCompleted(providerIssueHandoff, {
      atMs: Date.parse('2026-03-07T00:00:06.000Z')
    });

    const runtime = createControlRuntime({
      controlStore: fixture.controlStore,
      questionQueue: { list: () => [] },
      paths: fixture.paths,
      linearAdvisoryState: { tracked_issue: null },
      readProviderIssueHandoff: () => providerIssueHandoff
    });

    const compatibilityProjection = await runtime.snapshot().readCompatibilityProjection();
    expect(compatibilityProjection.polling).toMatchObject({
      enabled: true,
      interval_ms: 15000,
      checking: false,
      queued: false,
      last_mode: 'poll',
      last_requested_at: '2026-03-07T00:00:05.000Z',
      last_completed_at: '2026-03-07T00:00:06.000Z',
      last_success_at: '2026-03-07T00:00:06.000Z'
    });
  });

  it('surfaces control-host owner metadata through provider polling health', async () => {
    const fixture = await createFixture();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {}),
      refresh: vi.fn(async () => {})
    } as unknown as ProviderIssueHandoffService;

    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15000,
      controlHostOwner: {
        status: 'owned',
        reason: null,
        updated_at: '2026-04-11T00:00:00.000Z',
        diagnostic_path: null,
        lock_dir: '/repo/.runs/local-mcp/cli/control-host/control-host-owner.lock',
        owner_path: '/repo/.runs/local-mcp/cli/control-host/control-host-owner.json',
        owner: {
          owner_token: 'owner-token',
          status: 'owned',
          pid: 123,
          ppid: 1,
          hostname: 'host.local',
          acquired_at: '2026-04-11T00:00:00.000Z',
          updated_at: '2026-04-11T00:00:00.000Z',
          released_at: null,
          repo_root: '/repo',
          task_id: 'local-mcp',
          run_id: 'control-host',
          run_dir: '/repo/.runs/local-mcp/cli/control-host',
          pipeline_id: 'provider-linear-worker',
          source_root_freshness: null,
          lock_dir: '/repo/.runs/local-mcp/cli/control-host/control-host-owner.lock',
          owner_path: '/repo/.runs/local-mcp/cli/control-host/control-host-owner.json'
        }
      }
    });

    const runtime = createControlRuntime({
      controlStore: fixture.controlStore,
      questionQueue: { list: () => [] },
      paths: fixture.paths,
      linearAdvisoryState: { tracked_issue: null },
      readProviderIssueHandoff: () => providerIssueHandoff
    });

    const compatibilityProjection = await runtime.snapshot().readCompatibilityProjection();
    expect(compatibilityProjection.polling?.control_host_owner).toMatchObject({
      status: 'owned',
      owner: {
        pid: 123,
        task_id: 'local-mcp',
        run_id: 'control-host',
        pipeline_id: 'provider-linear-worker'
      }
    });
  });

  it('refreshes control-host source-root freshness at runtime projection time', async () => {
    const fixture = await createFixture();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {}),
      refresh: vi.fn(async () => {})
    } as unknown as ProviderIssueHandoffService;
    const repoRoot = await createSourceRootRepo('control-runtime-source-root-');

    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15000,
      controlHostOwner: {
        status: 'owned',
        reason: null,
        updated_at: '2026-05-01T00:00:00.000Z',
        diagnostic_path: null,
        lock_dir: join(repoRoot, '.runs', 'control-host-owner.lock'),
        owner_path: join(repoRoot, '.runs', 'control-host-owner.json'),
        owner: {
          owner_token: 'owner-token',
          status: 'owned',
          pid: 123,
          ppid: 1,
          hostname: 'host.local',
          acquired_at: '2026-05-01T00:00:00.000Z',
          updated_at: '2026-05-01T00:00:00.000Z',
          released_at: null,
          repo_root: repoRoot,
          task_id: 'local-mcp',
          run_id: 'control-host',
          run_dir: join(repoRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
          pipeline_id: 'provider-linear-worker',
          source_root_freshness: inspectSourceRootFreshness({
            intendedRepoRoot: repoRoot,
            packageRoot: repoRoot,
            argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
            cwd: repoRoot,
            now: () => '2026-05-01T00:00:00.000Z'
          }),
          lock_dir: join(repoRoot, '.runs', 'control-host-owner.lock'),
          owner_path: join(repoRoot, '.runs', 'control-host-owner.json')
        }
      }
    });

    const baseHash = git(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();
    await writeFile(join(repoRoot, 'README.md'), 'origin advanced\n', 'utf8');
    git(repoRoot, ['add', '.']);
    git(repoRoot, ['commit', '-m', 'origin advanced']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    git(repoRoot, ['reset', '--hard', baseHash]);

    const hotHealth = readProviderPollingHealth(providerIssueHandoff);
    expect(hotHealth?.control_host_owner?.owner?.source_root_freshness).toMatchObject({
      status: 'current'
    });
    expect(
      refreshControlHostOwnershipPollingPayload(hotHealth?.control_host_owner ?? null)
        ?.owner?.source_root_freshness
    ).toMatchObject({
      status: 'warning',
      source_checkout: {
        status: 'stale',
        behind: 1
      }
    });

    const runtime = createControlRuntime({
      controlStore: fixture.controlStore,
      questionQueue: { list: () => [] },
      paths: fixture.paths,
      linearAdvisoryState: { tracked_issue: null },
      readProviderIssueHandoff: () => providerIssueHandoff
    });

    const compatibilityProjection = await runtime.snapshot().readCompatibilityProjection();
    expect(
      compatibilityProjection.polling?.control_host_owner?.owner?.source_root_freshness
    ).toMatchObject({
      status: 'warning',
      drift_classes: ['shared_checkout_drift', 'supervised_source_root_drift'],
      source_checkout: {
        status: 'stale',
        behind: 1
      }
    });
  });

  it('surfaces stale resident source freshness after shared main fast-forwards without counting terminal retry claims', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T23:05:00.000Z'));
    try {
      const providerIntakeState = createProviderIntakeState([
        createTerminalRetryClaim('CO-512', 'lin-issue-512'),
        createTerminalRetryClaim('CO-554', 'lin-issue-554'),
        createTerminalRetryClaim('CO-555', 'lin-issue-555')
      ]);
      const fixture = await createFixture({
        taskId: 'local-mcp',
        providerIntakeState
      });
      const providerIssueHandoff = {
        handleAcceptedTrackedIssue: vi.fn(),
        rehydrate: vi.fn(async () => {}),
        refresh: vi.fn(async () => {})
      } as unknown as ProviderIssueHandoffService;
      const repoRoot = await createSourceRootRepo('control-runtime-resident-fast-forward-');
      const startupFreshness = inspectSourceRootFreshness({
        intendedRepoRoot: repoRoot,
        packageRoot: repoRoot,
        argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
        cwd: repoRoot,
        now: () => '2026-05-18T22:40:00.000Z'
      });
      const residentHash = git(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();

      initializeProviderPollingHealth(providerIssueHandoff, {
        intervalMs: 15000,
        controlHostOwner: {
          status: 'owned',
          reason: null,
          updated_at: '2026-05-18T22:40:00.000Z',
          diagnostic_path: null,
          lock_dir: join(repoRoot, '.runs', 'control-host-owner.lock'),
          owner_path: join(repoRoot, '.runs', 'control-host-owner.json'),
          owner: {
            owner_token: 'owner-token',
            status: 'owned',
            pid: 123,
            ppid: 1,
            hostname: 'host.local',
            acquired_at: '2026-05-18T22:40:00.000Z',
            updated_at: '2026-05-18T22:40:00.000Z',
            released_at: null,
            repo_root: repoRoot,
            task_id: 'local-mcp',
            run_id: 'control-host',
            run_dir: join(repoRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
            pipeline_id: 'provider-linear-worker',
            source_root_freshness: startupFreshness,
            lock_dir: join(repoRoot, '.runs', 'control-host-owner.lock'),
            owner_path: join(repoRoot, '.runs', 'control-host-owner.json')
          }
        }
      });

      await writeFile(join(repoRoot, 'co-555-recurrence.txt'), 'terminal claims after main advance\n', 'utf8');
      git(repoRoot, ['add', '.']);
      git(repoRoot, ['commit', '-m', 'CO-555 main advance']);
      git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
      const currentHash = git(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();

      const runtime = createControlRuntime({
        controlStore: fixture.controlStore,
        questionQueue: { list: () => [] },
        paths: fixture.paths,
        linearAdvisoryState: { tracked_issue: null },
        providerIntakeState,
        readProviderIssueHandoff: () => providerIssueHandoff
      });

      const compatibilityProjection = await runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.providerIntake).toMatchObject({
        claim_count: 3,
        active_claim_count: 0,
        running_claim_count: 0,
        active_issue_identifiers: [],
        running_issue_identifiers: []
      });
      expect(
        compatibilityProjection.polling?.control_host_owner?.owner?.source_root_freshness
      ).toMatchObject({
        status: 'warning',
        observed_at: '2026-05-18T23:05:00.000Z',
        drift_classes: ['supervised_source_root_drift'],
        source_checkout: {
          status: 'stale',
          behind: 1,
          head: { hash: residentHash },
          upstream: { hash: currentHash }
        },
        intended_checkout: {
          status: 'current',
          head: { hash: currentHash },
          upstream: { hash: currentHash }
        }
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not project restart-required released terminal historical claims as retrying WIP', async () => {
    const providerKey = 'linear:d7000137-f984-4275-85a0-dc5c14f09e64';
    const providerIntakeState = createProviderIntakeState([
      {
        ...createReleasedTerminalClaim('CO-476', 'd7000137-f984-4275-85a0-dc5c14f09e64'),
        provider_key: providerKey,
        issue_id: 'd7000137-f984-4275-85a0-dc5c14f09e64',
        issue_title: 'CO: make co-status degrade on recurring same-endpoint /ui/data timeout',
        issue_state: 'Duplicate',
        issue_state_type: 'canceled',
        issue_updated_at: '2026-05-14T04:05:53.346Z',
        task_id: 'linear-d7000137-f984-4275-85a0-dc5c14f09e64-retained',
        run_id: null,
        run_manifest_path: null,
        retry_queued: null,
        retry_attempt: null,
        retry_due_at: null,
        retry_error: null
      }
    ]);
    providerIntakeState.polling = {
      updated_at: '2026-05-20T18:10:00.000Z',
      checking: false,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      refresh_phase: 'refresh:claim_issue_by_id_reconcile',
      refresh_request_class: 'claim_issue_by_id:released',
      refresh_provider_keys: [providerKey],
      refresh_counts: {
        claims_total: 1,
        claims_scanned: 1,
        issue_by_id_reads: 1,
        issue_by_id_deferred: 0,
        occupied_slots: 0,
        fresh_discovery_runs: 0,
        fresh_discovery_candidates: 0,
        fresh_discovery_started: 0
      }
    };
    const fixture = await createFixture({
      taskId: 'local-mcp',
      providerIntakeState
    });
    await seedManifest(fixture.paths, {
      status: 'succeeded',
      completed_at: '2026-05-20T18:09:00.000Z',
      updated_at: '2026-05-20T18:09:00.000Z'
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    const statePayload = await readCompatibilityState({
      controlStore: fixture.controlStore,
      paths: fixture.paths,
      readCompatibilityProjection: async () => compatibilityProjection
    });

    expect(compatibilityProjection.providerIntake).toMatchObject({
      claim_count: 1,
      active_claim_count: 0,
      running_claim_count: 0,
      active_issue_identifiers: [],
      running_issue_identifiers: []
    });
    expect(compatibilityProjection.retrying).toEqual([]);
    expect(statePayload.counts.retrying).toBe(0);
    expect(statePayload.retrying_ids).toEqual([]);
    expect(statePayload.polling).toMatchObject({
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      refresh_phase: 'refresh:claim_issue_by_id_reconcile',
      refresh_request_class: 'claim_issue_by_id:released',
      refresh_provider_keys: [providerKey]
    });
  });

  it('blocks trusting persisted stale terminal retry claims before source recovery', async () => {
    const repoRoot = await createSourceRootRepo('control-runtime-stale-authority-');
    const startupFreshness = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: repoRoot,
      now: () => '2026-05-18T22:55:00.000Z'
    });
    const residentHash = git(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();
    await writeFile(join(repoRoot, 'co-556-main-advance.txt'), 'main advanced\n', 'utf8');
    git(repoRoot, ['add', '.']);
    git(repoRoot, ['commit', '-m', 'CO-556 main advance']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    git(repoRoot, ['reset', '--hard', residentHash]);
    const staleOwner = refreshControlHostOwnershipPollingPayload(
      createControlHostOwnerPayload(repoRoot, startupFreshness)
    );
    const providerIntakeState = createProviderIntakeState([
      createTerminalRetryClaim('CO-512', 'lin-issue-512'),
      createTerminalRetryClaim('CO-554', 'lin-issue-554'),
      createTerminalRetryClaim('CO-555', 'lin-issue-555')
    ]);
    providerIntakeState.polling = {
      updated_at: '2026-05-18T23:08:00.000Z',
      restart_required: false,
      control_host_owner: staleOwner
    };
    const fixture = await createFixture({
      taskId: 'local-mcp',
      readPersistedProviderIntakeState: () => providerIntakeState
    });

    const projection = await fixture.runtime.snapshot().readCompatibilityProjection();

    expect(projection.providerIntake).toBeNull();
    expect(projection.providerIntakeUnavailable).toMatchObject({
      reason: 'stale_supervised_control_host_source',
      action: 'fail_closed'
    });
    expect(projection.running).toEqual([]);
    expect(projection.retrying).toEqual([]);
  });

  it('blocks trusting provider-intake snapshots when stale source evidence is embedded', async () => {
    const repoRoot = await createSourceRootRepo('control-runtime-stale-provider-intake-snapshot-');
    const startupFreshness = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: repoRoot,
      now: () => '2026-05-18T22:55:00.000Z'
    });
    const residentHash = git(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();
    await writeFile(join(repoRoot, 'co-556-main-advance.txt'), 'main advanced\n', 'utf8');
    git(repoRoot, ['add', '.']);
    git(repoRoot, ['commit', '-m', 'CO-556 main advance']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    git(repoRoot, ['reset', '--hard', residentHash]);
    const providerIntakeState = createProviderIntakeState([
      {
        ...createTerminalRetryClaim('CO-512', 'lin-issue-512'),
        issue_state: 'In Progress',
        issue_state_type: 'started'
      }
    ]);
    providerIntakeState.polling = {
      updated_at: '2026-05-18T23:08:00.000Z',
      restart_required: false,
      control_host_owner: refreshControlHostOwnershipPollingPayload(
        createControlHostOwnerPayload(repoRoot, startupFreshness)
      )
    };
    const fixture = await createFixture({
      taskId: 'local-mcp',
      providerIntakeState
    });

    const projection = await fixture.runtime.snapshot().readCompatibilityProjection();

    expect(projection.providerIntake).toBeNull();
    expect(projection.providerIntakeUnavailable).toMatchObject({
      reason: 'stale_supervised_control_host_source',
      action: 'fail_closed'
    });
    expect(projection.running).toEqual([]);
    expect(projection.retrying).toEqual([]);
  });

  it('refreshes current-at-acquisition owner freshness before trusting provider-intake', async () => {
    const repoRoot = await createSourceRootRepo('control-runtime-stale-authority-refresh-');
    const startupFreshness = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: repoRoot,
      now: () => '2026-05-18T22:55:00.000Z'
    });
    const residentHash = git(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();
    const currentAtAcquisitionOwner = createControlHostOwnerPayload(repoRoot, startupFreshness);
    await writeFile(join(repoRoot, 'co-556-main-advance.txt'), 'main advanced\n', 'utf8');
    git(repoRoot, ['add', '.']);
    git(repoRoot, ['commit', '-m', 'CO-556 main advance']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    git(repoRoot, ['reset', '--hard', residentHash]);
    const providerIntakeState = createProviderIntakeState([
      createTerminalRetryClaim('CO-512', 'lin-issue-512'),
      createTerminalRetryClaim('CO-554', 'lin-issue-554'),
      createTerminalRetryClaim('CO-555', 'lin-issue-555')
    ]);
    providerIntakeState.polling = {
      updated_at: '2026-05-18T23:08:00.000Z',
      restart_required: false,
      control_host_owner: currentAtAcquisitionOwner
    };
    const fixture = await createFixture({
      taskId: 'local-mcp',
      readPersistedProviderIntakeState: () => providerIntakeState
    });

    const projection = await fixture.runtime.snapshot().readCompatibilityProjection();

    expect(projection.providerIntake).toBeNull();
    expect(projection.providerIntakeUnavailable).toMatchObject({
      reason: 'stale_supervised_control_host_source',
      action: 'fail_closed'
    });
    expect(projection.polling?.control_host_owner?.owner?.source_root_freshness).toMatchObject({
      status: 'warning',
      source_checkout: {
        status: 'stale',
        behind: 1
      }
    });
    expect(projection.running).toEqual([]);
    expect(projection.retrying).toEqual([]);
  });

  it('keeps post-recovery terminal claims released and out of active WIP', async () => {
    const providerIntakeState = createProviderIntakeState([
      createReleasedTerminalClaim('CO-512', 'lin-issue-512'),
      createReleasedTerminalClaim('CO-554', 'lin-issue-554'),
      createReleasedTerminalClaim('CO-555', 'lin-issue-555')
    ]);
    const fixture = await createFixture({
      taskId: 'local-mcp',
      readPersistedProviderIntakeState: () => providerIntakeState
    });

    const projection = await fixture.runtime.snapshot().readCompatibilityProjection();

    expect(projection.providerIntakeUnavailable).toBeNull();
    expect(projection.providerIntake).toMatchObject({
      active_claim_count: 0,
      running_claim_count: 0
    });
    expect(projection.running).toEqual([]);
    expect(projection.retrying).toEqual([]);
    for (const claim of providerIntakeState.claims) {
      expect(claim).toMatchObject({
        state: 'released',
        reason: 'provider_issue_released:not_active',
        issue_state: 'Done',
        issue_state_type: 'completed',
        retry_queued: null,
        retry_due_at: null,
        retry_error: null
      });
    }
  });

  it('keeps startup realpaths when a global control-host launcher is retargeted', async () => {
    const intendedRoot = await createSourceRootRepo('control-runtime-intended-root-');
    const staleRoot = await createSourceRootRepo('control-runtime-stale-root-');
    const staleBaseHash = git(staleRoot, ['rev-parse', 'HEAD']).stdout.trim();
    await writeFile(join(staleRoot, 'README.md'), 'origin advanced\n', 'utf8');
    git(staleRoot, ['add', '.']);
    git(staleRoot, ['commit', '-m', 'origin advanced']);
    git(staleRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    git(staleRoot, ['reset', '--hard', staleBaseHash]);
    const globalRoot = await mkdtemp(join(tmpdir(), 'control-runtime-global-launcher-'));
    cleanupRoots.push(globalRoot);
    await mkdir(join(globalRoot, 'bin'), { recursive: true });
    const commandPath = join(globalRoot, 'bin', 'codex-orchestrator');
    const linkedPackageRoot = join(globalRoot, '@kbediako', 'codex-orchestrator');
    await mkdir(join(globalRoot, '@kbediako'), { recursive: true });
    await symlink(join(staleRoot, 'bin', 'codex-orchestrator.ts'), commandPath);
    await symlink(staleRoot, linkedPackageRoot, 'dir');
    const startupFreshness = inspectSourceRootFreshness({
      intendedRepoRoot: intendedRoot,
      packageRoot: linkedPackageRoot,
      commandPath,
      cwd: intendedRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });

    await unlink(commandPath);
    await unlink(linkedPackageRoot);
    await symlink(join(intendedRoot, 'bin', 'codex-orchestrator.ts'), commandPath);
    await symlink(intendedRoot, linkedPackageRoot, 'dir');

    const refreshed = refreshControlHostOwnershipPollingPayload({
      status: 'owned',
      reason: null,
      updated_at: '2026-05-01T00:00:00.000Z',
      diagnostic_path: null,
      lock_dir: join(intendedRoot, '.runs', 'control-host-owner.lock'),
      owner_path: join(intendedRoot, '.runs', 'control-host-owner.json'),
      owner: {
        owner_token: 'owner-token',
        status: 'owned',
        pid: 123,
        ppid: 1,
        hostname: 'host.local',
        acquired_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-01T00:00:00.000Z',
        released_at: null,
        repo_root: intendedRoot,
        task_id: 'local-mcp',
        run_id: 'control-host',
        run_dir: join(intendedRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
        pipeline_id: 'provider-linear-worker',
        source_root_freshness: startupFreshness,
        lock_dir: join(intendedRoot, '.runs', 'control-host-owner.lock'),
        owner_path: join(intendedRoot, '.runs', 'control-host-owner.json')
      }
    });

    const freshness = refreshed?.owner?.source_root_freshness;
    expect(freshness).toMatchObject({
      status: 'warning',
      command_path: commandPath,
      command_path_realpath: await realpath(join(staleRoot, 'bin', 'codex-orchestrator.ts')),
      package_root: linkedPackageRoot,
      package_root_realpath: await realpath(staleRoot),
      source_root_realpath: await realpath(staleRoot),
      source_checkout: {
        status: 'stale',
        behind: 1
      }
    });
    expect(freshness?.source_root_realpath).not.toBe(await realpath(intendedRoot));
    expect(freshness?.drift_classes).toEqual(
      expect.arrayContaining([
        'supervised_source_root_drift',
        'global_binary_package_provenance_drift'
      ])
    );
  });

  it('keeps a restarted live control-host owner while using persisted polling fields', async () => {
    const fixture = await createFixture();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {}),
      refresh: vi.fn(async () => {})
    } as unknown as ProviderIssueHandoffService;
    const repoRoot = await createSourceRootRepo('control-runtime-restarted-owner-');
    const liveFreshness = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: repoRoot,
      now: () => '2026-05-01T00:00:00.000Z'
    });
    const persistedFreshness = {
      ...liveFreshness,
      status: 'warning' as const,
      command_path: '/stale/bin/codex-orchestrator.ts',
      command_path_realpath: '/stale/bin/codex-orchestrator.ts',
      package_root: '/stale',
      package_root_realpath: '/stale',
      source_root: '/stale',
      source_root_realpath: '/stale',
      drift_classes: ['supervised_source_root_drift' as const]
    };

    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15000,
      stuckAfterMs: 45000,
      skipInitialUpdate: true,
      controlHostOwner: {
        status: 'owned',
        reason: null,
        updated_at: '2026-05-01T00:00:00.000Z',
        diagnostic_path: null,
        lock_dir: join(repoRoot, '.runs', 'control-host-owner.lock'),
        owner_path: join(repoRoot, '.runs', 'control-host-owner.json'),
        owner: {
          owner_token: 'live-owner-token',
          status: 'owned',
          pid: 123,
          ppid: 1,
          hostname: 'host.local',
          acquired_at: '2026-05-01T00:00:00.000Z',
          updated_at: '2026-05-01T00:00:00.000Z',
          released_at: null,
          repo_root: repoRoot,
          task_id: 'local-mcp',
          run_id: 'control-host',
          run_dir: join(repoRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
          pipeline_id: 'provider-linear-worker',
          source_root_freshness: liveFreshness,
          lock_dir: join(repoRoot, '.runs', 'control-host-owner.lock'),
          owner_path: join(repoRoot, '.runs', 'control-host-owner.json')
        }
      }
    });

    const runtime = createControlRuntime({
      controlStore: fixture.controlStore,
      questionQueue: { list: () => [] },
      paths: fixture.paths,
      linearAdvisoryState: { tracked_issue: null },
      providerIntakeState: {
        schema_version: 1,
        updated_at: '2026-05-01T00:00:45.000Z',
        rehydrated_at: null,
        latest_provider_key: null,
        latest_reason: null,
        polling: {
          enabled: true,
          interval_ms: 15000,
          checking: true,
          queued: false,
          last_mode: 'refresh',
          updated_at: '2026-05-01T00:00:45.000Z',
          control_host_owner: {
            status: 'owned',
            reason: null,
            updated_at: '2026-04-30T00:00:00.000Z',
            diagnostic_path: null,
            lock_dir: '/stale/.runs/control-host-owner.lock',
            owner_path: '/stale/.runs/control-host-owner.json',
            owner: {
              owner_token: 'persisted-owner-token',
              status: 'owned',
              pid: 999,
              ppid: 1,
              hostname: 'old-host.local',
              acquired_at: '2026-04-30T00:00:00.000Z',
              updated_at: '2026-04-30T00:00:00.000Z',
              released_at: null,
              repo_root: '/stale',
              task_id: 'local-mcp',
              run_id: 'control-host',
              run_dir: '/stale/.runs/local-mcp/cli/control-host',
              pipeline_id: 'provider-linear-worker',
              source_root_freshness: persistedFreshness,
              lock_dir: '/stale/.runs/control-host-owner.lock',
              owner_path: '/stale/.runs/control-host-owner.json'
            }
          }
        },
        claims: []
      },
      readProviderIssueHandoff: () => providerIssueHandoff
    });

    const compatibilityProjection = await runtime.snapshot().readCompatibilityProjection();
    expect(compatibilityProjection.polling).toMatchObject({
      checking: true,
      last_mode: 'refresh',
      updated_at: '2026-05-01T00:00:45.000Z',
      control_host_owner: {
        owner: {
          owner_token: 'live-owner-token',
          pid: 123,
          source_root_freshness: {
            command_path: join(repoRoot, 'bin', 'codex-orchestrator.ts'),
            status: 'current'
          }
        }
      }
    });
  });

  it('falls back to persisted stale authority when live ownership has no freshness signal', async () => {
    const fixture = await createFixture({ taskId: 'local-mcp' });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {}),
      refresh: vi.fn(async () => {})
    } as unknown as ProviderIssueHandoffService;
    const repoRoot = await createSourceRootRepo('control-runtime-live-owner-missing-freshness-');
    const startupFreshness = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: repoRoot,
      now: () => '2026-05-18T22:55:00.000Z'
    });
    const residentHash = git(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();
    const liveOwner = createControlHostOwnerPayload(repoRoot, null);
    if (!liveOwner.owner) {
      throw new Error('Expected live control-host owner test payload.');
    }
    liveOwner.owner.owner_token = 'live-owner-missing-freshness-token';
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15000,
      stuckAfterMs: 45000,
      skipInitialUpdate: true,
      controlHostOwner: liveOwner
    });
    await writeFile(join(repoRoot, 'co-556-main-advance.txt'), 'main advanced\n', 'utf8');
    git(repoRoot, ['add', '.']);
    git(repoRoot, ['commit', '-m', 'CO-556 main advance']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    git(repoRoot, ['reset', '--hard', residentHash]);
    const providerIntakeState = createProviderIntakeState([
      createTerminalRetryClaim('CO-512', 'lin-issue-512'),
      createTerminalRetryClaim('CO-554', 'lin-issue-554'),
      createTerminalRetryClaim('CO-555', 'lin-issue-555')
    ]);
    const persistedOwner = createControlHostOwnerPayload(repoRoot, startupFreshness);
    if (!persistedOwner.owner) {
      throw new Error('Expected persisted control-host owner test payload.');
    }
    persistedOwner.owner.owner_token = 'persisted-owner-token';
    providerIntakeState.polling = {
      updated_at: '2026-05-18T23:08:00.000Z',
      restart_required: false,
      control_host_owner: persistedOwner
    };
    const runtime = createControlRuntime({
      controlStore: fixture.controlStore,
      questionQueue: { list: () => [] },
      paths: fixture.paths,
      linearAdvisoryState: { tracked_issue: null },
      readPersistedProviderIntakeState: () => providerIntakeState,
      readProviderIssueHandoff: () => providerIssueHandoff
    });

    const compatibilityProjection = await runtime.snapshot().readCompatibilityProjection();

    expect(compatibilityProjection.providerIntake).toBeNull();
    expect(compatibilityProjection.providerIntakeUnavailable).toMatchObject({
      reason: 'stale_supervised_control_host_source',
      updated_at: '2026-05-18T23:08:00.000Z',
      action: 'fail_closed',
      detail: expect.stringContaining('provider-intake must fail closed')
    });
    expect(providerIntakeState.polling.control_host_owner).toMatchObject({
      owner: { owner_token: 'persisted-owner-token' }
    });
    expect(compatibilityProjection.polling).toMatchObject({
      control_host_owner: {
        owner: { owner_token: 'live-owner-missing-freshness-token' }
      }
    });
    expect(compatibilityProjection.running).toEqual([]);
    expect(compatibilityProjection.retrying).toEqual([]);
  });

  it.each([
    ['duplicate_rejected', 'duplicate_control_host_owner'],
    ['ambiguous_rejected', 'ambiguous_control_host_owner']
  ] as const)(
    'falls back to persisted stale authority when %s diagnostics only have attempted-owner freshness',
    async (status, reason) => {
      const fixture = await createFixture({ taskId: 'local-mcp' });
      const providerIssueHandoff = {
        handleAcceptedTrackedIssue: vi.fn(),
        rehydrate: vi.fn(async () => {}),
        refresh: vi.fn(async () => {})
      } as unknown as ProviderIssueHandoffService;
      const repoRoot = await createSourceRootRepo(`control-runtime-live-${status}-missing-active-freshness-`);
      const attemptedRepoRoot = await createSourceRootRepo(`control-runtime-live-${status}-attempted-current-`);
      const startupFreshness = inspectSourceRootFreshness({
        intendedRepoRoot: repoRoot,
        packageRoot: repoRoot,
        argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
        cwd: repoRoot,
        now: () => '2026-05-18T22:55:00.000Z'
      });
      const attemptedCurrentFreshness = inspectSourceRootFreshness({
        intendedRepoRoot: attemptedRepoRoot,
        packageRoot: attemptedRepoRoot,
        argv: ['node', join(attemptedRepoRoot, 'bin', 'codex-orchestrator.ts')],
        cwd: attemptedRepoRoot,
        now: () => '2026-05-18T23:08:00.000Z'
      });
      const residentHash = git(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();
      const attemptedOwnerPayload = createControlHostOwnerPayload(attemptedRepoRoot, attemptedCurrentFreshness);
      const liveOwner = {
        ...createControlHostOwnerPayload(repoRoot, null),
        status,
        reason,
        diagnostic_path: join(repoRoot, '.runs', 'control-host-duplicate-owner.json'),
        attempted_owner: attemptedOwnerPayload.owner
          ? {
              ...attemptedOwnerPayload.owner,
              owner_token: `attempted-${status}-token`
            }
          : null
      };
      if (!liveOwner.owner || !liveOwner.attempted_owner) {
        throw new Error('Expected live control-host owner and attempted owner test payloads.');
      }
      liveOwner.owner.owner_token = `active-${status}-missing-freshness-token`;
      initializeProviderPollingHealth(providerIssueHandoff, {
        intervalMs: 15000,
        stuckAfterMs: 45000,
        skipInitialUpdate: true,
        controlHostOwner: liveOwner
      });
      await writeFile(join(repoRoot, 'co-556-main-advance.txt'), 'main advanced\n', 'utf8');
      git(repoRoot, ['add', '.']);
      git(repoRoot, ['commit', '-m', 'CO-556 main advance']);
      git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
      git(repoRoot, ['reset', '--hard', residentHash]);
      const providerIntakeState = createProviderIntakeState([
        createTerminalRetryClaim('CO-512', 'lin-issue-512'),
        createTerminalRetryClaim('CO-554', 'lin-issue-554'),
        createTerminalRetryClaim('CO-555', 'lin-issue-555')
      ]);
      providerIntakeState.polling = {
        updated_at: '2026-05-18T23:08:00.000Z',
        restart_required: false,
        control_host_owner: createControlHostOwnerPayload(repoRoot, startupFreshness)
      };
      const runtime = createControlRuntime({
        controlStore: fixture.controlStore,
        questionQueue: { list: () => [] },
        paths: fixture.paths,
        linearAdvisoryState: { tracked_issue: null },
        readPersistedProviderIntakeState: () => providerIntakeState,
        readProviderIssueHandoff: () => providerIssueHandoff
      });

      const compatibilityProjection = await runtime.snapshot().readCompatibilityProjection();

      expect(compatibilityProjection.providerIntake).toBeNull();
      expect(compatibilityProjection.providerIntakeUnavailable).toMatchObject({
        reason: 'stale_supervised_control_host_source',
        action: 'fail_closed'
      });
      expect(compatibilityProjection.running).toEqual([]);
      expect(compatibilityProjection.retrying).toEqual([]);
    }
  );

  it('falls back to persisted stale authority when live freshness refresh is unavailable', async () => {
    const fixture = await createFixture({ taskId: 'local-mcp' });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {}),
      refresh: vi.fn(async () => {})
    } as unknown as ProviderIssueHandoffService;
    const repoRoot = await createSourceRootRepo('control-runtime-live-owner-refresh-unavailable-');
    const startupFreshness = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: repoRoot,
      now: () => '2026-05-18T22:55:00.000Z'
    });
    const rawCurrentFreshness = {
      ...startupFreshness,
      source_checkout: startupFreshness.source_checkout
        ? {
            ...startupFreshness.source_checkout,
            head: startupFreshness.source_checkout.head
              ? {
                  ...startupFreshness.source_checkout.head,
                  hash: '0000000000000000000000000000000000000000'
                }
              : null
          }
        : null
    };
    const residentHash = git(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();
    const liveOwner = createControlHostOwnerPayload(repoRoot, rawCurrentFreshness);
    if (!liveOwner.owner) {
      throw new Error('Expected live control-host owner test payload.');
    }
    liveOwner.owner.owner_token = 'live-owner-refresh-unavailable-token';
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15000,
      stuckAfterMs: 45000,
      skipInitialUpdate: true,
      controlHostOwner: liveOwner
    });
    await writeFile(join(repoRoot, 'co-556-main-advance.txt'), 'main advanced\n', 'utf8');
    git(repoRoot, ['add', '.']);
    git(repoRoot, ['commit', '-m', 'CO-556 main advance']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    git(repoRoot, ['reset', '--hard', residentHash]);
    const providerIntakeState = createProviderIntakeState([
      createTerminalRetryClaim('CO-512', 'lin-issue-512'),
      createTerminalRetryClaim('CO-554', 'lin-issue-554'),
      createTerminalRetryClaim('CO-555', 'lin-issue-555')
    ]);
    providerIntakeState.polling = {
      updated_at: '2026-05-18T23:08:00.000Z',
      restart_required: false,
      control_host_owner: createControlHostOwnerPayload(repoRoot, startupFreshness)
    };
    const runtime = createControlRuntime({
      controlStore: fixture.controlStore,
      questionQueue: { list: () => [] },
      paths: fixture.paths,
      linearAdvisoryState: { tracked_issue: null },
      readPersistedProviderIntakeState: () => providerIntakeState,
      readProviderIssueHandoff: () => providerIssueHandoff
    });

    const compatibilityProjection = await runtime.snapshot().readCompatibilityProjection();

    expect(compatibilityProjection.providerIntake).toBeNull();
    expect(compatibilityProjection.providerIntakeUnavailable).toMatchObject({
      reason: 'stale_supervised_control_host_source',
      action: 'fail_closed'
    });
    expect(compatibilityProjection.running).toEqual([]);
    expect(compatibilityProjection.retrying).toEqual([]);
  });

  it('clears persisted stale provider-intake authority when live control-host ownership is current', async () => {
    const fixture = await createFixture();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {}),
      refresh: vi.fn(async () => {})
    } as unknown as ProviderIssueHandoffService;
    const repoRoot = await createSourceRootRepo('control-runtime-live-owner-authority-');
    const liveFreshness = inspectSourceRootFreshness({
      intendedRepoRoot: repoRoot,
      packageRoot: repoRoot,
      argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: repoRoot,
      now: () => '2026-05-18T23:12:00.000Z'
    });
    const persistedFreshness = {
      ...liveFreshness,
      status: 'warning' as const,
      command_path: '/stale/bin/codex-orchestrator.ts',
      command_path_realpath: '/stale/bin/codex-orchestrator.ts',
      package_root: '/stale',
      package_root_realpath: '/stale',
      source_root: '/stale',
      source_root_realpath: '/stale',
      drift_classes: ['supervised_source_root_drift' as const]
    };
    const liveOwner = refreshControlHostOwnershipPollingPayload(
      createControlHostOwnerPayload(repoRoot, liveFreshness)
    );
    if (!liveOwner?.owner) {
      throw new Error('Expected live control-host owner test payload.');
    }
    liveOwner.updated_at = '2026-05-18T23:12:00.000Z';
    liveOwner.owner.owner_token = 'live-owner-token';
    liveOwner.owner.updated_at = '2026-05-18T23:12:00.000Z';
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15000,
      stuckAfterMs: 45000,
      skipInitialUpdate: true,
      controlHostOwner: liveOwner
    });

    const persistedOwner = refreshControlHostOwnershipPollingPayload(
      createControlHostOwnerPayload('/stale', persistedFreshness)
    );
    if (!persistedOwner?.owner) {
      throw new Error('Expected persisted control-host owner test payload.');
    }
    persistedOwner.updated_at = '2026-05-18T23:08:00.000Z';
    persistedOwner.owner.owner_token = 'persisted-owner-token';
    persistedOwner.owner.updated_at = '2026-05-18T23:08:00.000Z';
    const providerIntakeState = createProviderIntakeState([
      createReleasedTerminalClaim('CO-512', 'lin-issue-512'),
      createReleasedTerminalClaim('CO-554', 'lin-issue-554'),
      createReleasedTerminalClaim('CO-555', 'lin-issue-555')
    ]);
    providerIntakeState.polling = {
      updated_at: '2026-05-18T23:08:00.000Z',
      restart_required: false,
      control_host_owner: persistedOwner
    };
    const runtime = createControlRuntime({
      controlStore: fixture.controlStore,
      questionQueue: { list: () => [] },
      paths: fixture.paths,
      linearAdvisoryState: { tracked_issue: null },
      readPersistedProviderIntakeState: () => providerIntakeState,
      readProviderIssueHandoff: () => providerIssueHandoff
    });

    const compatibilityProjection = await runtime.snapshot().readCompatibilityProjection();

    expect(compatibilityProjection.providerIntakeUnavailable).toBeNull();
    expect(compatibilityProjection.providerIntake).toMatchObject({
      active_claim_count: 0,
      running_claim_count: 0
    });
    expect(compatibilityProjection.polling).toMatchObject({
      control_host_owner: {
        owner: {
          owner_token: 'live-owner-token',
          source_root_freshness: {
            status: 'current'
          }
        }
      }
    });
  });

  it('clears persisted stale provider-intake authority when live ownership has non-supervised freshness warning', async () => {
    const fixture = await createFixture();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {}),
      refresh: vi.fn(async () => {})
    } as unknown as ProviderIssueHandoffService;
    const liveRepoRoot = await createSourceRootRepo('control-runtime-live-owner-warning-authority-');
    const liveFreshness = {
      ...inspectSourceRootFreshness({
        intendedRepoRoot: liveRepoRoot,
        packageRoot: liveRepoRoot,
        argv: ['node', join(liveRepoRoot, 'bin', 'codex-orchestrator.ts')],
        cwd: liveRepoRoot,
        now: () => '2026-05-18T23:12:00.000Z'
      }),
      status: 'warning' as const,
      drift_classes: ['source_vs_dist_drift' as const],
      detail: 'Detected source/root drift: source_vs_dist_drift.'
    };
    const staleRepoRoot = await createSourceRootRepo('control-runtime-persisted-stale-authority-');
    const staleStartupFreshness = inspectSourceRootFreshness({
      intendedRepoRoot: staleRepoRoot,
      packageRoot: staleRepoRoot,
      argv: ['node', join(staleRepoRoot, 'bin', 'codex-orchestrator.ts')],
      cwd: staleRepoRoot,
      now: () => '2026-05-18T22:55:00.000Z'
    });
    const residentHash = git(staleRepoRoot, ['rev-parse', 'HEAD']).stdout.trim();
    await writeFile(join(staleRepoRoot, 'co-556-main-advance.txt'), 'main advanced\n', 'utf8');
    git(staleRepoRoot, ['add', '.']);
    git(staleRepoRoot, ['commit', '-m', 'CO-556 main advance']);
    git(staleRepoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    git(staleRepoRoot, ['reset', '--hard', residentHash]);
    const liveOwner = createControlHostOwnerPayload(liveRepoRoot, liveFreshness);
    if (!liveOwner.owner) {
      throw new Error('Expected live control-host owner test payload.');
    }
    liveOwner.updated_at = '2026-05-18T23:12:00.000Z';
    liveOwner.owner.owner_token = 'live-owner-warning-token';
    liveOwner.owner.updated_at = '2026-05-18T23:12:00.000Z';
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15000,
      stuckAfterMs: 45000,
      skipInitialUpdate: true,
      controlHostOwner: liveOwner
    });

    const persistedOwner = refreshControlHostOwnershipPollingPayload(
      createControlHostOwnerPayload(staleRepoRoot, staleStartupFreshness)
    );
    if (!persistedOwner?.owner) {
      throw new Error('Expected persisted control-host owner test payload.');
    }
    persistedOwner.updated_at = '2026-05-18T23:08:00.000Z';
    persistedOwner.owner.owner_token = 'persisted-stale-owner-token';
    persistedOwner.owner.updated_at = '2026-05-18T23:08:00.000Z';
    const providerIntakeState = createProviderIntakeState([
      createReleasedTerminalClaim('CO-512', 'lin-issue-512'),
      createReleasedTerminalClaim('CO-554', 'lin-issue-554'),
      createReleasedTerminalClaim('CO-555', 'lin-issue-555')
    ]);
    providerIntakeState.polling = {
      updated_at: '2026-05-18T23:08:00.000Z',
      restart_required: false,
      control_host_owner: persistedOwner
    };
    const runtime = createControlRuntime({
      controlStore: fixture.controlStore,
      questionQueue: { list: () => [] },
      paths: fixture.paths,
      linearAdvisoryState: { tracked_issue: null },
      readPersistedProviderIntakeState: () => providerIntakeState,
      readProviderIssueHandoff: () => providerIssueHandoff
    });

    const compatibilityProjection = await runtime.snapshot().readCompatibilityProjection();

    expect(compatibilityProjection.providerIntakeUnavailable).toBeNull();
    expect(compatibilityProjection.providerIntake).toMatchObject({
      active_claim_count: 0,
      running_claim_count: 0
    });
    expect(compatibilityProjection.polling).toMatchObject({
      control_host_owner: {
        owner: {
          owner_token: 'live-owner-warning-token'
        }
      }
    });
  });

  it('falls back to the persisted polling snapshot before live polling health restarts', async () => {
    const fixture = await createFixture();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {}),
      refresh: vi.fn(async () => {})
    } as unknown as ProviderIssueHandoffService;

    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15000,
      stuckAfterMs: 45000,
      skipInitialUpdate: true
    });

    const runtime = createControlRuntime({
      controlStore: fixture.controlStore,
      questionQueue: { list: () => [] },
      paths: fixture.paths,
      linearAdvisoryState: { tracked_issue: null },
      providerIntakeState: {
        schema_version: 1,
        updated_at: '2026-03-07T00:00:45.000Z',
        rehydrated_at: null,
        latest_provider_key: null,
        latest_reason: null,
        polling: {
          enabled: true,
          interval_ms: 15000,
          checking: true,
          queued: false,
          last_mode: 'refresh',
          last_requested_at: '2026-03-07T00:00:00.000Z',
          source_updated_at: '2026-03-07T00:00:30.000Z',
          updated_at: '2026-03-07T00:00:45.000Z',
          operation_started_at: '2026-03-07T00:00:00.000Z',
          operation_elapsed_ms: 45000,
          stalled_after_ms: 45000,
          refresh_phase: 'refresh:claim_issue_by_id_reconcile',
          refresh_request_class: 'claim_issue_by_id:running',
          refresh_provider_keys: ['linear:issue-1'],
          stuck: true,
          stuck_since_at: '2026-03-07T00:00:45.000Z',
          restart_required: true,
          reason: 'provider_refresh_lifecycle_stuck'
        },
        claims: []
      },
      readProviderIssueHandoff: () => providerIssueHandoff
    });

    const compatibilityProjection = await runtime.snapshot().readCompatibilityProjection();
    expect(compatibilityProjection.polling).toMatchObject({
      interval_ms: 15000,
      checking: true,
      refresh_phase: 'refresh:claim_issue_by_id_reconcile',
      refresh_request_class: 'claim_issue_by_id:running',
      refresh_provider_keys: ['linear:issue-1'],
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      source_updated_at: '2026-03-07T00:00:30.000Z',
      updated_at: '2026-03-07T00:00:45.000Z'
    });
  });

  it('drops persisted polling linear budget snapshots that do not include an observation timestamp', async () => {
    const fixture = await createFixture({
      providerIntakeState: {
        ...createProviderIntakeState([]),
        polling: {
          enabled: true,
          interval_ms: 15000,
          checking: false,
          queued: false,
          last_mode: 'poll',
          updated_at: '2026-03-07T00:00:45.000Z',
          linear_budget: {}
        }
      }
    });

    const compatibilityProjection = await fixture.runtime.snapshot().readCompatibilityProjection();
    expect(compatibilityProjection.polling?.linear_budget ?? null).toBeNull();
  });

  it('honors explicit null when reinitializing provider polling health state', async () => {
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {}),
      refresh: vi.fn(async () => {})
    } as unknown as ProviderIssueHandoffService;
    const onUpdate = vi.fn();

    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15000,
      stuckAfterMs: 45000,
      onUpdate
    });

    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    onUpdate.mockClear();

    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 30000,
      stuckAfterMs: null,
      onUpdate: null
    });
    markProviderPollingStarted(providerIssueHandoff, {
      mode: 'poll',
      atMs: Date.parse('2026-03-07T00:00:05.000Z')
    });

    await Promise.resolve();

    expect(onUpdate).not.toHaveBeenCalled();
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      interval_ms: 30000,
      checking: true,
      stuck: false,
      restart_required: false,
      stalled_after_ms: null
    });
  });

  it('lets stuck flush failures reject while keeping later polling updates serialized', async () => {
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {}),
      refresh: vi.fn(async () => {})
    } as unknown as ProviderIssueHandoffService;
    const onUpdate = vi.fn(async (payload: { stuck?: boolean }) => {
      if (payload.stuck === true) {
        throw new Error('persist failed');
      }
    });

    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15000,
      stuckAfterMs: 45000,
      onUpdate
    });
    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    onUpdate.mockClear();

    markProviderPollingStarted(providerIssueHandoff, {
      mode: 'refresh',
      atMs: Date.parse('2026-03-07T00:00:00.000Z')
    });
    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    onUpdate.mockClear();

    await expect(
      markProviderPollingStuck(providerIssueHandoff, {
        atMs: Date.parse('2026-03-07T00:00:45.000Z')
      })
    ).rejects.toThrow('persist failed');
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        stuck: true,
        restart_required: true,
        reason: 'provider_refresh_lifecycle_stuck'
      })
    );

    onUpdate.mockImplementation(async () => undefined);
    onUpdate.mockClear();

    markProviderPollingCompleted(providerIssueHandoff, {
      atMs: Date.parse('2026-03-07T00:01:00.000Z')
    });

    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        checking: false,
        stuck: false,
        restart_required: false,
        last_completed_at: '2026-03-07T00:01:00.000Z'
      })
    );
  });

  it('recomputes provider polling health on repeated compatibility reads without snapshot invalidation', async () => {
    const fixture = await createFixture();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {}),
      refresh: vi.fn(async () => {})
    } as unknown as ProviderIssueHandoffService;

    initializeProviderPollingHealth(providerIssueHandoff, { intervalMs: 15000 });
    markProviderPollingStarted(providerIssueHandoff, {
      mode: 'poll',
      atMs: Date.parse('2026-03-07T00:00:05.000Z')
    });
    markProviderPollingCompleted(providerIssueHandoff, {
      atMs: Date.parse('2026-03-07T00:00:06.000Z')
    });

    const runtime = createControlRuntime({
      controlStore: fixture.controlStore,
      questionQueue: { list: () => [] },
      paths: fixture.paths,
      linearAdvisoryState: { tracked_issue: null },
      readProviderIssueHandoff: () => providerIssueHandoff
    });

    const snapshot = runtime.snapshot();
    const initialProjection = await snapshot.readCompatibilityProjection();

    markProviderPollingStarted(providerIssueHandoff, {
      mode: 'refresh',
      atMs: Date.parse('2026-03-07T00:00:10.000Z')
    });
    markProviderPollingCompleted(providerIssueHandoff, {
      atMs: Date.parse('2026-03-07T00:00:11.000Z'),
      error: new Error('provider refresh failed')
    });

    const repeatedProjection = await snapshot.readCompatibilityProjection();

    expect(initialProjection.polling).toMatchObject({
      last_mode: 'poll',
      last_requested_at: '2026-03-07T00:00:05.000Z',
      last_completed_at: '2026-03-07T00:00:06.000Z',
      last_success_at: '2026-03-07T00:00:06.000Z',
      last_error_at: null,
      last_error: null
    });
    expect(repeatedProjection.polling).toMatchObject({
      last_mode: 'refresh',
      last_requested_at: '2026-03-07T00:00:10.000Z',
      last_completed_at: '2026-03-07T00:00:11.000Z',
      last_success_at: '2026-03-07T00:00:06.000Z',
      last_error_at: '2026-03-07T00:00:11.000Z',
      last_error: 'provider refresh failed'
    });
  });

  it('recomputes rate limits on repeated compatibility reads without snapshot invalidation', async () => {
    const providerIntakeState = createProviderIntakeState();
    providerIntakeState.polling = {
      linear_budget: {
        observed_at: '2026-03-07T00:29:45.000Z',
        source: 'control-host-polling',
        suppression: 'none',
        suppression_reason: null,
        retry_after_seconds: null,
        cooldown_until: null,
        cooldown_active: false,
        request_id: 'polling-1',
        requests: {
          remaining: 17,
          limit: 30,
          reset_at: '2026-03-07T00:30:42.000Z'
        },
        endpoint_requests: null,
        complexity: null,
        endpoint_complexity: null
      }
    };
    const fixture = await createFixture({
      taskId: 'task-rate-limit-refresh',
      providerIntakeState
    });
    await seedManifest(fixture.paths, {
      task_id: 'task-rate-limit-refresh',
      issue_id: 'issue-budget',
      issue_identifier: 'ISSUE-BUDGET',
      started_at: '2026-03-07T00:20:00.000Z',
      updated_at: '2026-03-07T00:29:59.000Z'
    });

    const snapshot = fixture.runtime.snapshot();
    const initialProjection = await snapshot.readCompatibilityProjection();

    providerIntakeState.polling = {
      linear_budget: {
        observed_at: '2026-03-07T00:29:55.000Z',
        source: 'control-host-polling',
        suppression: 'none',
        suppression_reason: null,
        retry_after_seconds: 12,
        cooldown_until: null,
        cooldown_active: false,
        request_id: 'polling-2',
        requests: {
          remaining: 9,
          limit: 30,
          reset_at: '2026-03-07T00:31:12.000Z'
        },
        endpoint_requests: null,
        complexity: null,
        endpoint_complexity: null
      }
    };

    const repeatedProjection = await snapshot.readCompatibilityProjection();

    expect(initialProjection.rateLimits).toMatchObject({
      observed_at: '2026-03-07T00:29:45.000Z',
      request_id: 'polling-1',
      retry_after_seconds: null,
      requests: {
        remaining: 17,
        limit: 30,
        reset_at: '2026-03-07T00:30:42.000Z'
      }
    });
    expect(repeatedProjection.rateLimits).toMatchObject({
      observed_at: '2026-03-07T00:29:55.000Z',
      request_id: 'polling-2',
      retry_after_seconds: 12,
      requests: {
        remaining: 9,
        limit: 30,
        reset_at: '2026-03-07T00:31:12.000Z'
      }
    });
  });

  it('surfaces stuck provider polling as restart-required through compatibility projections', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:00:46.000Z'));
    try {
      const fixture = await createFixture();
      const providerIssueHandoff = {
        handleAcceptedTrackedIssue: vi.fn(),
        rehydrate: vi.fn(async () => {}),
        refresh: vi.fn(async () => {})
      } as unknown as ProviderIssueHandoffService;

      initializeProviderPollingHealth(providerIssueHandoff, {
        intervalMs: 15000,
        stuckAfterMs: 45000
      });
      markProviderPollingStarted(providerIssueHandoff, {
        mode: 'refresh',
        atMs: Date.parse('2026-03-07T00:00:00.000Z')
      });

      const runtime = createControlRuntime({
        controlStore: fixture.controlStore,
        questionQueue: { list: () => [] },
        paths: fixture.paths,
        linearAdvisoryState: { tracked_issue: null },
        readProviderIssueHandoff: () => providerIssueHandoff
      });

      const compatibilityProjection = await runtime.snapshot().readCompatibilityProjection();
      expect(compatibilityProjection.polling).toMatchObject({
        checking: true,
        stuck: true,
        restart_required: true,
        reason: 'provider_refresh_lifecycle_stuck',
        operation_started_at: '2026-03-07T00:00:00.000Z',
        stalled_after_ms: 45000,
        stuck_since_at: '2026-03-07T00:00:45.000Z'
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

async function createSourceRootRepo(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  cleanupRoots.push(root);
  await mkdir(join(root, 'bin'), { recursive: true });
  await writeFile(
    join(root, 'package.json'),
    `${JSON.stringify({ name: '@kbediako/codex-orchestrator' }, null, 2)}\n`,
    'utf8'
  );
  await writeFile(join(root, 'bin', 'codex-orchestrator.ts'), 'console.log("source");\n', 'utf8');
  git(root, ['init', '-b', 'main']);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'base']);
  git(root, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  return root;
}

function git(cwd: string, args: string[]): { stdout: string } {
  const result = spawnSync(
    'git',
    ['-c', 'user.name=Codex Test', '-c', 'user.email=codex@example.test', ...args],
    {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${result.stderr || result.error?.message || 'unknown error'}`
    );
  }
  return { stdout: String(result.stdout ?? '') };
}
