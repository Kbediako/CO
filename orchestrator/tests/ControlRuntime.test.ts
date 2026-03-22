import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ControlStateStore } from '../src/cli/control/controlState.js';
import { createControlRuntime } from '../src/cli/control/controlRuntime.js';
import * as liveLinearAdvisoryRuntimeModule from '../src/cli/control/liveLinearAdvisoryRuntime.js';
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

    await createSiblingRun(fixture.root, 'task-1034-running', 'run-2', {
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
});
