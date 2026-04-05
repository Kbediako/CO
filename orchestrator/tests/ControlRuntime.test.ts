import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
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
import * as liveLinearAdvisoryRuntimeModule from '../src/cli/control/liveLinearAdvisoryRuntime.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import type { ProviderIntakeState } from '../src/cli/control/providerIntakeState.js';
import type { QuestionRecord } from '../src/cli/control/questions.js';
import {
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  type ProviderLinearWorkerProof
} from '../src/cli/providerLinearWorkerRunner.js';
import { resolveRunPaths, type RunPaths } from '../src/cli/run/runPaths.js';

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
  questions?: QuestionRecord[];
  env?: NodeJS.ProcessEnv;
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
    env: options.env
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
  overrides: Partial<ProviderLinearWorkerProof> = {}
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
        retry_error: null
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
      question_summary: {
        queued_count: 1
      },
      running: {
        issue_identifier: 'ISSUE-1035',
        session_id: null,
        display_state: 'paused'
      },
      retry: null
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

  it('uses the same preferred same-issue running source for telemetry as the issue projection', async () => {
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
        updated_at: '2026-03-07T00:20:00.000Z'
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
        input_tokens: 5,
        output_tokens: 3,
        total_tokens: 8,
        seconds_running: 300
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

  it('prefers an authoritative proof event over the generic in_progress fallback in running rows', async () => {
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
        last_event_at: '2026-03-07T00:29:30.000Z'
      })
    ]);
    expect(sameIssueRecord?.payload.running).toMatchObject({
      issue_identifier: 'ISSUE-1037-EVENT',
      pid: '4242',
      last_event: 'turn.completed',
      last_message: 'Codex turn completed',
      last_event_at: '2026-03-07T00:29:30.000Z'
    });
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
          total_tokens: 34
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
          total_tokens: 20
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

      expect(compatibilityProjection.running).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            issue_identifier: 'ISSUE-TELEMETRY',
            session_id: 'thread-current-turn-2',
            turn_count: 2,
            tokens: {
              input_tokens: 21,
              output_tokens: 13,
              total_tokens: 34
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
      expect(compatibilityProjection.rateLimits).toEqual({
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

      expect(compatibilityProjection.rateLimits).toEqual({
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
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the same preferred same-issue running source for runtime rows and telemetry totals', async () => {
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
        input_tokens: 100,
        output_tokens: 200,
        total_tokens: 300,
        seconds_running: 600
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
      issue_identifier: 'CO-2',
      task_id: 'task-1303-child',
      state: 'running',
      run_id: 'run-child'
    });
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
          updated_at: '2026-03-07T00:00:45.000Z',
          operation_started_at: '2026-03-07T00:00:00.000Z',
          operation_elapsed_ms: 45000,
          stalled_after_ms: 45000,
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
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
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
