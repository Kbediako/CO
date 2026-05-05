import { mkdtemp, mkdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSelectedRunProjectionReader,
  discoverCompatibilityCollectionContexts,
  discoverAuthoritativeRetryCollectionContexts,
  type SelectedRunProjectionContext
} from '../src/cli/control/selectedRunProjection.js';
import type { ProviderIntakeState } from '../src/cli/control/providerIntakeState.js';
import {
  buildProviderLinearWorkerResolvedModelProvenance,
  PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME,
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  refreshProviderLinearWorkerProofSnapshot,
  type ProviderLinearWorkerChildStreamRecord,
  type ProviderLinearWorkerChildLaneRecord,
  type ProviderLinearWorkerProof
} from '../src/cli/providerLinearWorkerRunner.js';
import { REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_NOISE_SUMMARY } from '../src/cli/control/providerLinearWorkerTruth.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';

const cleanupRoots: string[] = [];
const originalCodexHome = process.env.CODEX_HOME;

afterEach(async () => {
  vi.useRealTimers();
  if (originalCodexHome === undefined) {
    delete process.env.CODEX_HOME;
  } else {
    process.env.CODEX_HOME = originalCodexHome;
  }
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createHostPaths(
  runsRootFactory: (root: string) => string = (root) => join(root, '.runs'),
  options: { taskId?: string; runId?: string } = {}
) {
  const root = await mkdtemp(join(tmpdir(), 'selected-run-projection-'));
  cleanupRoots.push(root);
  const runsRoot = runsRootFactory(root);
  const taskId = options.taskId ?? 'local-mcp';
  const runId = options.runId ?? 'control-host';
  const env = {
    repoRoot: root,
    runsRoot,
    outRoot: join(root, 'out'),
    taskId
  };
  const paths = resolveRunPaths(env, runId);
  await mkdir(paths.runDir, { recursive: true });
  await writeFile(
    paths.manifestPath,
    JSON.stringify({
      run_id: runId,
      task_id: taskId,
      status: 'in_progress',
      workspace_path: root
    }),
    'utf8'
  );
  return { root, paths };
}

function createProviderIntakeState(manifestPath: string): ProviderIntakeState {
  return {
    schema_version: 1,
    updated_at: '2026-03-20T01:15:28.970Z',
    rehydrated_at: '2026-03-20T01:15:28.970Z',
    latest_provider_key: 'linear:lin-issue-1',
    latest_reason: 'provider_issue_rehydrated_completed_run',
    claims: [
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_title: 'Autonomous intake handoff',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-20T01:10:13.574Z',
        task_id: 'linear-lin-issue-1',
        mapping_source: 'provider_id_fallback',
        state: 'completed',
        reason: 'provider_issue_rehydrated_completed_run',
        accepted_at: '2026-03-20T01:10:13.574Z',
        updated_at: '2026-03-20T01:15:28.970Z',
        last_delivery_id: 'delivery-1',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_000_000,
        run_id: 'run-child',
        run_manifest_path: manifestPath
      }
    ]
  };
}

function createProjectionReader(
  paths: Awaited<ReturnType<typeof createHostPaths>>['paths'],
  manifestPath: string,
  providerIntakeState: ProviderIntakeState = createProviderIntakeState(manifestPath)
) {
  return createSelectedRunProjectionReader(
    createProjectionContext(paths, providerIntakeState)
  );
}

function createProjectionContext(
  paths: Awaited<ReturnType<typeof createHostPaths>>['paths'],
  providerIntakeState?: ProviderIntakeState
): SelectedRunProjectionContext {
  return {
    controlStore: {
      snapshot: () => ({
        run_id: 'control-host',
        control_seq: 0,
        latest_action: null,
        history: [],
        pending_confirmation: null,
        queued_questions: null,
        question_events: [],
        sessions: null,
        transport_idempotency: null,
        provider_traces: null
      })
    },
    questionQueue: {
      list: () => []
    },
    paths,
    linearAdvisoryState: {
      tracked_issue: null
    },
    providerIntakeState
  };
}

function buildProviderLinearWorkerProof(
  overrides: Partial<ProviderLinearWorkerProof> = {}
): ProviderLinearWorkerProof {
  return {
    issue_id: 'lin-issue-1',
    issue_identifier: 'CO-2',
    thread_id: 'thread-1',
    latest_turn_id: 'turn-2',
    latest_session_id: 'thread-1-turn-2',
    latest_session_id_source: 'derived_from_thread_and_turn',
    turn_count: 2,
    last_event: 'task_complete',
    last_message: 'done',
    last_event_at: '2026-03-20T01:15:28.970Z',
    tokens: {
      input_tokens: 12,
      output_tokens: 8,
      total_tokens: 20
    },
    rate_limits: null,
    owner_phase: 'ended',
    owner_status: 'succeeded',
    workspace_path: '/tmp/workspace',
    end_reason: 'issue_inactive',
    updated_at: '2026-03-20T01:15:28.970Z',
    ...overrides
  };
}

describe('SelectedRunProjection', () => {
  it('replaces stale stage-failure summary text for succeeded selected runs with no failed commands', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary:
          "Stage 'Run delegation guard' failed with exit code 1.\nStage 'npm run test' failed with exit code 1.",
        commands: [
          { id: 'delegation-guard', status: 'succeeded', summary: 'delegation guard passed' },
          { id: 'test', status: 'succeeded', summary: 'tests passed' }
        ]
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      rawStatus: 'succeeded',
      summary: 'Completed successfully',
      lastError: null
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'succeeded',
      message: 'Completed successfully'
    });
  });

  it('preserves the manifest summary for succeeded runs when it does not look stale', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Pipeline completed with green checks.',
        commands: [{ id: 'test', status: 'succeeded', summary: 'tests passed' }]
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      summary: 'Pipeline completed with green checks.',
      lastError: null
    });
    expect(selected?.latestEvent).toMatchObject({
      message: 'Pipeline completed with green checks.'
    });
  });

  it('replaces stale failed-stage summary text for resumed in-progress runs after provider-retry acceptance', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:28.970Z',
        summary: "Stage 'Run provider linear worker' failed with exit code 1.",
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'failed',
            summary: 'previous attempt failed',
            completed_at: '2026-03-20T01:16:10.000Z'
          }
        ],
        resume_events: [
          {
            actor: 'control-host',
            reason: 'provider-retry',
            outcome: 'accepted',
            timestamp: '2026-03-20T01:16:20.000Z'
          }
        ]
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.latest_reason = 'provider_issue_rehydrated_active_run';
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      updated_at: '2026-03-20T01:16:28.970Z',
      retry_queued: false,
      retry_attempt: 2,
      retry_due_at: null,
      retry_error: 'retryable failure pending rerun'
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'in_progress',
      summary: 'Retry accepted; run resumed after a failed attempt.',
      lastError: null,
      providerRetryState: {
        active: false,
        attempt: 2,
        due_at: null,
        error: 'retryable failure pending rerun'
      },
      providerDebugSnapshot: {
        claim: {
          retry: {
            active: false,
            attempt: 2,
            due_at: null,
            error: 'retryable failure pending rerun'
          }
        }
      }
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Retry accepted; run resumed after a failed attempt.'
    });
  });

  it('replaces stale sub-pipeline failure summaries for resumed in-progress runs after provider-retry acceptance', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:28.970Z',
        summary: "Sub-pipeline 'docs-review' failed.\nSub-pipeline error: downstream failed",
        commands: [
          {
            id: 'docs-review',
            status: 'failed',
            summary: 'previous attempt failed',
            completed_at: '2026-03-20T01:16:10.000Z'
          }
        ],
        resume_events: [
          {
            actor: 'control-host',
            reason: 'provider-retry',
            outcome: 'accepted',
            timestamp: '2026-03-20T01:16:20.000Z'
          }
        ]
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.latest_reason = 'provider_issue_rehydrated_active_run';
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      updated_at: '2026-03-20T01:16:28.970Z',
      retry_queued: false,
      retry_attempt: 2,
      retry_due_at: null,
      retry_error: 'retryable failure pending rerun'
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'in_progress',
      summary: 'Retry accepted; run resumed after a failed attempt.',
      lastError: null
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Retry accepted; run resumed after a failed attempt.'
    });
  });

  it('keeps current failure summaries visible when a resumed attempt fails again after retry acceptance', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:28.970Z',
        summary: "Stage 'Run provider linear worker' failed with exit code 1.",
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'failed',
            summary: 'current attempt failed',
            completed_at: '2026-03-20T01:16:24.000Z'
          }
        ],
        resume_events: [
          {
            actor: 'control-host',
            reason: 'provider-retry',
            outcome: 'accepted',
            timestamp: '2026-03-20T01:16:20.000Z'
          }
        ]
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.latest_reason = 'provider_issue_rehydrated_active_run';
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      updated_at: '2026-03-20T01:16:28.970Z',
      retry_queued: false,
      retry_attempt: 2,
      retry_due_at: null,
      retry_error: 'retryable failure pending rerun'
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'in_progress',
      summary: "Stage 'Run provider linear worker' failed with exit code 1.",
      lastError: null
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: "Stage 'Run provider linear worker' failed with exit code 1."
    });
  });

  it('preserves optional sub-pipeline warning summaries for succeeded runs', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:28.970Z',
        summary: 'Sub-pipeline error: optional advisory timed out',
        commands: [
          {
            id: 'docs-advisory',
            status: 'skipped',
            summary: 'Sub-pipeline error: optional advisory timed out',
            completed_at: '2026-03-20T01:16:25.000Z'
          }
        ]
      }),
      'utf8'
    );

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      createProviderIntakeState(childPaths.manifestPath)
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'succeeded',
      summary: 'Sub-pipeline error: optional advisory timed out'
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'succeeded',
      message: 'Sub-pipeline error: optional advisory timed out'
    });
  });

  it('removes stale pre-resume failure summaries after a resumed run later succeeds', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:28.970Z',
        summary: "Stage 'Run provider linear worker' failed with exit code 1.\nRecovered cleanly",
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'failed',
            summary: 'previous attempt failed',
            completed_at: '2026-03-20T01:16:10.000Z'
          },
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'recovered cleanly',
            completed_at: '2026-03-20T01:16:24.000Z'
          }
        ],
        resume_events: [
          {
            actor: 'control-host',
            reason: 'provider-retry',
            outcome: 'accepted',
            timestamp: '2026-03-20T01:16:20.000Z'
          }
        ]
      }),
      'utf8'
    );

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      createProviderIntakeState(childPaths.manifestPath)
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'succeeded',
      summary: 'Recovered cleanly'
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'succeeded',
      message: 'Recovered cleanly'
    });
  });

  it('preserves current optional sub-pipeline warnings after retry acceptance while removing stale failure lines', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:28.970Z',
        summary: "Sub-pipeline 'docs-review' failed.\nSub-pipeline error: optional advisory timed out",
        commands: [
          {
            id: 'docs-review',
            status: 'failed',
            summary: 'previous attempt failed',
            completed_at: '2026-03-20T01:16:10.000Z'
          },
          {
            id: 'docs-advisory',
            status: 'skipped',
            summary: 'Sub-pipeline error: optional advisory timed out',
            completed_at: '2026-03-20T01:16:24.000Z'
          }
        ],
        resume_events: [
          {
            actor: 'control-host',
            reason: 'provider-retry',
            outcome: 'accepted',
            timestamp: '2026-03-20T01:16:20.000Z'
          }
        ]
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.latest_reason = 'provider_issue_rehydrated_active_run';
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      updated_at: '2026-03-20T01:16:28.970Z',
      retry_queued: false,
      retry_attempt: 2,
      retry_due_at: null,
      retry_error: 'retryable failure pending rerun'
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'in_progress',
      summary: 'Sub-pipeline error: optional advisory timed out',
      lastError: null
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Sub-pipeline error: optional advisory timed out'
    });
  });

  it('preserves earlier optional sub-pipeline warnings when a later stage fails and the run resumes', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:28.970Z',
        summary: "Stage 'Run provider linear worker' failed with exit code 1.\nSub-pipeline error: optional advisory timed out",
        commands: [
          {
            id: 'docs-advisory',
            status: 'skipped',
            summary: 'Sub-pipeline error: optional advisory timed out',
            completed_at: '2026-03-20T01:16:05.000Z'
          },
          {
            id: 'provider-linear-worker',
            status: 'failed',
            summary: 'previous attempt failed',
            completed_at: '2026-03-20T01:16:10.000Z'
          }
        ],
        resume_events: [
          {
            actor: 'control-host',
            reason: 'provider-retry',
            outcome: 'accepted',
            timestamp: '2026-03-20T01:16:20.000Z'
          }
        ]
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.latest_reason = 'provider_issue_rehydrated_active_run';
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      updated_at: '2026-03-20T01:16:28.970Z',
      retry_queued: false,
      retry_attempt: 2,
      retry_due_at: null,
      retry_error: 'retryable failure pending rerun'
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'in_progress',
      summary: 'Sub-pipeline error: optional advisory timed out',
      lastError: null
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Sub-pipeline error: optional advisory timed out'
    });
  });

  it('surfaces the authoritative provider debug snapshot and semantic latest event for merge closeout lanes', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Merge closeout lane active.'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'turn_completed',
          owner_status: 'in_progress',
          last_event: 'task_complete',
          last_message: 'Merge closeout lane active.',
          last_event_at: '2026-03-20T01:15:28.970Z',
          linear_audit: {
            path: join(childPaths.runDir, 'provider-linear-worker-linear-audit.jsonl'),
            attempted_count: 1,
            success_count: 1,
            failure_count: 0,
            latest_recorded_at: '2026-03-20T01:16:10.000Z',
            parallelization_entries: [],
            latest_by_operation: {
              transition: {
                recorded_at: '2026-03-20T01:16:10.000Z',
                operation: 'transition',
                ok: true,
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-2',
                source_setup: null,
                action: 'updated',
                via: null,
                state: 'Merging',
                follow_up_issue_id: null,
                follow_up_issue_identifier: null,
                failed_relation_type: null,
                comment_id: null,
                attachment_id: null,
                error_code: null,
                error_message: null
              }
            }
          }
        }),
        null,
        2
      ),
      'utf8'
    );
    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_state: 'Merging',
      reason: 'provider_issue_rehydrated_active_run',
      state: 'running',
      merge_closeout: {
        recorded_at: '2026-03-20T01:16:20.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-20T01:16:20.000Z',
        status: 'watching',
        reason: 'checks_pending',
        summary: 'Waiting for required checks before merge.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BLOCKED',
          ready_to_merge: false,
          gate_reasons: ['required_checks_pending'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 2,
          checks_failed: 0,
          required_checks_pending: 2,
          required_checks_failed: 0,
          updated_at: '2026-03-20T01:16:20.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      claim: {
        freshness: 'rehydrated',
        is_rehydrated: true
      },
      pull_request: {
        number: 82
      },
      progress: {
        phase: 'waiting_on_checks',
        kind: 'merge_closeout',
        status: 'waiting',
        recovery_recommendation: 'wait_for_checks'
      },
      stall_classification: 'waiting_on_checks'
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'waiting_on_checks',
      message: 'Waiting for required checks before merge.',
      at: '2026-03-20T01:16:20.000Z'
    });
  });

  it('prefers merge-closeout semantic progress time for latestEvent sourceUpdatedAt', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child-merge-closeout-freshness');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child-merge-closeout-freshness',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Merge closeout lane active.'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'turn_completed',
          owner_status: 'in_progress',
          last_event: 'task_complete',
          last_message: 'Merge closeout lane active.',
          last_event_at: '2026-03-20T01:15:28.970Z',
          linear_audit: {
            path: join(childPaths.runDir, 'provider-linear-worker-linear-audit.jsonl'),
            attempted_count: 1,
            success_count: 1,
            failure_count: 0,
            latest_recorded_at: '2026-03-20T01:16:40.000Z',
            parallelization_entries: [],
            latest_by_operation: {
              transition: {
                recorded_at: '2026-03-20T01:16:40.000Z',
                operation: 'transition',
                ok: true,
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-2',
                source_setup: null,
                action: 'updated',
                via: null,
                state: 'Merging',
                follow_up_issue_id: null,
                follow_up_issue_identifier: null,
                failed_relation_type: null,
                comment_id: null,
                attachment_id: null,
                error_code: null,
                error_message: null
              }
            }
          }
        }),
        null,
        2
      ),
      'utf8'
    );
    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_state: 'Merging',
      reason: 'provider_issue_rehydrated_active_run',
      state: 'running',
      merge_closeout: {
        recorded_at: '2026-03-20T01:16:20.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-20T01:16:20.000Z',
        status: 'watching',
        reason: 'checks_pending',
        summary: 'Waiting for required checks before merge.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BLOCKED',
          ready_to_merge: false,
          gate_reasons: ['required_checks_pending'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 2,
          checks_failed: 0,
          required_checks_pending: 2,
          required_checks_failed: 0,
          updated_at: '2026-03-20T01:16:20.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot?.last_semantic_progress_at).toBe('2026-03-20T01:16:40.000Z');
    expect(selected?.providerDebugSnapshot?.progress?.last_semantic_progress_at).toBe(
      '2026-03-20T01:16:20.000Z'
    );
    expect(selected?.latestEvent).toMatchObject({
      sourceUpdatedAt: '2026-03-20T01:16:20.000Z'
    });
  });

  it('uses the displayed child summary timestamp for latestEvent when newer child activity has no summary', async () => {
    const { root, paths } = await createHostPaths();
    const baseTimestampMs = Date.parse('2026-03-30T01:15:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(new Date(baseTimestampMs));
    const attemptStartedAt = new Date(baseTimestampMs - 5 * 60 * 1000).toISOString();
    const childStreamLaunchedAt = new Date(baseTimestampMs - 4 * 60 * 1000).toISOString();
    const childStreamRecordedAt = new Date(baseTimestampMs - 3.5 * 60 * 1000).toISOString();
    const childLaneLaunchAt = new Date(baseTimestampMs - 3 * 60 * 1000).toISOString();
    const childLaneDecisionAt = new Date(baseTimestampMs - 2 * 60 * 1000).toISOString();
    const updatedAt = new Date(baseTimestampMs - 60 * 1000).toISOString();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child-summary-fallback');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child-summary-fallback',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: updatedAt,
        summary: 'provider run active'
      }),
      'utf8'
    );
    const childStreams: ProviderLinearWorkerChildStreamRecord[] = [
      {
        stream: 'co-109-docs-review',
        pipeline_id: 'docs-review',
        task_id: 'linear-co-109-docs-review',
        run_id: 'run-child-stream-109',
        status: 'failed',
        manifest_path: join(childPaths.runDir, 'docs-review-manifest.json'),
        artifact_root: join(childPaths.runDir, 'docs-review-artifacts'),
        log_path: null,
        summary: 'docs-review failed at docs:freshness after spec-guard passed',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: null,
        source_setup: null,
        launched_at: childStreamLaunchedAt,
        recorded_at: childStreamRecordedAt
      }
    ];
    const childLanes: ProviderLinearWorkerChildLaneRecord[] = [
      {
        stream: 'event-truth',
        pipeline_id: 'implementation-gate',
        task_id: 'linear-co-109-event-truth',
        run_id: 'run-child-lane-109',
        status: 'completed',
        manifest_path: join(childPaths.runDir, 'event-truth-manifest.json'),
        artifact_root: join(childPaths.runDir, 'event-truth-artifacts'),
        log_path: null,
        summary: null,
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: null,
        source_setup: null,
        launched_at: childLaneLaunchAt,
        purpose: 'Tighten authoritative EVENT truth.',
        instructions: null,
        scope: {
          files: ['orchestrator/src/cli/control/providerIssueObservability.ts'],
          phases: ['implementation']
        },
        parent_snapshot: {
          base_sha: null,
          issue_updated_at: attemptStartedAt,
          issue_state: 'In Progress',
          issue_state_type: 'started',
          captured_at: childLaneLaunchAt
        },
        lane_workspace_path: null,
        patch_artifact_path: null,
        decision: 'accepted',
        in_flight_action: null,
        decision_at: childLaneDecisionAt,
        decision_reason: null
      }
    ];
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: attemptStartedAt,
          current_turn_started_at: attemptStartedAt,
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'turn_started',
          last_message: 'Provider worker turn is active.',
          last_event_at: attemptStartedAt,
          rate_limits: {
            primary: {
              used_percent: 18,
              window_minutes: 300
            },
            secondary: {
              used_percent: 52,
              window_minutes: 10080
            }
          },
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: root,
          end_reason: null,
          updated_at: updatedAt,
          child_streams: childStreams,
          child_lanes: childLanes
        }),
        null,
        2
      ),
      'utf8'
    );
    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'running',
      reason: 'provider_issue_active_run',
      updated_at: updatedAt,
      run_id: 'run-child-summary-fallback'
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      progress: {
        phase: 'turn_running',
        kind: 'worker',
        status: 'progressing',
        summary: 'docs-review failed at docs:freshness after spec-guard passed',
        summary_recorded_at: childStreamRecordedAt,
        last_semantic_progress_at: childLaneDecisionAt
      }
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'turn_running',
      message: 'docs-review failed at docs:freshness after spec-guard passed',
      at: childStreamRecordedAt,
      source: 'child_stream_summary',
      messageRecordedAt: childStreamRecordedAt,
      sourceUpdatedAt: childStreamRecordedAt
    });
    expect(selected?.latestEvent?.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'child_stream_summary',
          accepted: true,
          rejection_reason: null
        }),
        expect.objectContaining({
          source: 'generic_phase_fallback',
          accepted: false
        })
      ])
    );
  });

  it('surfaces pending shared-root reconciliation instead of terminal success after merge closeout', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-shared-root-pending');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-shared-root-pending',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-04-05T06:50:15.000Z',
        summary: 'Completed successfully'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'succeeded',
          last_event: 'task_complete',
          last_message: 'Worker exited after merge closeout.',
          last_event_at: '2026-04-05T06:50:10.000Z',
          updated_at: '2026-04-05T06:50:15.000Z',
          end_reason: 'issue_inactive'
        }),
        null,
        2
      ),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_state: 'Done',
      issue_state_type: 'completed',
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      merge_closeout: {
        recorded_at: '2026-04-05T06:50:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-05T06:50:30.000Z',
        status: 'action_required',
        reason: 'pending_shared_root_reconciliation',
        summary: 'Merged attached PR #82; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'MERGED',
          review_decision: 'APPROVED',
          merge_state_status: 'UNKNOWN',
          ready_to_merge: false,
          gate_reasons: ['state=MERGED'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-04-05T06:50:30.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: {
          status: 'skipped',
          reason: 'shared_root_dirty',
          before_status: '## main...origin/main\\n M tasks/index.json',
          after_status: '## main...origin/main\\n M tasks/index.json'
        },
        linear_transition: null
      }
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected?.displayStatus).toBe('pending_shared_root_reconciliation');
    expect(selected?.rawStatus).toBe('succeeded');
    expect(selected?.statusReason).toBe('shared_root_dirty');
    expect(selected?.summary).toBe(
      'Merged attached PR #82; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.'
    );
    expect(selected?.providerDebugSnapshot).toMatchObject({
      progress: {
        phase: 'pending_shared_root_reconciliation',
        kind: 'merge_closeout',
        status: 'stalled',
        stall_reason: 'shared_root_dirty'
      }
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'pending_shared_root_reconciliation',
      message:
        'Merged attached PR #82; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.',
      reason: 'shared_root_dirty'
    });
  });

  it('keeps failed shared-root reconciliation visible as lastError after merge closeout', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-shared-root-failed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-shared-root-failed',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-04-05T06:50:15.000Z',
        summary: 'Completed successfully'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'succeeded',
          last_event: 'task_complete',
          last_message: 'Worker exited after merge closeout.',
          last_event_at: '2026-04-05T06:50:10.000Z',
          updated_at: '2026-04-05T06:50:15.000Z',
          end_reason: 'issue_inactive'
        }),
        null,
        2
      ),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_state: 'Done',
      issue_state_type: 'completed',
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      merge_closeout: {
        recorded_at: '2026-04-05T06:50:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-05T06:50:30.000Z',
        status: 'merged',
        reason: 'shared_root_reconciliation_failed',
        summary: 'Merged attached PR #82; shared-root reconciliation failed (shared_root_fast_forward_failed) after the Linear issue transitioned to Done.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'MERGED',
          review_decision: 'APPROVED',
          merge_state_status: 'UNKNOWN',
          ready_to_merge: false,
          gate_reasons: ['state=MERGED'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-04-05T06:50:30.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: {
          status: 'failed',
          reason: 'shared_root_fast_forward_failed',
          before_status: '## main...origin/main [behind 1]',
          after_status: null
        },
        linear_transition: {
          status: 'transitioned',
          attempted_at: '2026-04-05T06:50:20.000Z',
          previous_state: 'Merging',
          target_state: 'Done',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-04-05T06:50:30.000Z',
          error: null
        }
      }
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected?.displayStatus).toBe('failed');
    expect(selected?.rawStatus).toBe('succeeded');
    expect(selected?.statusReason).toBe('shared_root_fast_forward_failed');
    expect(selected?.summary).toBe(
      'Merged attached PR #82; shared-root reconciliation failed (shared_root_fast_forward_failed) after the Linear issue transitioned to Done.'
    );
    expect(selected?.lastError).toBe('shared_root_fast_forward_failed');
    expect(selected?.latestEvent).toMatchObject({
      event: 'failed',
      reason: 'shared_root_fast_forward_failed'
    });
  });

  it('ignores stale terminal proof snapshots when the selected stage started later', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        started_at: '2026-03-20T01:20:00.000Z',
        updated_at: '2026-03-20T01:20:05.000Z',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        summary: 'Tracked issue is active.'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-03-20T01:15:00.000Z',
          owner_phase: 'ended',
          owner_status: 'succeeded',
          last_event: 'task_complete',
          last_message: 'Old worker run completed.',
          last_event_at: '2026-03-20T01:15:28.970Z',
          updated_at: '2026-03-20T01:16:00.000Z',
          end_reason: 'issue_inactive'
        }),
        null,
        2
      ),
      'utf8'
    );

    const selected = await createSelectedRunProjectionReader(
      createProjectionContext(paths, undefined)
    ).buildSelectedRunContext();

    expect(selected?.rawStatus).toBe('in_progress');
    expect(selected?.completedAt).toBeNull();
    expect(selected?.providerDebugSnapshot).toBeNull();
  });

  it('keeps the generic latest event when no provider claim or proof exists', async () => {
    const { paths } = await createHostPaths();
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Tracked issue is active.'
      }),
      'utf8'
    );

    const projectionContext = createProjectionContext(paths, undefined);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-1',
        identifier: 'CO-2',
        title: 'Tracked issue is active.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot?.progress).toMatchObject({
      phase: 'unknown',
      kind: 'workflow',
      status: 'progressing'
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Tracked issue is active.'
    });
  });

  it('rebinds fallback-only task-id identity from tracked issue state for provider-worker manifests when manifest identity is missing', async () => {
    const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
    const { paths } = await createHostPaths(undefined, { taskId });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'control-host',
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Tracked issue is active.'
      }),
      'utf8'
    );

    const projectionContext = createProjectionContext(paths, undefined);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-146',
        identifier: 'CO-146',
        title: 'Tracked issue is active.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-146',
      issueId: 'lin-issue-146'
    });
    expect(selected?.tracked?.linear).toMatchObject({
      identifier: 'CO-146',
      state: 'In Progress'
    });
    expect(selected?.lookupAliases).toEqual(
      expect.arrayContaining(['CO-146', 'lin-issue-146', taskId, 'control-host'])
    );
  });

  it('rebinds fallback-only task-id identity from tracked issue state for null-provider provider-worker manifests', async () => {
    const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
    const { paths } = await createHostPaths(undefined, { taskId });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'control-host',
        task_id: taskId,
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Tracked issue is active.'
      }),
      'utf8'
    );

    const projectionContext = createProjectionContext(paths, undefined);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-146',
        identifier: 'CO-146',
        title: 'Tracked issue is active.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-146',
      issueId: 'lin-issue-146'
    });
    expect(selected?.tracked?.linear).toMatchObject({
      identifier: 'CO-146',
      state: 'In Progress'
    });
  });

  it('does not rebind fallback-only task-id identity from tracked issue state for non-linear manifests', async () => {
    const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
    const { paths } = await createHostPaths(undefined, { taskId });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'control-host',
        task_id: taskId,
        issue_provider: 'github',
        status: 'in_progress',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Non-linear task is active.'
      }),
      'utf8'
    );

    const projectionContext = createProjectionContext(paths, undefined);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-146',
        identifier: 'CO-146',
        title: 'Tracked issue is active.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: taskId,
      issueId: taskId
    });
    expect(selected?.lookupAliases).not.toEqual(expect.arrayContaining(['CO-146', 'lin-issue-146']));
  });

  it('does not mix a tracked issue id into a manifest with a different canonical identifier', async () => {
    const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
    const { paths } = await createHostPaths(undefined, { taskId });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'control-host',
        task_id: taskId,
        issue_identifier: 'CO-146',
        issue_provider: 'linear',
        status: 'in_progress',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Manifest points at a different canonical issue.'
      }),
      'utf8'
    );

    const projectionContext = createProjectionContext(paths, undefined);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-999',
        identifier: 'CO-999',
        title: 'Tracked issue is stale.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-146',
      issueId: taskId
    });
    expect(selected?.tracked).toBeNull();
    expect(selected?.lookupAliases).not.toEqual(expect.arrayContaining(['CO-999', 'lin-issue-999']));
  });

  it('prefers a matched provider claim over tracked issue state when fallback identity is rebound', async () => {
    const taskId = 'linear-lin-issue-1';
    const { paths } = await createHostPaths(undefined, { taskId, runId: 'provider-run-1' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'provider-run-1',
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        issue_provider: 'linear',
        status: 'in_progress',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Tracked issue and provider claim disagree.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-147',
      issue_identifier: 'CO-147',
      issue_title: 'Claim-backed issue',
      issue_state: 'Human Review',
      issue_state_type: 'started',
      task_id: taskId,
      run_id: 'provider-run-1',
      run_manifest_path: paths.manifestPath,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run'
    };

    const projectionContext = createProjectionContext(paths, providerIntakeState);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-146',
        identifier: 'CO-146',
        title: 'Tracked issue is active.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-147',
      issueId: 'lin-issue-147',
      taskId,
      runId: 'provider-run-1'
    });
    expect(selected?.lookupAliases).toEqual(
      expect.arrayContaining(['CO-147', 'lin-issue-147', taskId, 'provider-run-1'])
    );
    expect(selected?.lookupAliases).not.toEqual(expect.arrayContaining(['CO-146', 'lin-issue-146']));
    expect(selected?.compatibilityState).toBe('Human Review');
    expect(selected?.tracked).toBeNull();
    expect(selected?.providerDebugSnapshot?.live_linear_state).toEqual({
      state: null,
      state_type: null,
      updated_at: null
    });
  });

  it('rebinds fallback-only provider-worker task ids from tracked issue state when only pipeline_id survives', async () => {
    const taskId = 'linear-lin-issue-146';
    const { paths } = await createHostPaths(undefined, { taskId, runId: 'provider-run-1' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'provider-run-1',
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Legacy worker manifest only retained pipeline_id provenance.'
      }),
      'utf8'
    );

    const projectionContext = createProjectionContext(paths, createProviderIntakeState(paths.manifestPath));
    projectionContext.providerIntakeState = undefined;
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-146',
        identifier: 'CO-146',
        title: 'Tracked issue is active.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-146',
      issueId: 'lin-issue-146',
      taskId,
      runId: 'provider-run-1'
    });
    expect(selected?.tracked?.linear).toMatchObject({
      identifier: 'CO-146',
      id: 'lin-issue-146'
    });
    expect(selected?.lookupAliases).toEqual(
      expect.arrayContaining(['CO-146', 'lin-issue-146', taskId, 'provider-run-1'])
    );
  });

  it('does not rebind fallback-only linear-tagged custom runs from tracked issue state', async () => {
    const taskId = 'linear-lin-issue-146';
    const { paths } = await createHostPaths(undefined, { taskId, runId: 'provider-run-1' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'provider-run-1',
        task_id: taskId,
        pipeline_id: 'custom-background-pipeline',
        pipeline_title: 'Custom Background Pipeline',
        issue_provider: 'linear',
        status: 'in_progress',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Linear-tagged custom run should keep its fallback task identity.'
      }),
      'utf8'
    );

    const projectionContext = createProjectionContext(paths, createProviderIntakeState(paths.manifestPath));
    projectionContext.providerIntakeState = undefined;
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-146',
        identifier: 'CO-146',
        title: 'Tracked issue is active.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: taskId,
      issueId: taskId,
      taskId,
      runId: 'provider-run-1'
    });
    expect(selected?.lookupAliases).not.toEqual(
      expect.arrayContaining(['CO-146', 'lin-issue-146'])
    );
  });

  it('rebinds fallback-only parent provider-worker task ids from a canonical claim when only task_id matches', async () => {
    const taskId = 'linear-lin-issue-147';
    const { paths } = await createHostPaths(undefined, { taskId, runId: 'provider-run-1' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'provider-run-1',
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        issue_provider: 'linear',
        status: 'in_progress',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Parent provider-worker manifest only has fallback task identity.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-147',
      issue_identifier: 'CO-147',
      issue_title: 'Claim-backed issue',
      issue_state: 'Human Review',
      issue_state_type: 'started',
      task_id: taskId,
      run_id: null,
      run_manifest_path: null,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run'
    };

    const selected = await createSelectedRunProjectionReader(
      createProjectionContext(paths, providerIntakeState)
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-147',
      issueId: 'lin-issue-147',
      taskId,
      runId: 'provider-run-1',
      compatibilityState: 'Human Review'
    });
    expect(selected?.lookupAliases).toEqual(
      expect.arrayContaining(['CO-147', 'lin-issue-147', taskId, 'provider-run-1'])
    );
    expect(selected?.tracked).toBeNull();
  });

  it('lets active run-bound claims outrank stale tracked issue state for compatibility state', async () => {
    const taskId = 'linear-lin-issue-1';
    const { paths } = await createHostPaths(undefined, { taskId, runId: 'provider-run-1' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'provider-run-1',
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        issue_provider: 'linear',
        status: 'in_progress',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Tracked issue and provider claim refer to the same issue with different states.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-147',
      issue_identifier: 'CO-147',
      issue_title: 'Claim-backed issue',
      issue_state: 'Human Review',
      issue_state_type: 'started',
      task_id: taskId,
      run_id: 'provider-run-1',
      run_manifest_path: paths.manifestPath,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run'
    };

    const projectionContext = createProjectionContext(paths, providerIntakeState);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-147',
        identifier: 'CO-147',
        title: 'Tracked issue is stale.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:10:00.000Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-147',
      issueId: 'lin-issue-147',
      compatibilityState: 'Human Review'
    });
    expect(selected?.tracked?.linear).toMatchObject({
      identifier: 'CO-147',
      state: 'In Progress'
    });
  });

  it('prefers fresher tracked issue state over stale rehydrated active claim state', async () => {
    const taskId = 'linear-lin-issue-147';
    const { paths } = await createHostPaths(undefined, { taskId, runId: 'provider-run-1' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'provider-run-1',
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        issue_provider: 'linear',
        status: 'in_progress',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'Tracked issue and provider claim refer to the same issue with different freshness.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-147',
      issue_identifier: 'CO-147',
      issue_title: 'Claim-backed issue',
      issue_state: 'Human Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-20T01:15:00.000Z',
      task_id: taskId,
      run_id: 'provider-run-1',
      run_manifest_path: paths.manifestPath,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run'
    };

    const projectionContext = createProjectionContext(paths, providerIntakeState);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-147',
        identifier: 'CO-147',
        title: 'Tracked issue has already advanced.',
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-03-20T01:16:30.000Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-147',
      issueId: 'lin-issue-147',
      compatibilityState: 'Merging',
      displayStatus: 'Merging'
    });
    expect(selected?.tracked?.linear).toMatchObject({
      identifier: 'CO-147',
      state: 'Merging'
    });
  });

  it('suppresses stale rehydrated merge-closeout PR truth when a fresher tracked issue has reset to Rework', async () => {
    const taskId = 'linear-lin-issue-220';
    const { paths } = await createHostPaths(undefined, { taskId, runId: 'provider-run-reset-rework' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'provider-run-reset-rework',
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        issue_provider: 'linear',
        status: 'in_progress',
        updated_at: '2026-04-17T13:10:30.000Z',
        summary: 'Claim still carries stale Merging merge-closeout residue.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-220',
      issue_identifier: 'CO-220',
      issue_title: 'Reset Rework truth',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-17T13:10:30.000Z',
      task_id: taskId,
      run_id: 'provider-run-reset-rework',
      run_manifest_path: paths.manifestPath,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      merge_closeout: {
        recorded_at: '2026-04-17T13:10:30.000Z',
        issue_id: 'lin-issue-220',
        issue_identifier: 'CO-220',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-17T13:10:30.000Z',
        status: 'action_required',
        reason: 'pr_closed_unmerged',
        summary: 'Attached PR #357 is closed without merging; reopen it or attach a replacement PR.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
        ignored_historical_pr_urls: [],
        conflicting_attached_pr_urls: [],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/357',
          owner: 'asabeko',
          repo: 'CO',
          number: 357
        },
        snapshot: {
          state: 'CLOSED',
          review_decision: 'APPROVED',
          merge_state_status: 'UNKNOWN',
          ready_to_merge: false,
          gate_reasons: ['state=CLOSED'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-04-17T13:10:30.000Z',
          merged_at: null,
          head_oid: 'closed-pr-head'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    };

    const projectionContext = createProjectionContext(paths, providerIntakeState);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-220',
        identifier: 'CO-220',
        title: 'Reset Rework truth',
        state: 'Rework',
        state_type: 'started',
        updated_at: '2026-04-17T13:11:00.000Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-220',
      issueId: 'lin-issue-220',
      compatibilityState: 'Rework',
      displayStatus: 'Rework'
    });
    expect(selected?.tracked?.linear).toMatchObject({
      identifier: 'CO-220',
      state: 'Rework'
    });
    expect(selected?.providerDebugSnapshot?.live_linear_state).toEqual({
      state: 'Rework',
      state_type: 'started',
      updated_at: '2026-04-17T13:11:00.000Z'
    });
    expect(selected?.providerDebugSnapshot?.pull_request).toBeNull();
    expect(selected?.providerDebugSnapshot?.progress?.kind).not.toBe('merge_closeout');
    expect(selected?.latestEvent?.message ?? '').not.toContain('closed without merging');
  });

  it('rebinds fallback-only synthetic child task ids from the parent claim task prefix', async () => {
    const parentTaskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
    const childTaskId = `${parentTaskId}-docs-review`;
    const { paths } = await createHostPaths(undefined, { taskId: childTaskId, runId: 'run-child' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: childTaskId,
        pipeline_id: 'docs-review',
        status: 'in_progress',
        issue_provider: 'linear',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Child docs review run is active.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: '0b49c08c-53a1-4225-8d09-28457165fbc8',
      issue_identifier: 'CO-146',
      issue_title: 'Parent issue claim',
      task_id: parentTaskId,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: null,
      run_manifest_path: null
    };

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-146',
      issueId: '0b49c08c-53a1-4225-8d09-28457165fbc8',
      taskId: childTaskId,
      runId: 'run-child'
    });
    expect(selected?.lookupAliases).toEqual(
      expect.arrayContaining(['CO-146', '0b49c08c-53a1-4225-8d09-28457165fbc8', childTaskId, 'run-child'])
    );
  });

  it('does not rebind fallback-only parent task ids for non-worker linear manifests', async () => {
    const taskId = 'linear-lin-issue-147';
    const { paths } = await createHostPaths(undefined, { taskId, runId: 'provider-run-1' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'provider-run-1',
        task_id: taskId,
        pipeline_id: 'custom-background-pipeline',
        pipeline_title: 'Custom Background Pipeline',
        issue_provider: 'linear',
        status: 'in_progress',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Linear-tagged custom pipeline should not adopt fallback claim binding.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-147',
      issue_identifier: 'CO-147',
      issue_title: 'Claim-backed issue',
      issue_state: 'Human Review',
      issue_state_type: 'started',
      task_id: taskId,
      run_id: null,
      run_manifest_path: null,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run'
    };

    const selected = await createSelectedRunProjectionReader(
      createProjectionContext(paths, providerIntakeState)
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: taskId,
      issueId: taskId,
      taskId,
      runId: 'provider-run-1'
    });
    expect(selected?.lookupAliases).not.toEqual(
      expect.arrayContaining(['CO-147', 'lin-issue-147'])
    );
    expect(selected?.compatibilityState).toBeNull();
  });

  it('prefers the strongest matching child-task prefix claim when multiple fallback parents overlap', async () => {
    const shorterParentTaskId = 'linear-lin';
    const strongerParentTaskId = 'linear-lin-issue-1';
    const childTaskId = `${strongerParentTaskId}-docs-review`;
    const { paths } = await createHostPaths(undefined, { taskId: childTaskId, runId: 'run-child' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: childTaskId,
        pipeline_id: 'docs-review',
        status: 'in_progress',
        issue_provider: 'linear',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Child docs review run is active.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin',
      issue_identifier: 'CO-1',
      issue_title: 'Shorter parent issue claim',
      task_id: shorterParentTaskId,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: null,
      run_manifest_path: null
    };
    providerIntakeState.claims.push({
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Stronger parent issue claim',
      task_id: strongerParentTaskId
    });

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      issueId: 'lin-issue-1',
      taskId: childTaskId,
      runId: 'run-child'
    });
    expect(selected?.lookupAliases).toEqual(
      expect.arrayContaining(['CO-2', 'lin-issue-1', childTaskId, 'run-child'])
    );
    expect(selected?.lookupAliases).not.toEqual(expect.arrayContaining(['CO-1', 'lin']));
  });

  it('rebinds fallback-only slug-shaped synthetic child task ids from the parent claim task prefix', async () => {
    const parentTaskId = 'linear-lin-issue-1';
    const childTaskId = `${parentTaskId}-docs-review`;
    const { paths } = await createHostPaths(undefined, { taskId: childTaskId, runId: 'run-child' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: childTaskId,
        pipeline_id: 'docs-review',
        status: 'in_progress',
        issue_provider: 'linear',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Child docs review run is active.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Parent issue claim',
      task_id: parentTaskId,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: null,
      run_manifest_path: null
    };

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      issueId: 'lin-issue-1',
      taskId: childTaskId,
      runId: 'run-child'
    });
    expect(selected?.lookupAliases).toEqual(
      expect.arrayContaining(['CO-2', 'lin-issue-1', childTaskId, 'run-child'])
    );
  });

  it('rebinds fallback-only synthetic child task ids when only provider-worker proof proves provenance', async () => {
    const parentTaskId = 'linear-lin-issue-1';
    const childTaskId = `${parentTaskId}-docs-review`;
    const { root, paths } = await createHostPaths(undefined, { taskId: childTaskId, runId: 'run-child' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: childTaskId,
        pipeline_id: 'docs-review',
        status: 'in_progress',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Proof-backed child docs review run is active.'
      }),
      'utf8'
    );
    await writeFile(
      join(paths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: root,
          updated_at: '2026-03-20T01:15:29.970Z'
        })
      ),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Parent issue claim',
      task_id: parentTaskId,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: null,
      run_manifest_path: null
    };

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      issueId: 'lin-issue-1',
      taskId: childTaskId,
      runId: 'run-child'
    });
    expect(selected?.lookupAliases).toEqual(
      expect.arrayContaining(['CO-2', 'lin-issue-1', childTaskId, 'run-child'])
    );
  });

  it('does not rebind fallback-only synthetic child task ids for null-provider non-worker manifests', async () => {
    const parentTaskId = 'linear-lin-issue-1';
    const childTaskId = `${parentTaskId}-docs-review`;
    const { paths } = await createHostPaths(undefined, { taskId: childTaskId, runId: 'run-child' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: childTaskId,
        pipeline_id: 'custom-background-pipeline',
        pipeline_title: 'Custom Background Pipeline',
        status: 'in_progress',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Custom pipeline run should not adopt a provider child prefix claim.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Parent issue claim',
      task_id: parentTaskId,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: null,
      run_manifest_path: null
    };

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: childTaskId,
      issueId: childTaskId,
      taskId: childTaskId,
      runId: 'run-child'
    });
    expect(selected?.lookupAliases).not.toEqual(expect.arrayContaining(['CO-2', 'lin-issue-1']));
  });

  it('does not rebind fallback-only child task ids for null-provider docs-review runs', async () => {
    const parentTaskId = 'linear-lin-issue-1';
    const childTaskId = `${parentTaskId}-docs-review`;
    const { paths } = await createHostPaths(undefined, { taskId: childTaskId, runId: 'run-child' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: childTaskId,
        pipeline_id: 'docs-review',
        status: 'in_progress',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Generic docs review run should not adopt a provider child prefix claim.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Parent issue claim',
      task_id: parentTaskId,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: null,
      run_manifest_path: null
    };

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: childTaskId,
      issueId: childTaskId,
      taskId: childTaskId,
      runId: 'run-child'
    });
    expect(selected?.lookupAliases).not.toEqual(expect.arrayContaining(['CO-2', 'lin-issue-1']));
  });

  it('treats child manifests whose issue identity still points at the parent fallback task id as fallback-only', async () => {
    const parentTaskId = 'linear-lin-issue-1';
    const childTaskId = `${parentTaskId}-docs-review`;
    const { paths } = await createHostPaths(undefined, { taskId: childTaskId, runId: 'run-child' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: childTaskId,
        pipeline_id: 'docs-review',
        issue_identifier: parentTaskId,
        issue_id: parentTaskId,
        status: 'in_progress',
        issue_provider: 'linear',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Child docs review run is active.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Parent issue claim',
      task_id: parentTaskId,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: null,
      run_manifest_path: null
    };

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      issueId: 'lin-issue-1',
      taskId: childTaskId,
      runId: 'run-child'
    });
    expect(selected?.lookupAliases).toEqual(
      expect.arrayContaining(['CO-2', 'lin-issue-1', childTaskId, 'run-child'])
    );
  });

  it('does not rebind synthetic child task prefixes for non-linear manifests', async () => {
    const parentTaskId = 'linear-lin-issue-1';
    const childTaskId = `${parentTaskId}-docs-review`;
    const { paths } = await createHostPaths(undefined, { taskId: childTaskId, runId: 'run-child' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: childTaskId,
        pipeline_id: 'docs-review',
        status: 'in_progress',
        issue_provider: 'github',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Non-linear child docs review run is active.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Parent issue claim',
      task_id: parentTaskId,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: null,
      run_manifest_path: null
    };

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: childTaskId,
      issueId: childTaskId,
      taskId: childTaskId,
      runId: 'run-child'
    });
    expect(selected?.lookupAliases).not.toEqual(expect.arrayContaining(['CO-2', 'lin-issue-1']));
  });

  it('does not treat a longer provider-worker parent task id as a child-prefix match for a shorter claim task id', async () => {
    const shorterParentTaskId = 'linear-lin-issue-1';
    const longerParentTaskId = 'linear-lin-issue-1-2';
    const { paths } = await createHostPaths(undefined, {
      taskId: longerParentTaskId,
      runId: 'run-parent-2'
    });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'run-parent-2',
        task_id: longerParentTaskId,
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Another parent provider-worker run should not bind the shorter issue claim.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Shorter parent issue claim',
      task_id: shorterParentTaskId,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: null,
      run_manifest_path: null
    };

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: longerParentTaskId,
      issueId: longerParentTaskId,
      taskId: longerParentTaskId,
      runId: 'run-parent-2'
    });
    expect(selected?.lookupAliases).not.toEqual(expect.arrayContaining(['CO-2', 'lin-issue-1']));
  });

  it('does not treat a different parent slug as a docs-review child match for a shorter claim task id', async () => {
    const shorterParentTaskId = 'linear-lin-issue-1';
    const longerParentTaskId = 'linear-lin-issue-1-2';
    const childTaskId = `${longerParentTaskId}-docs-review`;
    const { paths } = await createHostPaths(undefined, {
      taskId: childTaskId,
      runId: 'run-child-2'
    });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'run-child-2',
        task_id: childTaskId,
        pipeline_id: 'docs-review',
        status: 'in_progress',
        issue_provider: 'linear',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Child docs-review run should not bind the shorter parent issue claim.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Shorter parent issue claim',
      task_id: shorterParentTaskId,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: null,
      run_manifest_path: null
    };

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: childTaskId,
      issueId: childTaskId,
      taskId: childTaskId,
      runId: 'run-child-2'
    });
    expect(selected?.lookupAliases).not.toEqual(expect.arrayContaining(['CO-2', 'lin-issue-1']));
  });

  it('does not rebind non-synthetic child task prefixes to a provider claim', async () => {
    const parentTaskId = 'task-parent';
    const childTaskId = `${parentTaskId}-docs-review`;
    const { paths } = await createHostPaths(undefined, { taskId: childTaskId, runId: 'run-child' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: childTaskId,
        status: 'in_progress',
        issue_provider: 'linear',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Child docs review run is active.'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-146',
      issue_identifier: 'CO-146',
      issue_title: 'Parent issue claim',
      task_id: parentTaskId,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: null,
      run_manifest_path: null
    };

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: childTaskId,
      issueId: childTaskId,
      taskId: childTaskId,
      runId: 'run-child'
    });
  });

  it('keeps the generic latest event when provider evidence is only a stale claim', async () => {
    const { paths } = await createHostPaths();
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Tracked issue is active.'
      }),
      'utf8'
    );
    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'stale',
      reason: 'provider_issue_stale',
      updated_at: '2026-03-20T01:14:28.970Z'
    };

    const projectionContext = createProjectionContext(paths, providerIntakeState);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-1',
        identifier: 'CO-2',
        title: 'Tracked issue is active.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      claim: {
        freshness: 'stale'
      },
      progress: {
        phase: 'unknown',
        kind: 'workflow',
        status: 'progressing'
      }
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Tracked issue is active.'
    });
  });

  it('keeps the generic latest event when stale claim merge-closeout data is the only provider evidence', async () => {
    const { paths } = await createHostPaths();
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Tracked issue is active.'
      }),
      'utf8'
    );
    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'stale',
      reason: 'provider_issue_stale',
      updated_at: '2026-03-20T01:14:28.970Z',
      issue_state: 'Merging',
      issue_state_type: 'started',
      merge_closeout: {
        recorded_at: '2026-03-20T01:16:20.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-20T01:16:20.000Z',
        status: 'watching',
        reason: 'checks_pending',
        summary: 'Waiting for required checks before merge.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BLOCKED',
          ready_to_merge: false,
          gate_reasons: ['required_checks_pending'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 2,
          checks_failed: 0,
          required_checks_pending: 2,
          required_checks_failed: 0,
          updated_at: '2026-03-20T01:16:20.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    };

    const projectionContext = createProjectionContext(paths, providerIntakeState);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-1',
        identifier: 'CO-2',
        title: 'Tracked issue is active.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      claim: {
        freshness: 'stale'
      },
      pull_request: {
        number: 82
      },
      progress: {
        phase: 'waiting_on_checks',
        kind: 'merge_closeout',
        status: 'waiting'
      }
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Tracked issue is active.'
    });
  });

  it('keeps post-promotion merge closeout pending visible in the selected-run debug snapshot', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-review-promotion');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-review-promotion',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updatedAt: '2026-03-20T01:16:00.000Z',
        summary: 'Promoted the issue from In Review to Merging.',
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'Promoted the issue from In Review to Merging.'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          last_message: 'Promoted the issue from In Review to Merging.',
          last_event_at: '2026-03-20T01:15:58.000Z',
          updated_at: '2026-03-20T01:16:00.000Z'
        })
      ),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.updated_at = '2026-03-20T01:16:00.000Z';
    providerIntakeState.latest_reason = 'provider_issue_review_promotion_promoted';
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'completed',
      reason: 'provider_issue_review_promotion_promoted',
      updated_at: '2026-03-20T01:16:00.000Z',
      run_id: 'run-review-promotion',
      run_manifest_path: childPaths.manifestPath,
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-20T01:16:00.000Z',
      review_promotion: {
        recorded_at: '2026-03-20T01:16:00.000Z',
        status: 'promoted',
        reason: 'promoted_to_merging',
        summary: 'Promoted the issue from In Review to Merging after confirming the attached PR is merge-ready.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        ignored_historical_pr_urls: [],
        conflicting_attached_pr_urls: [],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'CLEAN',
          ready_to_merge: true,
          gate_reasons: [],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-03-20T01:15:59.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        linear_transition: {
          status: 'transitioned',
          attempted_at: '2026-03-20T01:16:00.000Z',
          previous_state: 'In Review',
          target_state: 'Merging',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T01:16:00.000Z',
          error: null
        }
      },
      merge_closeout: null
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      pull_request: {
        review_promotion_status: 'promoted',
        merge_closeout_status: null,
        number: 82,
        ready_to_merge: true
      },
      progress: {
        phase: 'watching_merge',
        kind: 'workflow',
        status: 'progressing',
        recovery_recommendation: 'continue_waiting'
      },
      stall_classification: 'progressing'
    });
    expect(selected?.providerDebugSnapshot?.progress?.summary).toBe(
      'Promoted the issue from In Review to Merging after confirming the attached PR is merge-ready. Waiting for merge closeout to start.'
    );
  });

  it('keeps stale pending shared-root reconciliation visible until the live issue reaches a terminal state', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-stale-shared-root-pending');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-stale-shared-root-pending',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-04-05T06:50:15.000Z',
        summary: 'Completed successfully'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-05T06:50:30.000Z',
      state: 'stale',
      reason: 'provider_issue_stale',
      merge_closeout: {
        recorded_at: '2026-04-05T06:50:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-05T06:50:30.000Z',
        status: 'action_required',
        reason: 'pending_shared_root_reconciliation',
        summary: 'Merged attached PR #82; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'MERGED',
          review_decision: 'APPROVED',
          merge_state_status: 'UNKNOWN',
          ready_to_merge: false,
          gate_reasons: ['state=MERGED'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-04-05T06:50:30.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: {
          status: 'skipped',
          reason: 'shared_root_dirty',
          before_status: '## main...origin/main\\n M tasks/index.json',
          after_status: '## main...origin/main\\n M tasks/index.json'
        },
        linear_transition: null
      }
    };

    const projectionContext = createProjectionContext(paths, providerIntakeState);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-1',
        identifier: 'CO-2',
        title: 'Shared-root reconciliation is still pending.',
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-05T06:51:00.000Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      claim: {
        freshness: 'stale'
      },
      progress: {
        phase: 'pending_shared_root_reconciliation',
        kind: 'merge_closeout',
        status: 'stalled',
        stall_reason: 'shared_root_dirty'
      }
    });
    expect(selected?.rawStatus).toBe('succeeded');
    expect(selected?.displayStatus).toBe('pending_shared_root_reconciliation');
    expect(selected?.statusReason).toBe('shared_root_dirty');
    expect(selected?.latestEvent).toMatchObject({
      event: 'pending_shared_root_reconciliation',
      message:
        'Merged attached PR #82; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.',
      reason: 'shared_root_dirty'
    });
  });

  it('keeps stale pending shared-root reconciliation visible when a mismatched tracked issue is already terminal', async () => {
    const taskId = 'linear-lin-issue-1';
    const { paths } = await createHostPaths(undefined, { taskId, runId: 'run-stale-shared-root-pending' });
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'run-stale-shared-root-pending',
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        updated_at: '2026-04-05T06:50:15.000Z',
        summary: 'Completed successfully'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      task_id: taskId,
      run_id: null,
      run_manifest_path: null,
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-05T06:50:30.000Z',
      state: 'stale',
      reason: 'provider_issue_stale',
      merge_closeout: {
        recorded_at: '2026-04-05T06:50:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-05T06:50:30.000Z',
        status: 'action_required',
        reason: 'pending_shared_root_reconciliation',
        summary: 'Merged attached PR #82; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'MERGED',
          review_decision: 'APPROVED',
          merge_state_status: 'UNKNOWN',
          ready_to_merge: false,
          gate_reasons: ['state=MERGED'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-04-05T06:50:30.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: {
          status: 'skipped',
          reason: 'shared_root_dirty',
          before_status: '## main...origin/main\\n M tasks/index.json',
          after_status: '## main...origin/main\\n M tasks/index.json'
        },
        linear_transition: null
      }
    };

    const projectionContext = createProjectionContext(paths, providerIntakeState);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-99',
        identifier: 'CO-99',
        title: 'Different issue is already done.',
        state: 'Done',
        state_type: 'completed',
        updated_at: '2026-04-05T06:51:00.000Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      live_linear_state: {
        state: null,
        state_type: null,
        updated_at: null
      },
      claim: {
        freshness: 'stale'
      },
      progress: {
        phase: 'pending_shared_root_reconciliation',
        kind: 'merge_closeout',
        status: 'stalled',
        stall_reason: 'shared_root_dirty'
      }
    });
    expect(selected?.displayStatus).toBe('pending_shared_root_reconciliation');
    expect(selected?.statusReason).toBe('shared_root_dirty');
    expect(selected?.latestEvent).toMatchObject({
      event: 'pending_shared_root_reconciliation',
      reason: 'shared_root_dirty'
    });
  });

  it('does not borrow provider claims from same-issue sibling runs', async () => {
    const { root } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const selectedPaths = resolveRunPaths(childEnv, 'run-selected');
    await mkdir(selectedPaths.runDir, { recursive: true });
    await writeFile(
      selectedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-selected',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Selected sibling run is active.'
      }),
      'utf8'
    );
    const activePaths = resolveRunPaths(childEnv, 'run-active');
    const providerIntakeState = createProviderIntakeState(activePaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      run_id: 'run-active',
      run_manifest_path: activePaths.manifestPath,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      merge_closeout: {
        recorded_at: '2026-03-20T01:16:20.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-20T01:16:20.000Z',
        status: 'watching',
        reason: 'checks_pending',
        summary: 'Waiting for required checks before merge.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BLOCKED',
          ready_to_merge: false,
          gate_reasons: ['required_checks_pending'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 2,
          checks_failed: 0,
          required_checks_pending: 2,
          required_checks_failed: 0,
          updated_at: '2026-03-20T01:16:20.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    };

    const selected = await createSelectedRunProjectionReader(
      createProjectionContext(selectedPaths, providerIntakeState)
    ).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toBeNull();
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Selected sibling run is active.'
    });
  });

  it('prefers the selected issue claim over a different-task claim with the same run id', async () => {
    const { root } = await createHostPaths();
    const selectedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const selectedPaths = resolveRunPaths(selectedEnv, 'run-child');
    await mkdir(selectedPaths.runDir, { recursive: true });
    await writeFile(
      selectedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Selected run stays scoped to its own issue.'
      }),
      'utf8'
    );

    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:16:00.000Z',
      rehydrated_at: '2026-03-20T01:16:00.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-99',
          issue_id: 'lin-issue-99',
          issue_identifier: 'CO-99',
          issue_title: 'Different task with colliding run id',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T01:16:10.000Z',
          task_id: 'linear-lin-issue-99',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T01:12:00.000Z',
          updated_at: '2026-03-20T01:16:10.000Z',
          last_delivery_id: 'delivery-99',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_010_000,
          run_id: 'run-child',
          run_manifest_path: join(root, '.runs', 'linear-lin-issue-99', 'cli', 'run-child', 'manifest.json')
        },
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Selected run issue',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T01:16:20.000Z',
          task_id: 'linear-lin-issue-1',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T01:12:30.000Z',
          updated_at: '2026-03-20T01:16:20.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_020_000,
          run_id: 'run-child',
          run_manifest_path: selectedPaths.manifestPath
        }
      ]
    };

    const selected = await createSelectedRunProjectionReader(
      createProjectionContext(selectedPaths, providerIntakeState)
    ).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      claim: {
        reason: 'provider_issue_rehydrated_active_run',
        run_id: 'run-child',
        updated_at: '2026-03-20T01:16:20.000Z'
      }
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Selected run stays scoped to its own issue.'
    });
  });

  it('does not synthesize completedAt for queued selected runs', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Queued for retry.'
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'queued',
      summary: 'Queued for retry.',
      completedAt: null
    });
  });

  it('treats canceled selected runs as terminal for completedAt projection', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'canceled',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Run canceled by operator.'
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'canceled',
      completedAt: '2026-03-20T01:15:28.970Z'
    });
  });

  it('prefers newer failed provider proof over an optimistic manifest status', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Provider linear worker completed with forced standalone review enabled for handoff',
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'Provider linear worker completed with forced standalone review enabled for handoff'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: 'codex_exit_1',
          updated_at: '2026-03-20T01:15:29.970Z'
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'failed'
    });
    expect(selected?.summary).toContain('Provider linear worker failed with Codex exit code 1.');
    expect(selected?.lastError).toContain('Provider linear worker failed with Codex exit code 1.');
  });

  it('honors camelCase manifest timestamps before preferring older provider proof', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updatedAt: '2026-03-20T01:15:30.970Z',
        summary: 'Provider linear worker reached review handoff.',
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'Provider linear worker reached review handoff.'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: 'codex_exit_1',
          updated_at: '2026-03-20T01:15:29.970Z'
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'succeeded',
      summary: 'Provider linear worker reached review handoff.',
      lastError: null
    });
  });

  it('preserves provider-worker review log noise notes when terminal proof drives selected-run summary', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    const commandSummary = [
      'Provider linear worker reached review handoff. (review outcome: bounded success via command-intent; not a wrapper failure;',
      `${REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_NOISE_SUMMARY})`
    ].join(' ');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Provider linear worker reached review handoff.',
        commands: [
          {
            id: 'provider-linear-worker',
            title: 'Provider Linear Worker',
            status: 'succeeded',
            summary: commandSummary
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'succeeded',
          end_reason: 'issue_review_handoff',
          updated_at: '2026-03-20T01:15:29.970Z'
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'succeeded',
      lastError: null
    });
    expect(selected?.summary).toContain('Provider linear worker reached review handoff.');
    expect(selected?.summary).toContain(REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_NOISE_SUMMARY);
    expect(selected?.latestEvent.message).toContain(REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_NOISE_SUMMARY);
  });

  it('preserves provider-worker review log noise notes for failed terminal proof projections', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    const commandSummary = [
      'Provider linear worker failed with Codex exit code 1.',
      `(${REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_NOISE_SUMMARY})`
    ].join(' ');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Provider linear worker failed with Codex exit code 1.',
        commands: [
          {
            id: 'provider-linear-worker',
            title: 'Provider Linear Worker',
            status: 'failed',
            summary: commandSummary
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: 'codex_exit_1',
          updated_at: '2026-03-20T01:15:29.970Z'
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'failed'
    });
    expect(selected?.summary).toContain('Provider linear worker failed with Codex exit code 1.');
    expect(selected?.summary).toContain(REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_NOISE_SUMMARY);
    expect(selected?.lastError).toContain(REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_NOISE_SUMMARY);
    expect(selected?.latestEvent?.message).toContain(
      REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_NOISE_SUMMARY
    );
  });

  it('ignores terminal proof rewritten from a prior attempt after a rerun starts', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        started_at: '2026-03-20T01:15:30.970Z',
        updated_at: '2026-03-20T01:15:29.970Z',
        summary: 'Provider linear worker reached review handoff.',
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'Provider linear worker reached review handoff.'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: 'codex_exit_1',
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          updated_at: '2026-03-20T01:15:31.970Z'
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'succeeded',
      summary: 'Provider linear worker reached review handoff.',
      lastError: null
    });
  });

  it('ignores deterministic mutation suppressions recorded before the current provider attempt', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Provider linear worker completed with forced standalone review enabled for handoff',
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'Provider linear worker completed with forced standalone review enabled for handoff'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          linear_audit: {
            path: '/tmp/provider-linear-worker-linear-audit.jsonl',
            attempted_count: 1,
            success_count: 0,
            failure_count: 1,
            latest_recorded_at: '2026-03-20T01:15:27.970Z',
            parallelization_entries: [],
            latest_by_operation: {
              'create-follow-up': {
                recorded_at: '2026-03-20T01:15:27.970Z',
                operation: 'create-follow-up',
                ok: false,
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-2',
                source_setup: null,
                action: null,
                via: null,
                state: null,
                follow_up_issue_id: null,
                follow_up_issue_identifier: null,
                failed_relation_type: null,
                comment_id: null,
                attachment_id: null,
                error_code: 'linear_follow_up_parity_matrix_missing',
                error_message: 'Parity/alignment follow-up issues require a parity matrix.'
              }
            }
          }
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.summary).toContain('Provider linear worker stopped because the issue was no longer active.');
    expect(selected?.summary).not.toContain('deterministic provider mutation suppressed');
  });

  it('includes current archived issue mutation suppressions in the selected-run summary', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:29.970Z',
        summary: 'Provider linear worker completed with forced standalone review enabled for handoff',
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'Provider linear worker completed with forced standalone review enabled for handoff'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'succeeded',
          end_reason: 'issue_inactive',
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          updated_at: '2026-03-20T01:15:30.970Z',
          linear_audit: {
            path: '/tmp/provider-linear-worker-linear-audit.jsonl',
            attempted_count: 1,
            success_count: 0,
            failure_count: 1,
            latest_recorded_at: '2026-03-20T01:15:29.970Z',
            parallelization_entries: [],
            latest_by_operation: {
              'upsert-workpad': {
                recorded_at: '2026-03-20T01:15:29.970Z',
                operation: 'upsert-workpad',
                ok: false,
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-2',
                source_setup: null,
                action: null,
                via: null,
                state: null,
                follow_up_issue_id: null,
                follow_up_issue_identifier: null,
                failed_relation_type: null,
                comment_id: null,
                attachment_id: null,
                error_code: 'linear_issue_not_mutable',
                error_message: 'Linear issue CO-2 is archived and trashed and cannot accept provider mutations.'
              }
            }
          }
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.summary).toContain('Provider linear worker stopped because the issue was no longer active.');
    expect(selected?.summary).toContain(
      'deterministic provider mutation suppressed: upsert-workpad cannot run while the Linear issue is archived or trashed'
    );
  });

  it('omits degradation text when provider proof cannot be scoped to a single attempt', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Provider linear worker completed with forced standalone review enabled for handoff',
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'Provider linear worker completed with forced standalone review enabled for handoff'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: undefined,
          linear_audit: {
            path: '/tmp/provider-linear-worker-linear-audit.jsonl',
            attempted_count: 1,
            success_count: 0,
            failure_count: 1,
            latest_recorded_at: '2026-03-20T01:15:27.970Z',
            parallelization_entries: [],
            latest_by_operation: {
              'create-follow-up': {
                recorded_at: '2026-03-20T01:15:27.970Z',
                operation: 'create-follow-up',
                ok: false,
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-2',
                source_setup: null,
                action: null,
                via: null,
                state: null,
                follow_up_issue_id: null,
                follow_up_issue_identifier: null,
                failed_relation_type: null,
                comment_id: null,
                attachment_id: null,
                error_code: 'linear_follow_up_parity_matrix_missing',
                error_message: 'Parity/alignment follow-up issues require a parity matrix.'
              }
            }
          }
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.summary).toContain('Provider linear worker stopped because the issue was no longer active.');
    expect(selected?.summary).not.toContain('deterministic provider mutation suppressed');
  });

  it('preserves legitimate summary lines while removing stale succeeded failure lines', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary:
          "Stage 'Run delegation guard' failed with exit code 1.\nUsing repo-local codex.orchestrator.json.\nStage 'npm run test' failed with exit code 1.",
        commands: [{ id: 'test', status: 'succeeded', summary: 'tests passed' }]
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      summary: 'Using repo-local codex.orchestrator.json.',
      lastError: null
    });
    expect(selected?.latestEvent).toMatchObject({
      message: 'Using repo-local codex.orchestrator.json.'
    });
  });

  it('prefers explicit manifest workspace paths over run-directory inference', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: join(root, '.workspaces', 'linear-lin-issue-1'),
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.workspacePath).toBe(join(root, '.workspaces', 'linear-lin-issue-1'));
  });

  it('uses provider claim launch time when filtering selected-run proof workspace paths', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        started_at: '2026-03-20T01:00:00.000Z',
        updated_at: '2026-03-20T01:10:00.000Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          workspace_path: join(root, '.workspaces', 'stale-proof-workspace'),
          attempt_started_at: '2026-03-20T01:05:00.000Z',
          updated_at: '2026-03-20T01:06:00.000Z'
        })
      ),
      'utf8'
    );
    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims = providerIntakeState.claims.map((claim) => ({
      ...claim,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      launch_started_at: '2026-03-20T01:20:00.000Z'
    }));

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected?.workspacePath).toBe(root);
    expect(selected?.providerLinearWorkerProof?.workspace_path).toBe(
      join(root, '.workspaces', 'stale-proof-workspace')
    );
  });

  it('ignores malformed provider claim launch time when filtering selected-run proof workspace paths', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        started_at: '2026-03-20T01:20:00.000Z',
        updated_at: '2026-03-20T01:25:00.000Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          workspace_path: join(root, '.workspaces', 'stale-proof-workspace'),
          attempt_started_at: '2026-03-20T01:05:00.000Z',
          updated_at: '2026-03-20T01:06:00.000Z'
        })
      ),
      'utf8'
    );
    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims = providerIntakeState.claims.map((claim) => ({
      ...claim,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      launch_started_at: 'not-a-date'
    }));

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected?.workspacePath).toBe(root);
    expect(selected?.providerLinearWorkerProof?.workspace_path).toBe(
      join(root, '.workspaces', 'stale-proof-workspace')
    );
  });

  it('projects the control-host workspace for child CLI manifests under repo-local overridden runs roots', async () => {
    const { root, paths } = await createHostPaths((repoRoot) => join(repoRoot, 'custom-runs'));
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, 'custom-runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      runId: 'run-child',
      summary: 'provider run active',
      workspacePath: root
    });
  });

  it('projects the control-host workspace for child CLI manifests under external overridden runs roots', async () => {
    const externalRunsRoot = await mkdtemp(join(tmpdir(), 'selected-run-projection-runs-'));
    cleanupRoots.push(externalRunsRoot);
    const { root, paths } = await createHostPaths(() => externalRunsRoot);
    const childEnv = {
      repoRoot: root,
      runsRoot: externalRunsRoot,
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      runId: 'run-child',
      summary: 'provider run active',
      workspacePath: root
    });
  });

  it('returns a null workspace path instead of the manifest artefact directory for non-run manifests', async () => {
    const { root, paths } = await createHostPaths();
    const externalRunRoot = join(root, 'external-provider-run');
    await mkdir(externalRunRoot, { recursive: true });
    const externalManifestPath = join(externalRunRoot, 'manifest.json');
    await writeFile(
      externalManifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, externalManifestPath).buildSelectedRunContext();

    expect(selected?.workspacePath).toBeNull();
  });

  it('falls back to the control-host manifest when a preferred provider manifest path is missing', async () => {
    const { root, paths } = await createHostPaths();
    const missingManifestPath = join(root, '.runs', 'linear-lin-issue-1', 'cli', 'missing-run', 'manifest.json');
    const providerIntakeState = createProviderIntakeState(missingManifestPath);

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'local-mcp',
      runId: 'control-host',
      workspacePath: root
    });
  });

  it('projects the preferred provider child for task-scoped control hosts', async () => {
    const { root, paths } = await createHostPaths(undefined, { taskId: 'provider-host-task' });
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        provider_control_host_task_id: 'provider-host-task',
        provider_control_host_run_id: 'control-host',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      runId: 'run-child',
      workspacePath: root
    });
  });

  it('projects the preferred provider child for custom control-host task and run ids', async () => {
    const { root, paths } = await createHostPaths(undefined, {
      taskId: 'provider-host-task',
      runId: 'provider-host-run'
    });
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        provider_control_host_task_id: 'provider-host-task',
        provider_control_host_run_id: 'provider-host-run',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      runId: 'run-child',
      workspacePath: root
    });
  });

  it('threads child manifest stage, approval, and title metadata into the selected context', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        pipeline_title: 'Child Pipeline',
        approvals: [{ id: 'approval-1' }, { id: 'approval-2' }],
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: [
          { id: 'build', title: 'Build', status: 'succeeded' },
          { id: 'review', title: 'Review', status: 'in_progress' }
        ]
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      pipelineTitle: 'Child Pipeline',
      approvalsTotal: 2,
      stages: [
        {
          id: 'build',
          title: 'Build',
          status: 'succeeded'
        },
        {
          id: 'review',
          title: 'Review',
          status: 'in_progress'
        }
      ]
    });
  });

  it('reads provider-linear-worker-proof.json from the selected run dir', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );
    const childLane: ProviderLinearWorkerChildLaneRecord = {
      stream: 'projection-proof',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-lin-issue-1-projection-proof',
      run_id: 'child-lane-run-1',
      status: 'succeeded',
      manifest_path: join(root, '.runs', 'linear-lin-issue-1-projection-proof', 'cli', 'child-lane-run-1', 'manifest.json'),
      artifact_root: join(root, '.runs', 'linear-lin-issue-1-projection-proof', 'cli', 'child-lane-run-1'),
      log_path: null,
      summary: 'Selected-run projection proof lane finished',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: join(root, '.workspaces', 'linear-lin-issue-1'),
      source_setup: null,
      launched_at: '2026-03-20T01:15:40.000Z',
      purpose: 'Add child_lanes proof coverage',
      instructions: null,
      scope: {
        files: ['orchestrator/tests/SelectedRunProjection.test.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-20T01:15:28.970Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-20T01:15:35.000Z'
      },
      lane_workspace_path: join(root, '.child-lanes', 'projection-proof-child-run-1'),
      patch_artifact_path: join(root, '.runs', 'linear-lin-issue-1-projection-proof', 'cli', 'child-lane-run-1', 'provider-linear-child-lane.patch'),
      patch_bytes: 128,
      decision: 'accepted',
      decision_at: '2026-03-20T01:15:50.000Z',
      decision_reason: 'Parent accepted the projection proof lane.'
    };
    const proof: ProviderLinearWorkerProof = {
      ...buildProviderLinearWorkerProof({
        workspace_path: join(root, '.workspaces', 'linear-lin-issue-1')
      }),
      child_lanes: [childLane]
    };
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(proof),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.runId).toBe('run-child');
    expect(selected?.providerLinearWorkerProof).toEqual(proof);
    expect(selected?.providerLinearWorkerProof?.child_lanes?.[0]?.scope.files).toEqual([
      'orchestrator/tests/SelectedRunProjection.test.ts'
    ]);
  });

  it('refreshes terminal projection proofs to retire invalidated and rejected active-looking child-lane residue', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-231',
        updated_at: '2026-04-18T00:28:32.305Z',
        workspace_path: root,
        summary: 'provider run retained',
        commands: []
      }),
      'utf8'
    );
    const invalidatedPlaceholder: ProviderLinearWorkerChildLaneRecord = {
      stream: 'docs-recovery',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-lin-issue-1-docs-recovery',
      run_id: 'docs-recovery-running-run',
      status: 'running',
      manifest_path: join(root, '.runs', 'linear-lin-issue-1-docs-recovery', 'cli', 'docs-recovery-running-run', 'manifest.json'),
      artifact_root: join(root, '.runs', 'linear-lin-issue-1-docs-recovery', 'cli', 'docs-recovery-running-run'),
      log_path: null,
      summary: 'Child lane docs-recovery status is launching.',
      summary_recorded_at: '2026-04-18T00:30:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-231',
      workspace_path: root,
      source_setup: null,
      launched_at: '2026-04-18T00:29:00.000Z',
      purpose: 'Recover docs packet.',
      instructions: null,
      scope: {
        files: ['docs/PRD-linear-lin-issue-1.md'],
        phases: ['docs']
      },
      parent_snapshot: {
        base_sha: null,
        issue_updated_at: '2026-04-18T00:28:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-04-18T00:29:00.000Z'
      },
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'invalidated',
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: '2026-04-18T00:31:00.000Z',
      decision_reason: 'Parent invalidated stale launching placeholder.'
    };
    const rejectedPlaceholder: ProviderLinearWorkerChildLaneRecord = {
      ...invalidatedPlaceholder,
      stream: 'docs-packet-fallback',
      task_id: 'linear-lin-issue-1-docs-packet-fallback',
      run_id: 'launching-docs-packet-fallback',
      manifest_path: join(root, '.runs', 'linear-lin-issue-1-docs-packet-fallback', 'cli', 'launching-docs-packet-fallback', 'manifest.json'),
      artifact_root: join(root, '.runs', 'linear-lin-issue-1-docs-packet-fallback', 'cli', 'launching-docs-packet-fallback'),
      summary: 'Child lane reserved before child run startup.',
      decision: 'rejected',
      decision_at: '2026-04-18T00:32:00.000Z',
      decision_reason: 'Parent rejected stale launching placeholder.'
    };
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME),
      JSON.stringify([invalidatedPlaceholder, rejectedPlaceholder], null, 2),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          issue_identifier: 'CO-231',
          owner_phase: 'ended',
          owner_status: 'succeeded',
          workspace_path: root,
          child_lanes: [invalidatedPlaceholder, rejectedPlaceholder],
          updated_at: '2026-04-18T00:32:00.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.providerLinearWorkerProof?.child_lanes?.[0]).toMatchObject({
      stream: 'docs-recovery',
      run_id: 'docs-recovery-running-run',
      status: 'invalidated',
      decision: 'invalidated',
      summary: 'Child lane docs-recovery was invalidated: Parent invalidated stale launching placeholder.',
      summary_recorded_at: '2026-04-18T00:31:00.000Z'
    });
    expect(selected?.providerLinearWorkerProof?.child_lanes?.[1]).toMatchObject({
      stream: 'docs-packet-fallback',
      run_id: 'launching-docs-packet-fallback',
      status: 'rejected',
      decision: 'rejected',
      summary: 'Child lane docs-packet-fallback was rejected: Parent rejected stale launching placeholder.',
      summary_recorded_at: '2026-04-18T00:32:00.000Z'
    });
    const ledger = JSON.parse(
      await readFile(join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME), 'utf8')
    ) as Array<Record<string, unknown>>;
    expect(ledger[0]).toMatchObject({
      run_id: 'docs-recovery-running-run',
      status: 'invalidated',
      decision: 'invalidated'
    });
    expect(ledger[1]).toMatchObject({
      run_id: 'launching-docs-packet-fallback',
      status: 'rejected',
      decision: 'rejected'
    });
  });

  it('refreshes retired child-lane proofs when terminal records retain active-looking summaries', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-231',
        updated_at: '2026-04-18T00:28:32.305Z',
        workspace_path: root,
        summary: 'provider run retained',
        commands: []
      }),
      'utf8'
    );
    const retiredWithRunningSummary: ProviderLinearWorkerChildLaneRecord = {
      stream: 'docs-recovery',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-lin-issue-1-docs-recovery',
      run_id: 'docs-recovery-terminal-run',
      status: 'invalidated',
      manifest_path: join(root, '.runs', 'linear-lin-issue-1-docs-recovery', 'cli', 'docs-recovery-terminal-run', 'manifest.json'),
      artifact_root: join(root, '.runs', 'linear-lin-issue-1-docs-recovery', 'cli', 'docs-recovery-terminal-run'),
      log_path: null,
      summary: 'Child lane docs-recovery reserved before child run startup.',
      summary_recorded_at: '2026-04-18T00:30:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-231',
      workspace_path: root,
      source_setup: null,
      launched_at: '2026-04-18T00:29:00.000Z',
      purpose: 'Recover docs packet.',
      instructions: null,
      scope: {
        files: ['docs/PRD-linear-lin-issue-1.md'],
        phases: ['docs']
      },
      parent_snapshot: {
        base_sha: null,
        issue_updated_at: '2026-04-18T00:28:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-04-18T00:29:00.000Z'
      },
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'invalidated',
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: '2026-04-18T00:31:00.000Z',
      decision_reason: 'Parent invalidated stale terminal summary.'
    };
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME),
      JSON.stringify([retiredWithRunningSummary], null, 2),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          issue_identifier: 'CO-231',
          owner_phase: 'ended',
          owner_status: 'succeeded',
          workspace_path: root,
          child_lanes: [retiredWithRunningSummary],
          updated_at: '2026-04-18T00:32:00.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.providerLinearWorkerProof?.child_lanes?.[0]).toMatchObject({
      stream: 'docs-recovery',
      status: 'invalidated',
      decision: 'invalidated',
      summary: 'Child lane docs-recovery was invalidated: Parent invalidated stale terminal summary.',
      summary_recorded_at: '2026-04-18T00:31:00.000Z'
    });
    const ledger = JSON.parse(
      await readFile(join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME), 'utf8')
    ) as Array<Record<string, unknown>>;
    expect(ledger[0]).toMatchObject({
      run_id: 'docs-recovery-terminal-run',
      status: 'invalidated',
      summary: 'Child lane docs-recovery was invalidated: Parent invalidated stale terminal summary.'
    });
  });

  it('refreshes retired child-lane proofs when terminal records retain stale in-flight actions', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-231',
        updated_at: '2026-04-18T00:28:32.305Z',
        workspace_path: root,
        summary: 'provider run retained',
        commands: []
      }),
      'utf8'
    );
    const retiredWithInFlightAction: ProviderLinearWorkerChildLaneRecord = {
      stream: 'docs-recovery',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-lin-issue-1-docs-recovery',
      run_id: 'docs-recovery-terminal-run',
      status: 'invalidated',
      manifest_path: join(root, '.runs', 'linear-lin-issue-1-docs-recovery', 'cli', 'docs-recovery-terminal-run', 'manifest.json'),
      artifact_root: join(root, '.runs', 'linear-lin-issue-1-docs-recovery', 'cli', 'docs-recovery-terminal-run'),
      log_path: null,
      summary: 'Child lane docs-recovery was invalidated: Parent invalidated stale terminal claim.',
      summary_recorded_at: '2026-04-18T00:31:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-231',
      workspace_path: root,
      source_setup: null,
      launched_at: '2026-04-18T00:29:00.000Z',
      purpose: 'Recover docs packet.',
      instructions: null,
      scope: {
        files: ['docs/PRD-linear-lin-issue-1.md'],
        phases: ['docs']
      },
      parent_snapshot: {
        base_sha: null,
        issue_updated_at: '2026-04-18T00:28:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-04-18T00:29:00.000Z'
      },
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'invalidated',
      in_flight_action: 'invalidate',
      in_flight_started_at: '2026-04-18T00:30:30.000Z',
      decision_at: '2026-04-18T00:31:00.000Z',
      decision_reason: 'Parent invalidated stale terminal claim.'
    };
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME),
      JSON.stringify([retiredWithInFlightAction], null, 2),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          issue_identifier: 'CO-231',
          owner_phase: 'ended',
          owner_status: 'succeeded',
          workspace_path: root,
          child_lanes: [retiredWithInFlightAction],
          updated_at: '2026-04-18T00:32:00.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.providerLinearWorkerProof?.child_lanes?.[0]).toMatchObject({
      stream: 'docs-recovery',
      status: 'invalidated',
      decision: 'invalidated',
      in_flight_action: null,
      in_flight_started_at: null,
      summary: 'Child lane docs-recovery was invalidated: Parent invalidated stale terminal claim.',
      summary_recorded_at: '2026-04-18T00:31:00.000Z'
    });
    const ledger = JSON.parse(
      await readFile(join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME), 'utf8')
    ) as Array<Record<string, unknown>>;
    expect(ledger[0]).toMatchObject({
      run_id: 'docs-recovery-terminal-run',
      status: 'invalidated',
      in_flight_action: null,
      in_flight_started_at: null
    });
  });

  it('normalizes proof-only retired child-lane evidence when the child-lane ledger is absent', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-231',
        updated_at: '2026-04-18T00:28:32.305Z',
        workspace_path: root,
        summary: 'provider run retained',
        commands: []
      }),
      'utf8'
    );
    const proofOnlyRetiredLane: ProviderLinearWorkerChildLaneRecord = {
      stream: 'docs-recovery',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-lin-issue-1-docs-recovery',
      run_id: 'docs-recovery-terminal-run',
      status: 'invalidated',
      manifest_path: join(root, '.runs', 'linear-lin-issue-1-docs-recovery', 'cli', 'docs-recovery-terminal-run', 'manifest.json'),
      artifact_root: join(root, '.runs', 'linear-lin-issue-1-docs-recovery', 'cli', 'docs-recovery-terminal-run'),
      log_path: null,
      summary: 'Child lane docs-recovery is running.',
      summary_recorded_at: '2026-04-18T00:30:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-231',
      workspace_path: root,
      source_setup: null,
      launched_at: '2026-04-18T00:29:00.000Z',
      purpose: 'Recover docs packet.',
      instructions: null,
      scope: {
        files: ['docs/PRD-linear-lin-issue-1.md'],
        phases: ['docs']
      },
      parent_snapshot: {
        base_sha: null,
        issue_updated_at: '2026-04-18T00:28:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-04-18T00:29:00.000Z'
      },
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'invalidated',
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: '2026-04-18T00:31:00.000Z',
      decision_reason: 'Parent invalidated stale terminal summary.'
    };
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          issue_identifier: 'CO-231',
          owner_phase: 'ended',
          owner_status: 'succeeded',
          workspace_path: root,
          child_lanes: [proofOnlyRetiredLane],
          updated_at: '2026-04-18T00:32:00.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.providerLinearWorkerProof?.child_lanes?.[0]).toMatchObject({
      stream: 'docs-recovery',
      status: 'invalidated',
      decision: 'invalidated',
      summary: 'Child lane docs-recovery was invalidated: Parent invalidated stale terminal summary.',
      summary_recorded_at: '2026-04-18T00:31:00.000Z'
    });
    const recoveredLedger = JSON.parse(
      await readFile(join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME), 'utf8')
    ) as Array<Record<string, unknown>>;
    expect(recoveredLedger[0]).toMatchObject({
      stream: 'docs-recovery',
      status: 'invalidated',
      decision: 'invalidated',
      summary: 'Child lane docs-recovery was invalidated: Parent invalidated stale terminal summary.',
      summary_recorded_at: '2026-04-18T00:31:00.000Z'
    });

    const selectedAgain = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selectedAgain?.providerLinearWorkerProof?.child_lanes?.[0]).toMatchObject({
      stream: 'docs-recovery',
      status: 'invalidated',
      decision: 'invalidated',
      summary: 'Child lane docs-recovery was invalidated: Parent invalidated stale terminal summary.',
      summary_recorded_at: '2026-04-18T00:31:00.000Z'
    });
  });

  it('drops proof-only active child-lane evidence when the authoritative ledger is absent', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-231',
        updated_at: '2026-04-18T00:28:32.305Z',
        workspace_path: root,
        summary: 'provider run retained',
        commands: []
      }),
      'utf8'
    );
    const proofOnlyActiveLane: ProviderLinearWorkerChildLaneRecord = {
      stream: 'docs-recovery',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-lin-issue-1-docs-recovery',
      run_id: 'launching-docs-recovery',
      status: 'launching',
      manifest_path: join(root, '.runs', 'linear-lin-issue-1-docs-recovery', 'cli', 'launching-docs-recovery', 'manifest.json'),
      artifact_root: join(root, '.runs', 'linear-lin-issue-1-docs-recovery', 'cli', 'launching-docs-recovery'),
      log_path: null,
      summary: 'Child lane reserved before child run startup.',
      summary_recorded_at: '2026-04-18T00:30:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-231',
      workspace_path: root,
      source_setup: null,
      launched_at: '2026-04-18T00:29:00.000Z',
      purpose: 'Recover docs packet.',
      instructions: null,
      scope: {
        files: ['docs/PRD-linear-lin-issue-1.md'],
        phases: ['docs']
      },
      parent_snapshot: {
        base_sha: null,
        issue_updated_at: '2026-04-18T00:28:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-04-18T00:29:00.000Z'
      },
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'pending',
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: null,
      decision_reason: null
    };
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          issue_identifier: 'CO-231',
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: root,
          child_lanes: [proofOnlyActiveLane],
          updated_at: '2026-04-18T00:32:00.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.providerLinearWorkerProof?.child_lanes).toEqual([]);
    await expect(
      readFile(join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME), 'utf8')
    ).rejects.toHaveProperty('code', 'ENOENT');
  });

  it('does not refresh already-retired child-lane placeholders solely because the launch run id remains', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-229',
        updated_at: '2026-04-18T00:28:32.305Z',
        workspace_path: root,
        summary: 'provider run retained',
        commands: []
      }),
      'utf8'
    );
    const retiredPlaceholder: ProviderLinearWorkerChildLaneRecord = {
      stream: 'docs-recovery',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-lin-issue-1-docs-recovery',
      run_id: 'launching-docs-recovery',
      status: 'invalidated',
      manifest_path: join(root, '.runs', 'linear-lin-issue-1-docs-recovery', 'cli', 'launching-docs-recovery', 'manifest.json'),
      artifact_root: join(root, '.runs', 'linear-lin-issue-1-docs-recovery', 'cli', 'launching-docs-recovery'),
      log_path: null,
      summary: 'Child lane docs-recovery was invalidated: Parent invalidated stale launching placeholder.',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-229',
      workspace_path: root,
      source_setup: null,
      launched_at: '2026-04-18T00:29:00.000Z',
      summary_recorded_at: '2026-04-18T00:31:00.000Z',
      purpose: 'Recover docs packet.',
      instructions: null,
      scope: {
        files: ['docs/PRD-linear-lin-issue-1.md'],
        phases: ['docs']
      },
      parent_snapshot: {
        base_sha: null,
        issue_updated_at: '2026-04-18T00:28:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-04-18T00:29:00.000Z'
      },
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'invalidated',
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: '2026-04-18T00:31:00.000Z',
      decision_reason: 'Parent invalidated stale launching placeholder.'
    };
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          issue_identifier: 'CO-229',
          owner_phase: 'ended',
          owner_status: 'succeeded',
          workspace_path: root,
          child_lanes: [retiredPlaceholder],
          updated_at: '2026-04-18T00:32:00.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.providerLinearWorkerProof?.child_lanes).toEqual([retiredPlaceholder]);
  });

  it(
    'refreshes projection proofs when child-lane reservation ledger placeholders exist',
    async () => {
    const { root, paths } = await createHostPaths();
    const codexHome = join(root, '.codex');
    process.env.CODEX_HOME = codexHome;
    await mkdir(join(codexHome, 'sessions'), { recursive: true });
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-04-17T00:35:00.000Z',
        workspace_path: root,
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const childTaskId = 'linear-lin-issue-1-docs-packet';
    const childCliDir = join(root, '.runs', childTaskId, 'cli');
    const matchingChildRunDir = join(childCliDir, '2026-04-17T00-34-04-191Z-44a13a0d');
    await mkdir(matchingChildRunDir, { recursive: true });
    const reservedChildLane: ProviderLinearWorkerChildLaneRecord = {
      stream: 'docs-packet',
      pipeline_id: 'provider-linear-child-lane',
      task_id: childTaskId,
      run_id: 'launching-docs-packet',
      status: 'launching',
      manifest_path: join(childCliDir, 'launching-docs-packet', 'manifest.json'),
      artifact_root: join(childCliDir, 'launching-docs-packet'),
      log_path: null,
      summary: 'Child lane reserved before child run startup.',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: root,
      source_setup: null,
      launched_at: '2026-04-17T00:34:02.078Z',
      purpose: 'Build docs packet.',
      instructions: null,
      scope: {
        files: ['docs/PRD-linear-lin-issue-1.md'],
        phases: ['docs']
      },
      parent_snapshot: {
        base_sha: null,
        issue_updated_at: null,
        issue_state: null,
        issue_state_type: null,
        captured_at: '2026-04-17T00:34:02.078Z'
      },
      lane_workspace_path: null,
      patch_artifact_path: null,
      patch_bytes: null,
      decision: 'pending',
      in_flight_action: null,
      in_flight_started_at: null,
      decision_at: null,
      decision_reason: null
    };
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME),
      JSON.stringify([reservedChildLane], null, 2),
      'utf8'
    );
    const matchingChildManifest = {
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      task_id: childTaskId,
      parent_run_id: 'run-child',
      pipeline_id: 'provider-linear-child-lane',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      status: 'in_progress',
      started_at: '2026-04-17T00:34:04.192Z',
      updated_at: '2026-04-17T00:34:30.000Z',
      artifact_root: matchingChildRunDir,
      log_path: join(matchingChildRunDir, 'runner.ndjson'),
      workspace_path: root
    };
    await writeFile(
      join(matchingChildRunDir, 'manifest.json'),
      JSON.stringify(matchingChildManifest),
      'utf8'
    );
    const staleProjectionProof = buildProviderLinearWorkerProof({
      attempt_started_at: '2026-04-17T00:30:00.000Z',
      current_turn_started_at: '2026-04-17T00:30:01.000Z',
      latest_turn_id: 'turn-2',
      latest_session_id: 'thread-1-turn-2',
      latest_session_id_source: 'derived_from_thread_and_turn',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 10,
          window_minutes: 300
        },
        secondary: {
          used_percent: 20,
          window_minutes: 10080
        }
      },
      owner_phase: 'turn_completed',
      owner_status: 'in_progress',
      workspace_path: root,
      child_lanes: [],
      updated_at: '2026-04-17T00:35:00.000Z'
    });
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(staleProjectionProof, null, 2),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.providerLinearWorkerProof?.child_lanes?.[0]).toMatchObject({
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      status: 'in_progress',
      summary: 'Child lane docs-packet is running.',
      manifest_path: join(matchingChildRunDir, 'manifest.json'),
      artifact_root: matchingChildRunDir,
      lane_workspace_path: null
    });
    expect(selected?.providerLinearWorkerProof?.updated_at).not.toBe('2026-04-17T00:35:00.000Z');
    expect(selected?.providerDebugSnapshot?.progress).toMatchObject({
      phase: 'child_lane',
      kind: 'child_lane',
      status: 'waiting',
      summary: 'Child lane docs-packet is running.'
    });
    let childLaneLedger = JSON.parse(
      await readFile(join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME), 'utf8')
    ) as Array<Record<string, unknown>>;
    expect(childLaneLedger[0]).toMatchObject({
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      status: 'in_progress',
      summary: 'Child lane docs-packet is running.',
      manifest_path: join(matchingChildRunDir, 'manifest.json'),
      artifact_root: matchingChildRunDir
    });

    const hydratedChildLane = selected?.providerLinearWorkerProof?.child_lanes?.[0];
    if (!hydratedChildLane) {
      throw new Error('Expected projection refresh to hydrate a child lane.');
    }
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME),
      JSON.stringify([hydratedChildLane], null, 2),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        {
          ...staleProjectionProof,
          updated_at: '2026-04-17T00:36:00.000Z'
        },
        null,
        2
      ),
      'utf8'
    );
    await writeFile(
      join(matchingChildRunDir, 'manifest.json'),
      JSON.stringify({
        ...matchingChildManifest,
        status: 'succeeded',
        completed_at: '2026-04-17T00:43:59.552Z',
        updated_at: '2026-04-17T00:43:59.552Z',
        summary: 'Patch artifact ready.'
      }),
      'utf8'
    );

    const proofPendingSelected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(proofPendingSelected?.providerLinearWorkerProof?.child_lanes?.[0]).toMatchObject({
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      status: 'in_progress',
      summary: 'Child lane completed; waiting for patch proof metadata.'
    });
    childLaneLedger = JSON.parse(
      await readFile(join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME), 'utf8')
    ) as Array<Record<string, unknown>>;
    expect(childLaneLedger[0]).toMatchObject({
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      status: 'in_progress',
      summary: 'Child lane completed; waiting for patch proof metadata.'
    });

    const patchArtifactPath = join(matchingChildRunDir, 'provider-linear-child-lane.patch');
    await writeFile(
      patchArtifactPath,
      'diff --git a/docs/PRD-linear-lin-issue-1.md b/docs/PRD-linear-lin-issue-1.md\n',
      'utf8'
    );
    await writeFile(
      join(matchingChildRunDir, 'provider-linear-child-lane-proof.json'),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        task_id: childTaskId,
        run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
        parent_run_id: 'run-child',
        stream: 'docs-packet',
        lane_workspace_path: join(root, '.child-lanes', 'docs-packet-child'),
        patch_artifact_path: patchArtifactPath,
        patch_bytes: 128,
        status: 'succeeded',
        updated_at: '2026-04-17T00:43:59.552Z'
      }),
      'utf8'
    );

    const completedSelected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(completedSelected?.providerLinearWorkerProof?.child_lanes?.[0]).toMatchObject({
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      status: 'succeeded',
      summary: 'Child lane docs-packet succeeded. Patch artifact ready.',
      manifest_path: join(matchingChildRunDir, 'manifest.json'),
      artifact_root: matchingChildRunDir,
      lane_workspace_path: join(root, '.child-lanes', 'docs-packet-child'),
      patch_artifact_path: patchArtifactPath,
      patch_bytes: 128,
      summary_recorded_at: '2026-04-17T00:43:59.552Z'
    });
    expect(completedSelected?.providerDebugSnapshot?.progress).toMatchObject({
      phase: 'child_lane',
      kind: 'child_lane',
      status: 'waiting',
      summary: 'Child lane docs-packet succeeded. Patch artifact ready.',
      summary_recorded_at: '2026-04-17T00:43:59.552Z',
      last_semantic_progress_at: '2026-04-17T00:43:59.552Z'
    });
    childLaneLedger = JSON.parse(
      await readFile(join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME), 'utf8')
    ) as Array<Record<string, unknown>>;
    expect(childLaneLedger[0]).toMatchObject({
      run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
      status: 'succeeded',
      patch_artifact_path: patchArtifactPath,
      patch_bytes: 128,
      summary: 'Child lane docs-packet succeeded. Patch artifact ready.',
      summary_recorded_at: '2026-04-17T00:43:59.552Z'
    });
    },
    30_000
  );

  it(
    'keeps session-log hydration enabled for turn-running proofs when child-lane reservation placeholders exist',
    async () => {
      const { root, paths } = await createHostPaths();
      const childEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'linear-lin-issue-1'
      };
      const childPaths = resolveRunPaths(childEnv, 'run-child');
      await mkdir(childPaths.runDir, { recursive: true });
      await writeFile(
        childPaths.manifestPath,
        JSON.stringify({
          run_id: 'run-child',
          task_id: 'linear-lin-issue-1',
          status: 'in_progress',
          issue_provider: 'linear',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          updated_at: '2026-04-17T00:35:00.000Z',
          workspace_path: root,
          summary: 'provider run active',
          commands: []
        }),
        'utf8'
      );

      const childTaskId = 'linear-lin-issue-1-docs-packet';
      const childCliDir = join(root, '.runs', childTaskId, 'cli');
      const matchingChildRunDir = join(childCliDir, '2026-04-17T00-34-04-191Z-44a13a0d');
      await mkdir(matchingChildRunDir, { recursive: true });
      const reservedChildLane: ProviderLinearWorkerChildLaneRecord = {
        stream: 'docs-packet',
        pipeline_id: 'provider-linear-child-lane',
        task_id: childTaskId,
        run_id: 'launching-docs-packet',
        status: 'launching',
        manifest_path: join(childCliDir, 'launching-docs-packet', 'manifest.json'),
        artifact_root: join(childCliDir, 'launching-docs-packet'),
        log_path: null,
        summary: 'Child lane reserved before child run startup.',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: root,
        source_setup: null,
        launched_at: '2026-04-17T00:34:02.078Z',
        purpose: 'Build docs packet.',
        instructions: null,
        scope: {
          files: ['docs/PRD-linear-lin-issue-1.md'],
          phases: ['docs']
        },
        parent_snapshot: {
          base_sha: null,
          issue_updated_at: null,
          issue_state: null,
          issue_state_type: null,
          captured_at: '2026-04-17T00:34:02.078Z'
        },
        lane_workspace_path: null,
        patch_artifact_path: null,
        patch_bytes: null,
        decision: 'pending',
        in_flight_action: null,
        in_flight_started_at: null,
        decision_at: null,
        decision_reason: null
      };
      await writeFile(
        join(childPaths.runDir, PROVIDER_LINEAR_WORKER_CHILD_LANES_FILENAME),
        JSON.stringify([reservedChildLane], null, 2),
        'utf8'
      );
      await writeFile(
        join(matchingChildRunDir, 'manifest.json'),
        JSON.stringify({
          run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
          task_id: childTaskId,
          parent_run_id: 'run-child',
          pipeline_id: 'provider-linear-child-lane',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          status: 'in_progress',
          started_at: '2026-04-17T00:34:04.192Z',
          updated_at: '2026-04-17T00:34:30.000Z',
          artifact_root: matchingChildRunDir,
          log_path: join(matchingChildRunDir, 'runner.ndjson'),
          workspace_path: root
        }),
        'utf8'
      );
      await writeFile(
        join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
        JSON.stringify(
          buildProviderLinearWorkerProof({
            attempt_started_at: '2026-04-17T00:30:00.000Z',
            current_turn_started_at: '2026-04-17T00:30:01.000Z',
            latest_turn_id: 'turn-2',
            latest_session_id: 'thread-1-turn-2',
            latest_session_id_source: 'derived_from_thread_and_turn',
            last_event: 'response.output_text.delta',
            last_message: 'working',
            last_event_at: '2026-04-17T00:35:00.000Z',
            current_turn_activity: {
              event: 'response.output_text.delta',
              message_or_payload: 'working',
              recorded_at: '2026-04-17T00:35:00.000Z',
              source: 'session_log_hydration',
              turn_id: 'turn-2',
              session_id: 'thread-1-turn-2'
            },
            tokens: {
              input_tokens: 12,
              output_tokens: 8,
              total_tokens: 20
            },
            rate_limits: {
              primary: {
                used_percent: 10,
                window_minutes: 300
              },
              secondary: {
                used_percent: 20,
                window_minutes: 10080
              }
            },
            auth_provenance: {
              provider_kind: 'chatgpt',
              runtime_mode: 'appserver',
              runtime_provider: 'openai',
              active_profile_fingerprint: 'profile-1',
              active_account_fingerprint: 'account-1',
              cloud_env_id: null,
              cloud_branch: null,
              credential_source: 'chatgpt',
              auth_freshness: 'fresh',
              observed_at: '2026-04-17T00:35:00.000Z',
              source: 'session_log'
            },
            owner_phase: 'turn_running',
            owner_status: 'in_progress',
            workspace_path: root,
            child_lanes: [],
            updated_at: '2026-04-17T00:35:00.000Z'
          }),
          null,
          2
        ),
        'utf8'
      );

      const codexHome = join(root, '.codex');
      const sessionDir = join(codexHome, 'sessions', '2026', '04', '17');
      await mkdir(sessionDir, { recursive: true });
      await writeFile(
        join(sessionDir, 'rollout-2026-04-17T00-30-02-000Z-thread-1.jsonl'),
        [
          JSON.stringify({
            type: 'session_meta',
            payload: {
              id: 'thread-1',
              cwd: root,
              initial_prompt: 'You are the provider worker for Linear issue CO-2: Autonomous intake handoff'
            }
          }),
          JSON.stringify({
            type: 'turn_context',
            payload: {
              turn_id: 'turn-3'
            }
          }),
          JSON.stringify({
            type: 'event_msg',
            payload: {
              type: 'token_count',
              info: {
                total_token_usage: {
                  input_tokens: 55,
                  output_tokens: 21,
                  total_tokens: 76
                }
              },
              rate_limits: {
                primary: {
                  used_percent: 18,
                  window_minutes: 300
                },
                secondary: {
                  used_percent: 52,
                  window_minutes: 10080
                }
              }
            }
          })
        ].join('\n'),
        'utf8'
      );

      const originalCodexHome = process.env.CODEX_HOME;
      process.env.CODEX_HOME = codexHome;
      try {
        const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

        expect(selected?.providerLinearWorkerProof).toMatchObject({
          latest_turn_id: 'turn-3',
          latest_session_id: 'thread-1-turn-3',
          latest_session_id_source: 'derived_from_thread_and_turn',
          tokens: {
            input_tokens: 55,
            output_tokens: 21,
            total_tokens: 76
          },
          rate_limits: {
            primary: {
              used_percent: 18,
              window_minutes: 300
            },
            secondary: {
              used_percent: 52,
              window_minutes: 10080
            }
          }
        });
        expect(selected?.providerLinearWorkerProof?.child_lanes?.[0]).toMatchObject({
          run_id: '2026-04-17T00-34-04-191Z-44a13a0d',
          status: 'in_progress',
          summary: 'Child lane docs-packet is running.'
        });
      } finally {
        if (originalCodexHome === undefined) {
          delete process.env.CODEX_HOME;
        } else {
          process.env.CODEX_HOME = originalCodexHome;
        }
      }
    }
  );

  it('hydrates selected appserver proof when only session-log ids are missing', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        started_at: '2026-04-17T00:30:00.000Z',
        updated_at: '2026-04-17T00:35:00.000Z',
        workspace_path: root
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-04-17T00:30:00.000Z',
          current_turn_started_at: '2026-04-17T00:30:01.000Z',
          thread_id: 'thread-1',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          session_log_thread_id: null,
          session_log_turn_id: null,
          session_log_session_id: null,
          last_event: 'task_complete',
          last_message: null,
          last_event_at: '2026-04-17T00:35:00.000Z',
          current_turn_activity: {
            event: 'task_complete',
            message_or_payload: null,
            recorded_at: '2026-04-17T00:35:00.000Z',
            source: 'stdout_jsonl',
            turn_id: 'turn-2',
            session_id: 'thread-1-turn-2'
          },
          tokens: {
            input_tokens: 12,
            output_tokens: 8,
            total_tokens: 20
          },
          rate_limits: {
            primary: {
              used_percent: 10,
              window_minutes: 300
            },
            secondary: {
              used_percent: 20,
              window_minutes: 10080
            }
          },
          runtime: {
            requested_mode: 'appserver',
            selected_mode: 'appserver',
            provider: 'AppServerRuntimeProvider',
            runtime_session_id: 'appserver-run-child',
            fallback: {
              occurred: false,
              code: null,
              reason: null,
              from_mode: null,
              to_mode: null,
              checked_at: '2026-04-17T00:30:00.000Z'
            }
          },
          auth_provenance: {
            provider_kind: 'codex',
            runtime_mode: 'appserver',
            runtime_provider: 'AppServerRuntimeProvider',
            active_profile_fingerprint: null,
            active_account_fingerprint: null,
            cloud_env_id: 'env-appserver-proof',
            cloud_branch: null,
            credential_source: null,
            auth_freshness: 'credential_source_unknown',
            observed_at: '2026-04-17T00:30:00.000Z',
            source: 'runtime_env:linear'
          },
          owner_phase: 'turn_completed',
          owner_status: 'in_progress',
          workspace_path: root,
          child_lanes: [],
          updated_at: '2026-04-17T00:35:00.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const codexHome = join(root, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '04', '17');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, 'rollout-2026-04-17T00-30-02-000Z-thread-1.jsonl'),
      [
        JSON.stringify({
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: root,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Autonomous intake handoff'
          }
        }),
        JSON.stringify({
          type: 'turn_context',
          payload: {
            turn_id: 'turn-2'
          }
        }),
        JSON.stringify({
          timestamp: '2026-04-17T00:35:00.000Z',
          type: 'event_msg',
          payload: {
            type: 'task_complete',
            turn_id: 'turn-2'
          }
        })
      ].join('\n'),
      'utf8'
    );

    const previousCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = codexHome;
    try {
      const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

      expect(selected?.providerLinearWorkerProof).toMatchObject({
        session_log_thread_id: 'thread-1',
        session_log_turn_id: 'turn-2',
        session_log_session_id: 'thread-1-turn-2',
        appserver_supervision: {
          turn_persistence_status: 'proven',
          turn_persistence_source: 'session_log_hydration',
          turn_persistence_blocker: null
        }
      });
    } finally {
      if (previousCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = previousCodexHome;
      }
    }
  });

  it('hydrates selected appserver proof when only supervision proof is missing', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        started_at: '2026-04-17T00:30:00.000Z',
        updated_at: '2026-04-17T00:35:00.000Z',
        workspace_path: root
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-04-17T00:30:00.000Z',
          current_turn_started_at: '2026-04-17T00:30:01.000Z',
          thread_id: 'thread-1',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          session_log_thread_id: 'thread-1',
          session_log_turn_id: 'turn-2',
          session_log_session_id: 'thread-1-turn-2',
          turn_count: 1,
          last_event: 'task_complete',
          last_message: null,
          last_event_at: '2026-04-17T00:35:00.000Z',
          current_turn_activity: {
            event: 'task_complete',
            message_or_payload: null,
            recorded_at: '2026-04-17T00:35:00.000Z',
            source: 'session_log_hydration',
            turn_id: 'turn-2',
            session_id: 'thread-1-turn-2'
          },
          tokens: {
            input_tokens: 12,
            output_tokens: 8,
            total_tokens: 20
          },
          rate_limits: {
            primary: {
              used_percent: 10,
              window_minutes: 300
            }
          },
          runtime: {
            requested_mode: 'appserver',
            selected_mode: 'appserver',
            provider: 'AppServerRuntimeProvider',
            runtime_session_id: 'appserver-run-child',
            fallback: {
              occurred: false,
              code: null,
              reason: null,
              from_mode: null,
              to_mode: null,
              checked_at: '2026-04-17T00:30:00.000Z'
            }
          },
          auth_provenance: {
            provider_kind: 'codex',
            runtime_mode: 'appserver',
            runtime_provider: 'AppServerRuntimeProvider',
            active_profile_fingerprint: null,
            active_account_fingerprint: null,
            cloud_env_id: 'env-appserver-proof',
            cloud_branch: null,
            credential_source: null,
            auth_freshness: 'credential_source_unknown',
            observed_at: '2026-04-17T00:30:00.000Z',
            source: 'runtime_env:linear'
          },
          appserver_supervision: null,
          owner_phase: 'turn_completed',
          owner_status: 'in_progress',
          workspace_path: root,
          child_lanes: [],
          updated_at: '2026-04-17T00:35:00.000Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.providerLinearWorkerProof).toMatchObject({
      appserver_supervision: {
        selected_runtime: {
          selected_mode: 'appserver',
          runtime_session_id: 'appserver-run-child'
        },
        sticky_environment_id: 'env-appserver-proof',
        sticky_environment_status: 'proven',
        turn_persistence_status: 'proven',
        turn_persistence_source: 'session_log_hydration',
        pagination_status: 'blocked',
        resume_status: 'not_requested',
        fork_status: 'blocked',
        jsonl_truth_retained: true,
        session_log_truth_retained: true
      }
    });
  }, 20_000);

  it('does not refresh settled appserver-requested CLI fallback proofs for missing session-log truth', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        started_at: '2026-04-17T00:30:00.000Z',
        updated_at: '2026-04-17T00:35:00.000Z',
        workspace_path: root
      }),
      'utf8'
    );
    const fallback = {
      occurred: true,
      code: 'appserver-command-unavailable',
      reason: 'Appserver preflight failed.',
      from_mode: 'appserver',
      to_mode: 'cli',
      checked_at: '2026-04-17T00:30:00.000Z'
    } as const;
    const proof = buildProviderLinearWorkerProof({
      attempt_started_at: '2026-04-17T00:30:00.000Z',
      current_turn_started_at: '2026-04-17T00:30:01.000Z',
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      session_log_thread_id: null,
      session_log_turn_id: null,
      session_log_session_id: null,
      turn_count: 1,
      last_event: 'task_complete',
      last_message: null,
      last_event_at: '2026-04-17T00:35:00.000Z',
      current_turn_activity: {
        event: 'task_complete',
        message_or_payload: null,
        recorded_at: '2026-04-17T00:35:00.000Z',
        source: 'stdout_jsonl',
        turn_id: 'turn-1',
        session_id: 'thread-1-turn-1'
      },
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: {
        primary: {
          used_percent: 10,
          window_minutes: 300
        }
      },
      runtime: {
        requested_mode: 'appserver',
        selected_mode: 'cli',
        provider: 'CliRuntimeProvider',
        runtime_session_id: null,
        fallback
      },
      appserver_supervision: {
        selected_runtime: {
          requested_mode: 'appserver',
          selected_mode: 'cli',
          provider: 'CliRuntimeProvider',
          runtime_session_id: null,
          fallback
        },
        supervision_command: 'codex_exec',
        appserver_session_id: null,
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        session_log_thread_id: null,
        session_log_turn_id: null,
        session_log_session_id: null,
        sticky_environment_id: null,
        sticky_environment_status: 'blocked',
        sticky_environment_blocker: 'configured_environment_id_missing',
        turn_persistence_status: 'blocked',
        turn_persistence_source: null,
        turn_persistence_blocker: 'session_log_hydration_missing',
        pagination_status: 'blocked',
        pagination_blocker: 'appserver_pagination_probe_not_implemented',
        resume_status: 'not_requested',
        resume_source_thread_id: null,
        resume_observed_thread_id: null,
        resume_blocker: null,
        fork_status: 'blocked',
        fork_blocker: 'appserver_fork_probe_not_implemented',
        jsonl_truth_retained: true,
        session_log_truth_retained: false,
        updated_at: '2026-04-17T00:35:00.000Z'
      },
      owner_phase: 'turn_completed',
      owner_status: 'in_progress',
      workspace_path: root,
      child_lanes: [],
      progress: null,
      updated_at: '2026-04-17T00:35:00.000Z'
    });
    const proofRaw = JSON.stringify(proof, null, 2);
    const proofPath = join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(proofPath, proofRaw, 'utf8');

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.providerLinearWorkerProof?.appserver_supervision).toMatchObject({
      selected_runtime: {
        requested_mode: 'appserver',
        selected_mode: 'cli'
      },
      session_log_truth_retained: false,
      turn_persistence_status: 'blocked',
      turn_persistence_blocker: 'session_log_hydration_missing'
    });
    await expect(readFile(proofPath, 'utf8')).resolves.toBe(proofRaw);
  });

  it('refreshes in-progress provider proofs from session telemetry during projection reads', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          latest_turn_id: null,
          latest_session_id: null,
          latest_session_id_source: null,
          turn_count: 1,
          last_event: 'item.completed',
          last_message: null,
          last_event_at: null,
          tokens: {
            input_tokens: null,
            output_tokens: null,
            total_tokens: null
          },
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: root,
          end_reason: null,
          updated_at: '2026-03-20T01:15:28.970Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const codexHome = join(root, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '03', '20');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, 'rollout-2026-03-20T01-15-30-000Z-thread-1.jsonl'),
      [
        JSON.stringify({
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: root,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Autonomous intake handoff'
          }
        }),
        JSON.stringify({
          type: 'turn_context',
          payload: {
            turn_id: 'turn-3'
          }
        }),
        JSON.stringify({
          type: 'event_msg',
          payload: {
            type: 'token_count',
            info: {
              total_token_usage: {
                input_tokens: 55,
                output_tokens: 21,
                total_tokens: 76
              }
            },
            rate_limits: {
              primary: {
                used_percent: 18,
                window_minutes: 300
              },
              secondary: {
                used_percent: 52,
                window_minutes: 10080
              }
            }
          }
        })
      ].join('\n'),
      'utf8'
    );

    const originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = codexHome;
    try {
      const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

      expect(selected?.providerLinearWorkerProof).toMatchObject({
        latest_turn_id: 'turn-3',
        latest_session_id: 'thread-1-turn-3',
        latest_session_id_source: 'derived_from_thread_and_turn',
        tokens: {
          input_tokens: 55,
          output_tokens: 21,
          total_tokens: 76
        },
        rate_limits: {
          primary: {
            used_percent: 18,
            window_minutes: 300
          },
          secondary: {
            used_percent: 52,
            window_minutes: 10080
          }
        }
      });
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
  });

  it('refreshes in-progress provider proofs when token fields are undefined in the sidecar', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'item.completed',
          last_message: null,
          last_event_at: null,
          tokens: {} as ProviderLinearWorkerProof['tokens'],
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: root,
          end_reason: null,
          updated_at: '2026-03-20T01:15:28.970Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const codexHome = join(root, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '03', '20');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, 'rollout-2026-03-20T01-15-30-000Z-thread-1.jsonl'),
      [
        JSON.stringify({
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: root,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Autonomous intake handoff'
          }
        }),
        JSON.stringify({
          type: 'turn_context',
          payload: {
            turn_id: 'turn-3'
          }
        }),
        JSON.stringify({
          type: 'event_msg',
          payload: {
            type: 'token_count',
            info: {
              total_token_usage: {
                input_tokens: 55,
                output_tokens: 21,
                total_tokens: 76
              }
            },
            rate_limits: {
              primary: {
                used_percent: 18,
                window_minutes: 300
              },
              secondary: {
                used_percent: 52,
                window_minutes: 10080
              }
            }
          }
        })
      ].join('\n'),
      'utf8'
    );

    const originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = codexHome;
    try {
      const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

      expect(selected?.providerLinearWorkerProof).toMatchObject({
        latest_turn_id: 'turn-3',
        latest_session_id: 'thread-1-turn-3',
        latest_session_id_source: 'derived_from_thread_and_turn',
        tokens: {
          input_tokens: 55,
          output_tokens: 21,
          total_tokens: 76
        },
        rate_limits: {
          primary: {
            used_percent: 18,
            window_minutes: 300
          },
          secondary: {
            used_percent: 52,
            window_minutes: 10080
          }
        }
      });
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
  });

  it('refreshes in-progress provider proofs when rate_limits is omitted in the sidecar', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'item.completed',
          last_message: null,
          last_event_at: null,
          tokens: {
            input_tokens: 12,
            output_tokens: 8,
            total_tokens: 20
          },
          rate_limits: undefined as unknown as ProviderLinearWorkerProof['rate_limits'],
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: root,
          end_reason: null,
          updated_at: '2026-03-20T01:15:28.970Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const codexHome = join(root, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '03', '20');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, 'rollout-2026-03-20T01-15-30-000Z-thread-1.jsonl'),
      [
        JSON.stringify({
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: root,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Autonomous intake handoff'
          }
        }),
        JSON.stringify({
          type: 'turn_context',
          payload: {
            turn_id: 'turn-3'
          }
        }),
        JSON.stringify({
          type: 'event_msg',
          payload: {
            type: 'token_count',
            info: {
              total_token_usage: {
                input_tokens: 55,
                output_tokens: 21,
                total_tokens: 76
              }
            },
            rate_limits: {
              primary: {
                used_percent: 18,
                window_minutes: 300
              },
              secondary: {
                used_percent: 52,
                window_minutes: 10080
              }
            }
          }
        })
      ].join('\n'),
      'utf8'
    );

    const originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = codexHome;
    try {
      const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

      expect(selected?.providerLinearWorkerProof).toMatchObject({
        latest_turn_id: 'turn-3',
        latest_session_id: 'thread-1-turn-3',
        latest_session_id_source: 'derived_from_thread_and_turn',
        tokens: {
          input_tokens: 55,
          output_tokens: 21,
          total_tokens: 76
        },
        rate_limits: {
          primary: {
            used_percent: 18,
            window_minutes: 300
          },
          secondary: {
            used_percent: 52,
            window_minutes: 10080
          }
        }
      });
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
  });

  it('prefers queued retry claim status text over a retained prior manifest summary', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'previous run failed and is awaiting rerun',
        commands: []
      }),
      'utf8'
    );

    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:16:00.000Z',
      rehydrated_at: '2026-03-20T01:16:00.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_resumable_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T01:10:13.574Z',
          task_id: 'linear-lin-issue-1',
          mapping_source: 'provider_id_fallback',
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          accepted_at: '2026-03-20T01:10:13.574Z',
          updated_at: '2026-03-20T01:16:00.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_000_000,
          run_id: 'run-child',
          run_manifest_path: childPaths.manifestPath,
          retry_queued: true,
          retry_attempt: 2,
          retry_due_at: '2026-03-20T01:17:00.000Z',
          retry_error: 'retryable failure pending rerun'
        }
      ]
    };

    const retrying = await discoverAuthoritativeRetryCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(retrying).toHaveLength(1);
    expect(retrying[0]).toMatchObject({
      rawStatus: 'resumable',
      displayStatus: 'retrying',
      summary: 'provider_issue_rehydrated_resumable_run',
      lastError: 'retryable failure pending rerun',
      workspacePath: join(root, '.workspaces', 'linear-lin-issue-1')
    });
    expect(retrying[0]?.latestEvent).toMatchObject({
      at: '2026-03-20T01:16:00.000Z',
      event: 'resumable',
      message: 'provider_issue_rehydrated_resumable_run',
      reason: 'provider_issue_rehydrated_resumable_run'
    });
  });

  it('discovers manifest-only retrying contexts when provider intake state is absent', async () => {
    const { root, paths } = await createHostPaths();
    const retryEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const retryPaths = resolveRunPaths(retryEnv, 'run-child');
    await mkdir(retryPaths.runDir, { recursive: true });
    await writeFile(
      retryPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'retryable failure pending rerun',
        commands: []
      }),
      'utf8'
    );

    const discovery = await discoverCompatibilityCollectionContexts(createProjectionContext(paths));

    expect(discovery.running).toEqual([]);
    expect(discovery.retrying).toHaveLength(1);
    expect(discovery.retrying[0]).toMatchObject({
      issueIdentifier: 'CO-2',
      runId: 'run-child',
      rawStatus: 'failed',
      displayStatus: 'failed',
      summary: 'retryable failure pending rerun'
    });
  });

  it('keeps full compatibility discovery for small provider-intake sets', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const providerPaths = resolveRunPaths(providerEnv, 'run-provider-active');
    const unrelatedEnv = {
      ...providerEnv,
      taskId: 'linear-unrelated'
    };
    const unrelatedPaths = resolveRunPaths(unrelatedEnv, 'run-unrelated-active');
    await Promise.all([
      mkdir(providerPaths.runDir, { recursive: true }),
      mkdir(unrelatedPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      providerPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-provider-active',
        task_id: 'linear-lin-issue-1',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'provider-intake-backed active run',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      unrelatedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-unrelated-active',
        task_id: 'linear-unrelated',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-unrelated',
        issue_identifier: 'CO-999',
        updated_at: '2026-03-20T01:17:00.000Z',
        summary: 'unrelated active run should not be scanned',
        commands: []
      }),
      'utf8'
    );
    const providerIntakeState = createProviderIntakeState(providerPaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-provider-active',
      run_manifest_path: providerPaths.manifestPath
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running.map((entry) => entry.runId)).toEqual([
      'run-unrelated-active',
      'run-provider-active'
    ]);
    expect(discovery.all.map((entry) => entry.runId)).toContain('run-unrelated-active');
  });

  it('bounds high-volume provider-intake discovery to active claim directories', async () => {
    const { root, paths } = await createHostPaths();
    const activeEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-active'
    };
    const activePaths = resolveRunPaths(activeEnv, 'run-active');
    const releasedEnv = {
      ...activeEnv,
      taskId: 'linear-released'
    };
    const releasedPaths = resolveRunPaths(releasedEnv, 'run-released-active-looking');
    const releasedLocalRunId = '2026-03-20T03-20-00-000Z-released-local-active';
    const releasedLocalPaths = resolveRunPaths(releasedEnv, releasedLocalRunId);
    const releasedNoisePaths = Array.from({ length: 70 }, (_, index) => {
      const taskId = `linear-zreleased-${index}`;
      return {
        index,
        taskId,
        paths: resolveRunPaths(
          {
            ...activeEnv,
            taskId
          },
          `run-zreleased-${index}`
        )
      };
    });
    const localEnv = {
      ...activeEnv,
      taskId: 'local-active-tool'
    };
    const localPaths = resolveRunPaths(localEnv, 'run-local-active');
    const syntheticLocalEnv = {
      ...activeEnv,
      taskId: 'linear-active-zzzz-docs-review'
    };
    const syntheticLocalRunId = '2026-03-20T03-18-00-000Z-linear-derived-local-active';
    const syntheticLocalPaths = resolveRunPaths(
      syntheticLocalEnv,
      syntheticLocalRunId
    );
    const syntheticUnrelatedLocalEnv = {
      ...activeEnv,
      taskId: 'linear-unclaimed-local-tool'
    };
    const syntheticUnrelatedLocalRunId = '2026-03-20T03-19-00-000Z-linear-unclaimed-local-active';
    const syntheticUnrelatedLocalPaths = resolveRunPaths(
      syntheticUnrelatedLocalEnv,
      syntheticUnrelatedLocalRunId
    );
    const syntheticProviderWorkerEnv = {
      ...activeEnv,
      taskId: 'linear-unclaimed-provider-worker'
    };
    const syntheticProviderWorkerRunId =
      '2026-03-20T03-21-00-000Z-provider-worker-missing-issue-provider';
    const syntheticProviderWorkerPaths = resolveRunPaths(
      syntheticProviderWorkerEnv,
      syntheticProviderWorkerRunId
    );
    const syntheticLinearDocsEnv = {
      ...activeEnv,
      taskId: 'linear-unclaimed-docs-review'
    };
    const syntheticLinearDocsRunId = '2026-03-20T03-23-00-000Z-linear-docs-review-active';
    const syntheticLinearDocsPaths = resolveRunPaths(
      syntheticLinearDocsEnv,
      syntheticLinearDocsRunId
    );
    const syntheticRecentActivityEnv = {
      ...activeEnv,
      taskId: 'linear-old-run-recent-activity'
    };
    const syntheticRecentActivityRunId = '2026-03-20T00-05-00-000Z-old-run-recent-activity';
    const syntheticRecentActivityPaths = resolveRunPaths(
      syntheticRecentActivityEnv,
      syntheticRecentActivityRunId
    );
    const syntheticNoisePaths = Array.from({ length: 70 }, (_, index) => {
      const taskId = `linear-active-zlocal-noise-${index}`;
      return {
        index,
        taskId,
        runId: `2026-03-20T01-${String(index % 20).padStart(2, '0')}-00-000Z-zlocal-noise-${index}`,
        paths: resolveRunPaths(
          {
            ...activeEnv,
            taskId
          },
          `2026-03-20T01-${String(index % 20).padStart(2, '0')}-00-000Z-zlocal-noise-${index}`
        )
      };
    });
    await Promise.all([
      mkdir(activePaths.runDir, { recursive: true }),
      mkdir(releasedPaths.runDir, { recursive: true }),
      mkdir(releasedLocalPaths.runDir, { recursive: true }),
      mkdir(localPaths.runDir, { recursive: true }),
      mkdir(syntheticLocalPaths.runDir, { recursive: true }),
      mkdir(syntheticUnrelatedLocalPaths.runDir, { recursive: true }),
      mkdir(syntheticProviderWorkerPaths.runDir, { recursive: true }),
      mkdir(syntheticLinearDocsPaths.runDir, { recursive: true }),
      mkdir(syntheticRecentActivityPaths.runDir, { recursive: true }),
      ...releasedNoisePaths.map((entry) => mkdir(entry.paths.runDir, { recursive: true })),
      ...syntheticNoisePaths.map((entry) => mkdir(entry.paths.runDir, { recursive: true }))
    ]);
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'linear-active',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-active',
        issue_identifier: 'CO-ACTIVE',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'active provider run',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      releasedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-released-active-looking',
        task_id: 'linear-released',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-released',
        issue_identifier: 'CO-RELEASED',
        updated_at: '2026-03-20T01:15:00.000Z',
        summary: 'released historical run should not be scanned on high-volume status',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      localPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-local-active',
        task_id: 'local-active-tool',
        status: 'in_progress',
        issue_identifier: 'LOCAL-ACTIVE',
        updated_at: '2026-03-20T01:17:00.000Z',
        summary: 'non-intake local run remains visible in high-volume mode',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      releasedLocalPaths.manifestPath,
      JSON.stringify({
        run_id: releasedLocalRunId,
        task_id: 'linear-released',
        status: 'in_progress',
        issue_identifier: 'LOCAL-RELEASED-TASK',
        updated_at: '2026-03-20T03:20:00.000Z',
        summary: 'non-provider local run under an inactive provider-claim task remains visible',
        commands: []
      }),
      'utf8'
    );
    await Promise.all(
      releasedNoisePaths.map((entry) =>
        writeFile(
          entry.paths.manifestPath,
          JSON.stringify({
            run_id: `run-zreleased-${entry.index}`,
            task_id: entry.taskId,
            pipeline_id: 'provider-linear-worker',
            status: 'in_progress',
            issue_provider: 'linear',
            issue_id: `lin-zreleased-${entry.index}`,
            issue_identifier: `CO-ZREL-${entry.index}`,
            updated_at: '2026-03-20T01:14:00.000Z',
            summary: 'inactive retained provider history should not spend synthetic local scan budget',
            commands: []
          }),
          'utf8'
        )
      )
    );
    await writeFile(
      syntheticLocalPaths.manifestPath,
      JSON.stringify({
        run_id: syntheticLocalRunId,
        task_id: 'linear-active-zzzz-docs-review',
        status: 'in_progress',
        issue_identifier: 'LOCAL-LINEAR-DERIVED',
        updated_at: '2026-03-20T03:18:00.000Z',
        summary: 'non-intake local run under a Linear-derived task id remains visible by bounded cheap recency',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      syntheticUnrelatedLocalPaths.manifestPath,
      JSON.stringify({
        run_id: syntheticUnrelatedLocalRunId,
        task_id: 'linear-unclaimed-local-tool',
        status: 'in_progress',
        issue_identifier: 'LOCAL-LINEAR-UNCLAIMED',
        updated_at: '2026-03-20T03:19:00.000Z',
        summary: 'non-intake local run under an unclaimed Linear-looking task id remains visible by bounded cheap recency',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      syntheticProviderWorkerPaths.manifestPath,
      JSON.stringify({
        run_id: syntheticProviderWorkerRunId,
        task_id: 'linear-unclaimed-provider-worker',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_id: 'lin-stale-provider',
        issue_identifier: 'CO-STALE',
        updated_at: '2026-03-20T03:21:00.000Z',
        summary: 'provider-worker manifest without issue_provider should not be treated as local work',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      syntheticLinearDocsPaths.manifestPath,
      JSON.stringify({
        run_id: syntheticLinearDocsRunId,
        task_id: 'linear-unclaimed-docs-review',
        pipeline_id: 'docs-review',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-docs',
        issue_identifier: 'CO-DOCS',
        updated_at: '2026-03-20T03:23:00.000Z',
        summary: 'linear-tagged non-provider-worker docs run remains visible',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      syntheticRecentActivityPaths.manifestPath,
      JSON.stringify({
        run_id: syntheticRecentActivityRunId,
        task_id: 'linear-old-run-recent-activity',
        status: 'in_progress',
        issue_identifier: 'LOCAL-RECENT-ACTIVITY',
        updated_at: '2026-03-20T03:22:00.000Z',
        summary: 'older-started local run with recent activity should stay visible',
        commands: []
      }),
      'utf8'
    );
    await Promise.all(
      syntheticNoisePaths.map((entry) =>
        writeFile(
          entry.paths.manifestPath,
          JSON.stringify({
            run_id: entry.runId,
            task_id: entry.taskId,
            status: 'in_progress',
            issue_identifier: `LOCAL-ZNOISE-${entry.index}`,
            updated_at: `2026-03-20T01:${String(entry.index % 20).padStart(2, '0')}:00.000Z`,
            summary: 'older non-intake synthetic local run should not hide newer local work',
            commands: []
          }),
          'utf8'
        )
      )
    );
    const olderSyntheticTaskTime = new Date('2026-03-19T00:00:00.000Z');
    const newerSyntheticTaskTime = new Date('2026-03-20T02:00:00.000Z');
    const syntheticLocalActivityTime = new Date('2026-03-20T03:18:00.000Z');
    const syntheticUnrelatedActivityTime = new Date('2026-03-20T03:19:00.000Z');
    const releasedLocalActivityTime = new Date('2026-03-20T03:20:00.000Z');
    const syntheticProviderWorkerActivityTime = new Date('2026-03-20T03:21:00.000Z');
    const syntheticRecentActivityRunTime = new Date('2026-03-20T00:05:00.000Z');
    const syntheticLinearDocsActivityTime = new Date('2026-03-20T03:23:00.000Z');
    await Promise.all([
      utimes(syntheticLocalPaths.runDir, syntheticLocalActivityTime, syntheticLocalActivityTime),
      utimes(syntheticUnrelatedLocalPaths.runDir, syntheticUnrelatedActivityTime, syntheticUnrelatedActivityTime),
      utimes(releasedLocalPaths.runDir, releasedLocalActivityTime, releasedLocalActivityTime),
      utimes(
        syntheticProviderWorkerPaths.runDir,
        syntheticProviderWorkerActivityTime,
        syntheticProviderWorkerActivityTime
      ),
      utimes(
        syntheticLinearDocsPaths.runDir,
        syntheticLinearDocsActivityTime,
        syntheticLinearDocsActivityTime
      ),
      utimes(
        syntheticRecentActivityPaths.runDir,
        syntheticRecentActivityRunTime,
        syntheticRecentActivityRunTime
      ),
      ...syntheticNoisePaths.map((entry) =>
        utimes(
          entry.paths.runDir,
          new Date(`2026-03-20T01:${String(entry.index % 20).padStart(2, '0')}:00.000Z`),
          new Date(`2026-03-20T01:${String(entry.index % 20).padStart(2, '0')}:00.000Z`)
        )
      )
    ]);
    await Promise.all(
      syntheticNoisePaths.map((entry) =>
        utimes(join(activeEnv.runsRoot, entry.taskId), newerSyntheticTaskTime, newerSyntheticTaskTime)
      )
    );
    await Promise.all([
      utimes(join(activeEnv.runsRoot, syntheticLocalEnv.taskId), olderSyntheticTaskTime, olderSyntheticTaskTime),
      utimes(
        join(activeEnv.runsRoot, syntheticUnrelatedLocalEnv.taskId),
        olderSyntheticTaskTime,
        olderSyntheticTaskTime
      )
    ]);
    const baseClaim = createProviderIntakeState(activePaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:20:00.000Z',
      rehydrated_at: '2026-03-20T01:20:00.000Z',
      latest_provider_key: 'linear:lin-active',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          ...baseClaim,
          provider_key: 'linear:lin-active',
          issue_id: 'lin-active',
          issue_identifier: 'CO-ACTIVE',
          issue_title: 'Active issue',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          task_id: 'linear-active',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          updated_at: '2026-03-20T01:20:00.000Z',
          run_id: 'run-active',
          run_manifest_path: activePaths.manifestPath
        },
        {
          ...baseClaim,
          provider_key: 'linear:lin-released',
          issue_id: 'lin-released',
          issue_identifier: 'CO-RELEASED',
          issue_title: 'Released issue',
          issue_state: 'Done',
          issue_state_type: 'completed',
          task_id: 'linear-released',
          state: 'released' as const,
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-03-20T01:10:00.000Z',
          run_id: 'run-released-active-looking',
          run_manifest_path: releasedPaths.manifestPath
        },
        ...releasedNoisePaths.map((entry) => ({
          ...baseClaim,
          provider_key: `linear:lin-zreleased-${entry.index}`,
          issue_id: `lin-zreleased-${entry.index}`,
          issue_identifier: `CO-ZREL-${entry.index}`,
          issue_title: `Released noise issue ${entry.index}`,
          issue_state: 'Done',
          issue_state_type: 'completed',
          task_id: entry.taskId,
          state: 'released' as const,
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-03-20T01:10:00.000Z',
          run_id: `run-zreleased-${entry.index}`,
          run_manifest_path: entry.paths.manifestPath
        }))
      ]
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    const runningRunIds = discovery.running.map((entry) => entry.runId ?? '');
    expect(runningRunIds).toEqual(
      expect.arrayContaining([
        syntheticLocalRunId,
        syntheticUnrelatedLocalRunId,
        syntheticLinearDocsRunId,
        syntheticRecentActivityRunId,
        releasedLocalRunId,
        'run-local-active',
        'run-active'
      ])
    );
    const allRunIds = discovery.all.map((entry) => entry.runId ?? '');
    expect(allRunIds).not.toContain('run-released-active-looking');
    expect(allRunIds).not.toContain(syntheticProviderWorkerRunId);
    expect(allRunIds.filter((runId) => runId.startsWith('run-zreleased-'))).toEqual([]);
  });

  it('reconciles orphaned active provider manifests with released claim and newer terminal run truth', async () => {
    const { root, paths } = await createHostPaths();
    const orphanEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const orphanPaths = resolveRunPaths(orphanEnv, 'run-orphaned-active');
    const terminalPaths = resolveRunPaths(orphanEnv, 'run-terminal-success');
    const liveEnv = {
      ...orphanEnv,
      taskId: 'linear-lin-issue-live'
    };
    const livePaths = resolveRunPaths(liveEnv, 'run-live');
    await Promise.all([
      mkdir(orphanPaths.runDir, { recursive: true }),
      mkdir(terminalPaths.runDir, { recursive: true }),
      mkdir(livePaths.runDir, { recursive: true })
    ]);
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-orphaned-active',
        task_id: 'linear-lin-issue-1',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-93',
        started_at: '2026-04-09T08:36:05.089Z',
        updated_at: '2026-04-09T08:40:00.000Z',
        summary: 'old provider run still active-looking',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      terminalPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-terminal-success',
        task_id: 'linear-lin-issue-1',
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-93',
        started_at: '2026-04-13T02:26:01.632Z',
        updated_at: '2026-04-13T02:30:00.000Z',
        summary: 'newer terminal run',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      livePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-live',
        task_id: 'linear-lin-issue-live',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-live',
        issue_identifier: 'CO-LIVE',
        started_at: '2026-04-18T12:00:00.000Z',
        updated_at: '2026-04-18T12:05:00.000Z',
        summary: 'genuine live provider run',
        commands: []
      }),
      'utf8'
    );
    const baseClaim = createProviderIntakeState(terminalPaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: 'linear:lin-issue-live',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          ...baseClaim,
          issue_identifier: 'CO-93',
          issue_state: 'Done',
          issue_state_type: 'completed',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-04-18T12:09:00.000Z',
          run_id: 'run-terminal-success',
          run_manifest_path: terminalPaths.manifestPath
        },
        {
          ...baseClaim,
          provider_key: 'linear:lin-issue-live',
          issue_id: 'lin-issue-live',
          issue_identifier: 'CO-LIVE',
          issue_title: 'Live issue',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          task_id: 'linear-lin-issue-live',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          updated_at: '2026-04-18T12:10:00.000Z',
          run_id: 'run-live',
          run_manifest_path: livePaths.manifestPath
        }
      ]
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running.map((entry) => entry.runId)).toEqual(['run-live']);
    const reconciled = discovery.all.find((entry) => entry.runId === 'run-orphaned-active');
    expect(reconciled).toMatchObject({
      rawStatus: 'succeeded',
      statusReason: 'provider_claim_released',
      summary: expect.stringContaining('newer terminal run run-terminal-success supersedes')
    });
    const reconciliation = JSON.parse(
      await readFile(join(orphanPaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      kind: 'provider-linear-worker-run-artifact-reconciliation',
      status: 'reconciled',
      reconciled_status: 'succeeded',
      reason: 'provider_claim_released',
      manifest: {
        run_id: 'run-orphaned-active',
        status: 'in_progress'
      },
      provider_claim: {
        state: 'released',
        reason: 'provider_issue_released:not_active'
      },
      recorded_at: '2026-04-18T12:09:00.000Z',
      replacement_run: {
        run_id: 'run-terminal-success',
        status: 'succeeded'
      }
    });
  });

  it('reconciles retry-queued terminal provider claims as stale run artifacts', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-done'
    };
    const stalePaths = resolveRunPaths(providerEnv, 'run-stale-active');
    await mkdir(stalePaths.runDir, { recursive: true });
    await writeFile(
      stalePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-stale-active',
        task_id: 'linear-lin-done',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-done',
        issue_identifier: 'CO-DONE',
        started_at: '2026-03-20T00:55:00.000Z',
        updated_at: '2026-03-20T01:00:00.000Z',
        summary: 'stale active-looking provider run',
        commands: []
      }),
      'utf8'
    );
    const baseClaim = createProviderIntakeState(stalePaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:10:00.000Z',
      rehydrated_at: '2026-03-20T01:10:00.000Z',
      latest_provider_key: 'linear:lin-done',
      latest_reason: 'provider_issue_completed',
      claims: [
        {
          ...baseClaim,
          provider_key: 'linear:lin-done',
          issue_id: 'lin-done',
          issue_identifier: 'CO-DONE',
          issue_title: 'Done issue',
          issue_state: 'Done',
          issue_state_type: 'completed',
          task_id: 'linear-lin-done',
          state: 'completed',
          reason: 'provider_issue_completed',
          updated_at: '2026-03-20T01:10:00.000Z',
          run_id: 'run-stale-active',
          run_manifest_path: stalePaths.manifestPath,
          retry_queued: true,
          retry_attempt: 1,
          retry_due_at: '2026-03-20T01:15:00.000Z',
          retry_error: 'legacy retry marker should not keep completed claim active'
        }
      ]
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running.map((entry) => entry.runId)).not.toContain('run-stale-active');
    const reconciled = discovery.all.find((entry) => entry.runId === 'run-stale-active');
    expect(reconciled).toMatchObject({
      rawStatus: 'succeeded',
      statusReason: 'provider_claim_completed',
      summary: expect.stringContaining('provider claim is completed')
    });
    const reconciliation = JSON.parse(
      await readFile(join(stalePaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      kind: 'provider-linear-worker-run-artifact-reconciliation',
      status: 'reconciled',
      reconciled_status: 'succeeded',
      reason: 'provider_claim_completed',
      manifest: {
        run_id: 'run-stale-active',
        status: 'in_progress'
      },
      provider_claim: {
        state: 'completed',
        reason: 'provider_issue_completed',
        run_id: 'run-stale-active'
      },
      recorded_at: '2026-03-20T01:10:00.000Z'
    });
  });

  it('reconciles todo-blocked released claims as stale provider artifacts', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-todo'
    };
    const orphanPaths = resolveRunPaths(providerEnv, 'run-todo-blocked-active');
    await mkdir(orphanPaths.runDir, { recursive: true });
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-todo-blocked-active',
        task_id: 'linear-co-todo',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-todo-id',
        issue_identifier: 'CO-TODO',
        started_at: '2026-04-09T08:36:05.089Z',
        updated_at: '2026-04-09T08:40:00.000Z',
        summary: 'todo-blocked provider run still active-looking',
        commands: []
      }),
      'utf8'
    );
    const baseClaim = createProviderIntakeState(orphanPaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: 'linear:co-todo-id',
      latest_reason: 'provider_issue_released:todo_blocked_by_non_terminal',
      claims: [
        {
          ...baseClaim,
          provider_key: 'linear:co-todo-id',
          issue_id: 'co-todo-id',
          issue_identifier: 'CO-TODO',
          issue_state: 'Todo',
          issue_state_type: 'unstarted',
          task_id: 'linear-co-todo',
          state: 'released',
          reason: 'provider_issue_released:todo_blocked_by_non_terminal',
          updated_at: '2026-04-18T12:09:00.000Z',
          run_id: 'run-todo-blocked-active',
          run_manifest_path: orphanPaths.manifestPath
        }
      ]
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running).toEqual([]);
    expect(discovery.all.find((entry) => entry.runId === 'run-todo-blocked-active')).toMatchObject({
      rawStatus: 'cancelled',
      statusReason: 'provider_claim_released',
      summary: expect.stringContaining(
        'provider claim is released (provider_issue_released:todo_blocked_by_non_terminal)'
      )
    });
    const reconciliation = JSON.parse(
      await readFile(join(orphanPaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_released',
      reconciled_status: 'cancelled',
      recorded_at: '2026-04-18T12:09:00.000Z',
      provider_claim: {
        state: 'released',
        reason: 'provider_issue_released:todo_blocked_by_non_terminal',
        issue_state: 'Todo',
        issue_state_type: 'unstarted'
      }
    });
  });

  it('keeps exact run-bound active claims ahead of newer issue-only aliases', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-241'
    };
    const activeRunId = 'run-co-241-active';
    const activePaths = resolveRunPaths(providerEnv, activeRunId);
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: activeRunId,
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        started_at: '2026-04-11T08:36:05.089Z',
        updated_at: '2026-04-11T08:40:00.000Z',
        summary: 'active provider run with exact run-bound claim',
        commands: []
      }),
      'utf8'
    );
    const baseClaim = createProviderIntakeState(activePaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: 'linear:co-241-id',
      latest_reason: 'provider_issue_released:not_active',
      claims: [
        {
          ...baseClaim,
          provider_key: 'linear:co-241-id',
          issue_id: 'co-241-id',
          issue_identifier: 'CO-241',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          task_id: 'linear-co-241',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          updated_at: '2026-04-11T08:45:00.000Z',
          run_id: activeRunId,
          run_manifest_path: activePaths.manifestPath
        },
        {
          ...baseClaim,
          provider_key: 'linear:co-241-id',
          issue_id: 'co-241-id',
          issue_identifier: 'CO-241',
          issue_state: 'Done',
          issue_state_type: 'completed',
          task_id: 'linear-co-241',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-04-18T12:09:00.000Z',
          run_id: null,
          run_manifest_path: null
        }
      ]
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running.map((entry) => entry.runId)).toEqual([activeRunId]);
    expect(discovery.all.find((entry) => entry.runId === activeRunId)).toMatchObject({
      rawStatus: 'in_progress',
      statusReason: null,
      summary: 'active provider run with exact run-bound claim'
    });
    await expect(
      readFile(join(activePaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('sets lastError when reconciliation applies newer failed terminal run truth', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const orphanPaths = resolveRunPaths(providerEnv, 'run-orphaned-active');
    const terminalPaths = resolveRunPaths(providerEnv, 'run-terminal-failed');
    await Promise.all([
      mkdir(orphanPaths.runDir, { recursive: true }),
      mkdir(terminalPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-orphaned-active',
        task_id: 'linear-lin-issue-1',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-93',
        started_at: '2026-04-09T08:36:05.089Z',
        updated_at: '2026-04-09T08:40:00.000Z',
        summary: 'old provider run still active-looking',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      terminalPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-terminal-failed',
        task_id: 'linear-lin-issue-1',
        pipeline_id: 'provider-linear-worker',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-93',
        started_at: '2026-04-13T02:26:01.632Z',
        updated_at: '2026-04-13T02:30:00.000Z',
        summary: 'newer terminal failure',
        commands: []
      }),
      'utf8'
    );
    const baseClaim = createProviderIntakeState(terminalPaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_released:not_active',
      claims: [
        {
          ...baseClaim,
          issue_identifier: 'CO-93',
          issue_state: 'Done',
          issue_state_type: 'completed',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-04-18T12:09:00.000Z',
          run_id: 'run-terminal-failed',
          run_manifest_path: terminalPaths.manifestPath
        }
      ]
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    const reconciled = discovery.all.find((entry) => entry.runId === 'run-orphaned-active');
    expect(reconciled).toMatchObject({
      rawStatus: 'failed',
      displayStatus: 'failed',
      statusReason: 'provider_claim_released',
      summary: expect.stringContaining('newer terminal run run-terminal-failed supersedes'),
      lastError: expect.stringContaining('newer terminal run run-terminal-failed supersedes')
    });
  });

  it('reconciles selected task-local active provider manifests with newer terminal run truth', async () => {
    const { root } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-93'
    };
    const stalePaths = resolveRunPaths(providerEnv, 'run-co-93-selected-stale');
    const terminalPaths = resolveRunPaths(providerEnv, 'run-co-93-selected-terminal');
    await Promise.all([
      mkdir(stalePaths.runDir, { recursive: true }),
      mkdir(terminalPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      stalePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-selected-stale',
        task_id: 'linear-co-93',
        pipeline_title: 'Provider Linear Worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-09T08:36:05.089Z',
        updated_at: '2026-04-09T08:40:00.000Z',
        summary: 'selected stale active-looking provider manifest',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      terminalPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-selected-terminal',
        task_id: 'linear-co-93',
        pipeline_title: 'Provider Linear Worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-13T02:26:01.632Z',
        updated_at: '2026-04-13T02:30:00.000Z',
        summary: 'newer terminal selected sibling',
        commands: []
      }),
      'utf8'
    );
    const baseClaim = createProviderIntakeState(terminalPaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: 'linear:co-93-id',
      latest_reason: 'provider_issue_released:not_active',
      claims: [
        {
          ...baseClaim,
          provider_key: 'linear:co-93-id',
          issue_id: 'co-93-id',
          issue_identifier: 'CO-93',
          issue_state: 'Done',
          issue_state_type: 'completed',
          task_id: 'linear-co-93',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-04-18T12:09:00.000Z',
          run_id: 'run-co-93-selected-terminal',
          run_manifest_path: terminalPaths.manifestPath
        }
      ]
    };

    const selected = await createProjectionReader(
      stalePaths,
      stalePaths.manifestPath,
      providerIntakeState
    ).buildCompatibilitySourceContext();

    expect(selected).toMatchObject({
      runId: 'run-co-93-selected-stale',
      rawStatus: 'succeeded',
      statusReason: 'provider_claim_released',
      summary: expect.stringContaining('newer terminal run run-co-93-selected-terminal supersedes')
    });
    const reconciliation = JSON.parse(
      await readFile(join(stalePaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_released',
      manifest: {
        run_id: 'run-co-93-selected-stale',
        status: 'in_progress'
      },
      replacement_run: {
        run_id: 'run-co-93-selected-terminal',
        status: 'succeeded'
      }
    });
  });

  it('reconciles claim-selected provider manifests using the selected manifest runs root', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, 'provider-artifacts', '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-241'
    };
    const stalePaths = resolveRunPaths(providerEnv, 'run-co-241-selected-stale');
    const terminalPaths = resolveRunPaths(providerEnv, 'run-co-241-selected-terminal');
    await Promise.all([
      mkdir(stalePaths.runDir, { recursive: true }),
      mkdir(terminalPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      stalePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-241-selected-stale',
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        started_at: '2026-04-09T08:36:05.089Z',
        updated_at: '2026-04-09T08:40:00.000Z',
        summary: 'selected provider manifest is still active-looking',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      terminalPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-241-selected-terminal',
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        started_at: '2026-04-13T02:26:01.632Z',
        updated_at: '2026-04-13T02:30:00.000Z',
        summary: 'newer terminal selected sibling outside the control-host runs root',
        commands: []
      }),
      'utf8'
    );
    const baseClaim = createProviderIntakeState(stalePaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: 'linear:co-241-id',
      latest_reason: 'provider_issue_released:not_active',
      claims: [
        {
          ...baseClaim,
          provider_key: 'linear:co-241-id',
          issue_id: 'co-241-id',
          issue_identifier: 'CO-241',
          issue_state: 'Done',
          issue_state_type: 'completed',
          task_id: 'linear-co-241',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-04-18T12:09:00.000Z',
          run_id: 'run-co-241-selected-stale',
          run_manifest_path: stalePaths.manifestPath
        }
      ]
    };

    const selected = await createSelectedRunProjectionReader(
      createProjectionContext(paths, providerIntakeState)
    ).buildCompatibilitySourceContext();

    expect(selected).toMatchObject({
      runId: 'run-co-241-selected-stale',
      rawStatus: 'succeeded',
      statusReason: 'provider_claim_released',
      summary: expect.stringContaining('newer terminal run run-co-241-selected-terminal supersedes')
    });
    const reconciliation = JSON.parse(
      await readFile(join(stalePaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_released',
      manifest: {
        run_id: 'run-co-241-selected-stale',
        status: 'in_progress'
      },
      replacement_run: {
        run_id: 'run-co-241-selected-terminal',
        status: 'succeeded',
        manifest_path: terminalPaths.manifestPath
      }
    });
  });

  it('does not reconcile newer active manifests from older terminal claim evidence', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-93'
    };
    const activePaths = resolveRunPaths(providerEnv, 'run-co-93-new-active');
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-new-active',
        task_id: 'linear-co-93',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-18T12:14:00.000Z',
        updated_at: '2026-04-18T12:15:00.000Z',
        summary: 'fresh active-looking provider manifest after stale claim',
        commands: []
      }),
      'utf8'
    );
    const baseClaim = createProviderIntakeState(activePaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T13:00:00.000Z',
      rehydrated_at: '2026-04-18T13:00:00.000Z',
      latest_provider_key: 'linear:unrelated-issue',
      latest_reason: 'provider_issue_rehydrated_completed_run',
      claims: [
        {
          ...baseClaim,
          provider_key: 'linear:co-93-id',
          issue_id: 'co-93-id',
          issue_identifier: 'CO-93',
          issue_state: 'Done',
          issue_state_type: 'completed',
          task_id: 'linear-co-93',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-04-18T12:09:00.000Z',
          run_id: 'older-terminal-run',
          run_manifest_path: join(root, '.runs', 'linear-co-93', 'cli', 'older-terminal-run', 'manifest.json')
        }
      ]
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running.map((entry) => entry.runId)).toEqual(['run-co-93-new-active']);
    expect(discovery.all.find((entry) => entry.runId === 'run-co-93-new-active')).toMatchObject({
      rawStatus: 'in_progress',
      statusReason: null
    });
    await expect(
      readFile(join(activePaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ).rejects.toHaveProperty('code', 'ENOENT');
  });

  it('does not reconcile newer active manifests from older terminal artifacts with fresher update timestamps', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-93'
    };
    const terminalPaths = resolveRunPaths(providerEnv, 'run-co-93-old-terminal');
    const activePaths = resolveRunPaths(providerEnv, 'run-co-93-new-active');
    await Promise.all([
      mkdir(terminalPaths.runDir, { recursive: true }),
      mkdir(activePaths.runDir, { recursive: true })
    ]);
    await writeFile(
      terminalPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-old-terminal',
        task_id: 'linear-co-93',
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-09T08:36:05.089Z',
        updated_at: '2026-04-18T13:00:00.000Z',
        summary: 'older terminal artifact refreshed after completion',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-new-active',
        task_id: 'linear-co-93',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-18T12:14:00.000Z',
        updated_at: '2026-04-18T12:15:00.000Z',
        summary: 'newer active provider manifest without a matching active claim',
        commands: []
      }),
      'utf8'
    );
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T13:01:00.000Z',
      rehydrated_at: '2026-04-18T13:01:00.000Z',
      latest_provider_key: null,
      latest_reason: null,
      claims: []
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running.map((entry) => entry.runId)).toEqual(['run-co-93-new-active']);
    expect(discovery.all.find((entry) => entry.runId === 'run-co-93-new-active')).toMatchObject({
      rawStatus: 'in_progress',
      statusReason: null
    });
    await expect(
      readFile(join(activePaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ).rejects.toHaveProperty('code', 'ENOENT');
  });

  it('reconciles released claims with every Linear terminal workflow classifier shape', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-terminal-classifier'
    };
    const cases = [
      {
        runId: 'run-terminal-state-cancelled',
        issueId: 'terminal-cancelled',
        issueState: 'Cancelled',
        issueStateType: null
      },
      {
        runId: 'run-terminal-state-closed',
        issueId: 'terminal-closed',
        issueState: 'Closed',
        issueStateType: null
      },
      {
        runId: 'run-terminal-state-duplicate',
        issueId: 'terminal-duplicate',
        issueState: 'Duplicate',
        issueStateType: null
      },
      {
        runId: 'run-terminal-type-cancelled',
        issueId: 'terminal-type-cancelled',
        issueState: 'Custom terminal',
        issueStateType: 'cancelled'
      }
    ];
    const runPaths = await Promise.all(
      cases.map(async (entry) => {
        const pathsForRun = resolveRunPaths(providerEnv, entry.runId);
        await mkdir(pathsForRun.runDir, { recursive: true });
        await writeFile(
          pathsForRun.manifestPath,
          JSON.stringify({
            run_id: entry.runId,
            task_id: 'linear-terminal-classifier',
            pipeline_id: 'provider-linear-worker',
            status: 'in_progress',
            issue_provider: 'linear',
            issue_id: entry.issueId,
            issue_identifier: `CO-${entry.issueId}`,
            started_at: '2026-04-18T11:00:00.000Z',
            updated_at: '2026-04-18T11:05:00.000Z',
            summary: 'active-looking provider manifest with generic released claim',
            commands: []
          }),
          'utf8'
        );
        return pathsForRun;
      })
    );
    const baseClaim = createProviderIntakeState(runPaths[0]!.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: null,
      latest_reason: null,
      claims: cases.map((entry, index) => ({
        ...baseClaim,
        provider_key: `linear:${entry.issueId}`,
        issue_id: entry.issueId,
        issue_identifier: `CO-${entry.issueId}`,
        issue_title: 'Terminal classifier issue',
        issue_state: entry.issueState,
        issue_state_type: entry.issueStateType,
        task_id: 'linear-terminal-classifier',
        state: 'released',
        reason: 'provider_issue_released',
        updated_at: '2026-04-18T12:09:00.000Z',
        run_id: entry.runId,
        run_manifest_path: runPaths[index]!.manifestPath
      }))
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running).toEqual([]);
    for (const entry of cases) {
      expect(discovery.all.find((candidate) => candidate.runId === entry.runId)).toMatchObject({
        rawStatus: 'cancelled',
        statusReason: 'provider_claim_released'
      });
    }
  });

  it('keeps released live-rehydrate provider claims active for started issue state', async () => {
    const { root, paths } = await createHostPaths();
    const runsRoot = join(root, '.runs');
    const cases = [
      {
        taskId: 'linear-co-93-plain-rehydrate',
        runId: 'run-co-93-plain-rehydrate',
        issueId: 'co-93-plain-rehydrate',
        issueIdentifier: 'CO-93',
        reason: 'provider_issue_released:not_active'
      },
      {
        taskId: 'linear-co-93-pending-reopen',
        runId: 'run-co-93-pending-reopen',
        issueId: 'co-93-pending-reopen',
        issueIdentifier: 'CO-93R',
        reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active'
      }
    ];
    const runPaths = await Promise.all(
      cases.map(async (entry) => {
        const providerEnv = {
          repoRoot: root,
          runsRoot,
          outRoot: join(root, 'out'),
          taskId: entry.taskId
        };
        const pathsForRun = resolveRunPaths(providerEnv, entry.runId);
        await mkdir(pathsForRun.runDir, { recursive: true });
        await writeFile(
          pathsForRun.manifestPath,
          JSON.stringify({
            run_id: entry.runId,
            task_id: entry.taskId,
            pipeline_id: 'provider-linear-worker',
            status: 'in_progress',
            issue_provider: 'linear',
            issue_id: entry.issueId,
            issue_identifier: entry.issueIdentifier,
            started_at: '2026-04-18T12:14:00.000Z',
            updated_at: '2026-04-18T12:15:00.000Z',
            summary: 'released claim rehydrating active issue',
            commands: []
          }),
          'utf8'
        );
        return pathsForRun;
      })
    );
    const baseClaim = createProviderIntakeState(runPaths[0]!.manifestPath).claims[0]!;
    const liveRehydrateClaims = cases.map((entry, index) => ({
      ...baseClaim,
      provider_key: `linear:${entry.issueId}`,
      issue_id: entry.issueId,
      issue_identifier: entry.issueIdentifier,
      issue_title: 'Rehydrating active issue',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      task_id: entry.taskId,
      state: 'released' as const,
      reason: entry.reason,
      updated_at: '2026-04-18T12:59:00.000Z',
      run_id: entry.runId,
      run_manifest_path: runPaths[index]!.manifestPath
    }));
    const completedFillerClaims = Array.from({ length: 17 }, (_, index) => ({
      ...baseClaim,
      provider_key: `linear:co-93-completed-${index}`,
      issue_id: `co-93-completed-${index}`,
      issue_identifier: `CO-93C-${index}`,
      issue_title: 'Completed filler issue',
      issue_state: 'Done',
      issue_state_type: 'completed',
      task_id: `linear-co-93-completed-${index}`,
      state: 'completed' as const,
      reason: 'provider_issue_rehydrated_completed_run',
      updated_at: '2026-04-18T12:00:00.000Z',
      run_id: `run-co-93-completed-${index}`,
      run_manifest_path: join(
        runsRoot,
        `linear-co-93-completed-${index}`,
        'cli',
        `run-co-93-completed-${index}`,
        'manifest.json'
      )
    }));
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T13:00:00.000Z',
      rehydrated_at: '2026-04-18T13:00:00.000Z',
      latest_provider_key: 'linear:co-93-pending-reopen',
      latest_reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      claims: [...liveRehydrateClaims, ...completedFillerClaims]
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running.map((entry) => entry.runId).sort()).toEqual(
      cases.map((entry) => entry.runId).sort()
    );
    for (const pathsForRun of runPaths) {
      await expect(
        readFile(join(pathsForRun.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
      ).rejects.toHaveProperty('code', 'ENOENT');
    }
  });

  it('reconciles older active manifests when a live-rehydrate claim is bound to a newer run', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-93'
    };
    const oldPaths = resolveRunPaths(providerEnv, 'run-co-93-old-active');
    const newerPaths = resolveRunPaths(providerEnv, 'run-co-93-live-rehydrate');
    await Promise.all([
      mkdir(oldPaths.runDir, { recursive: true }),
      mkdir(newerPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      oldPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-old-active',
        task_id: 'linear-co-93',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-18T12:10:00.000Z',
        updated_at: '2026-04-18T12:11:00.000Z',
        summary: 'old active-looking provider manifest',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      newerPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-live-rehydrate',
        task_id: 'linear-co-93',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-18T12:20:00.000Z',
        updated_at: '2026-04-18T12:21:00.000Z',
        summary: 'newer released live-rehydrate provider manifest',
        commands: []
      }),
      'utf8'
    );
    const baseClaim = createProviderIntakeState(newerPaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:22:00.000Z',
      rehydrated_at: '2026-04-18T12:22:00.000Z',
      latest_provider_key: 'linear:co-93-id',
      latest_reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      claims: [
        {
          ...baseClaim,
          provider_key: 'linear:co-93-id',
          issue_id: 'co-93-id',
          issue_identifier: 'CO-93',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          task_id: 'linear-co-93',
          state: 'released',
          reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
          updated_at: '2026-04-18T12:22:00.000Z',
          run_id: 'run-co-93-live-rehydrate',
          run_manifest_path: newerPaths.manifestPath
        }
      ]
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running.map((entry) => entry.runId)).toEqual(['run-co-93-live-rehydrate']);
    expect(discovery.all.find((entry) => entry.runId === 'run-co-93-live-rehydrate')).toMatchObject({
      rawStatus: 'in_progress',
      statusReason: null
    });
    expect(discovery.all.find((entry) => entry.runId === 'run-co-93-old-active')).toMatchObject({
      rawStatus: 'cancelled',
      statusReason: 'provider_claim_active_newer_run',
      summary: expect.stringContaining('newer run-bound claim run run-co-93-live-rehydrate supersedes')
    });
    const reconciliation = JSON.parse(
      await readFile(join(oldPaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_active_newer_run',
      provider_claim: {
        state: 'released',
        reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
        run_id: 'run-co-93-live-rehydrate'
      }
    });
  });

  it('reconciles absent-claim orphan manifests when newer terminal file truth exists', async () => {
    const { root, paths } = await createHostPaths();
    const orphanEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-93'
    };
    const orphanPaths = resolveRunPaths(orphanEnv, 'run-co-93-orphaned-active');
    const terminalPaths = resolveRunPaths(orphanEnv, 'run-co-93-terminal-success');
    await Promise.all([
      mkdir(orphanPaths.runDir, { recursive: true }),
      mkdir(terminalPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-orphaned-active',
        task_id: 'linear-co-93',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-09T08:36:05.089Z',
        updated_at: '2026-04-09T08:40:00.000Z',
        summary: 'old provider run still active-looking',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      terminalPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-terminal-success',
        task_id: 'linear-co-93',
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-13T02:26:01.632Z',
        updated_at: '2026-04-13T02:30:00.000Z',
        summary: 'newer terminal run',
        commands: []
      }),
      'utf8'
    );
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: null,
      latest_reason: 'provider_issue_removed',
      claims: []
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running).toEqual([]);
    expect(discovery.all.find((entry) => entry.runId === 'run-co-93-orphaned-active')).toMatchObject({
      rawStatus: 'succeeded',
      statusReason: 'provider_claim_absent_newer_terminal_run'
    });
    const reconciliation = JSON.parse(
      await readFile(join(orphanPaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_absent_newer_terminal_run',
      recorded_at: '2026-04-13T02:30:00.000Z',
      provider_claim: null,
      replacement_run: {
        run_id: 'run-co-93-terminal-success',
        status: 'succeeded'
      }
    });
  });

  it('reconciles absent-claim orphan manifests using task-prefixed run id chronology', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-241'
    };
    const orphanRunId = 'linear-co-241-2026-04-09T08-36-05-089Z';
    const terminalRunId = 'linear-co-241-2026-04-13T02-26-01-632Z';
    const orphanPaths = resolveRunPaths(providerEnv, orphanRunId);
    const terminalPaths = resolveRunPaths(providerEnv, terminalRunId);
    await Promise.all([
      mkdir(orphanPaths.runDir, { recursive: true }),
      mkdir(terminalPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: orphanRunId,
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        updated_at: '2026-04-09T08:40:00.000Z',
        summary: 'legacy provider run has no explicit started_at',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      terminalPaths.manifestPath,
      JSON.stringify({
        run_id: terminalRunId,
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        updated_at: '2026-04-13T02:30:00.000Z',
        summary: 'task-prefixed terminal run has no explicit started_at',
        commands: []
      }),
      'utf8'
    );
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: null,
      latest_reason: null,
      claims: []
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running).toEqual([]);
    expect(discovery.all.find((entry) => entry.runId === orphanRunId)).toMatchObject({
      rawStatus: 'succeeded',
      statusReason: 'provider_claim_absent_newer_terminal_run',
      summary: expect.stringContaining(`newer terminal run ${terminalRunId} supersedes`)
    });
    const reconciliation = JSON.parse(
      await readFile(join(orphanPaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_absent_newer_terminal_run',
      replacement_run: {
        run_id: terminalRunId,
        status: 'succeeded',
        manifest_path: terminalPaths.manifestPath
      }
    });
  });

  it('reconciles terminal replacements when stale manifests have no parseable chronology', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-241'
    };
    const orphanRunId = 'legacy-active-without-chronology';
    const terminalRunId = 'linear-co-241-2026-04-13T02-26-01-632Z';
    const orphanPaths = resolveRunPaths(providerEnv, orphanRunId);
    const terminalPaths = resolveRunPaths(providerEnv, terminalRunId);
    await Promise.all([
      mkdir(orphanPaths.runDir, { recursive: true }),
      mkdir(terminalPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: orphanRunId,
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        updated_at: '2026-04-09T08:40:00.000Z',
        summary: 'legacy active-looking manifest has no parseable chronology',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      terminalPaths.manifestPath,
      JSON.stringify({
        run_id: terminalRunId,
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        summary: 'terminal replacement has parseable run chronology',
        commands: []
      }),
      'utf8'
    );
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: null,
      latest_reason: null,
      claims: []
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running).toEqual([]);
    expect(discovery.all.find((entry) => entry.runId === orphanRunId)).toMatchObject({
      rawStatus: 'succeeded',
      statusReason: 'provider_claim_absent_newer_terminal_run',
      summary: expect.stringContaining(`newer terminal run ${terminalRunId} supersedes`)
    });
    const reconciliation = JSON.parse(
      await readFile(join(orphanPaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_absent_newer_terminal_run',
      recorded_at: '2026-04-13T02:26:01.632Z',
      manifest: {
        run_id: orphanRunId,
        status: 'in_progress'
      },
      replacement_run: {
        run_id: terminalRunId,
        status: 'succeeded',
        manifest_path: terminalPaths.manifestPath
      }
    });
  });

  it('reconciles chronology-only terminal replacements when updated_at is missing', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-241'
    };
    const orphanRunId = 'linear-co-241-2026-04-09T08-36-05-089Z';
    const terminalRunId = 'linear-co-241-2026-04-13T02-26-01-632Z';
    const orphanPaths = resolveRunPaths(providerEnv, orphanRunId);
    const terminalPaths = resolveRunPaths(providerEnv, terminalRunId);
    await Promise.all([
      mkdir(orphanPaths.runDir, { recursive: true }),
      mkdir(terminalPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: orphanRunId,
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        updated_at: '2026-04-09T08:40:00.000Z',
        summary: 'legacy provider run has only updated_at',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      terminalPaths.manifestPath,
      JSON.stringify({
        run_id: terminalRunId,
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        summary: 'terminal run relies on run-id chronology',
        commands: []
      }),
      'utf8'
    );
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: null,
      latest_reason: null,
      claims: []
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running).toEqual([]);
    expect(discovery.all.find((entry) => entry.runId === orphanRunId)).toMatchObject({
      rawStatus: 'succeeded',
      statusReason: 'provider_claim_absent_newer_terminal_run',
      summary: expect.stringContaining(`newer terminal run ${terminalRunId} supersedes`)
    });
    const reconciliation = JSON.parse(
      await readFile(join(orphanPaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_absent_newer_terminal_run',
      recorded_at: '2026-04-13T02:26:01.632Z',
      replacement_run: {
        run_id: terminalRunId,
        status: 'succeeded',
        manifest_path: terminalPaths.manifestPath,
        updated_at: null
      }
    });
  });

  it('uses run chronology when stale active manifests are metadata-touched after replacement runs', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-241'
    };
    const orphanRunId = 'linear-co-241-2026-04-09T08-36-05-089Z';
    const terminalRunId = 'linear-co-241-2026-04-13T02-26-01-632Z';
    const orphanPaths = resolveRunPaths(providerEnv, orphanRunId);
    const terminalPaths = resolveRunPaths(providerEnv, terminalRunId);
    await Promise.all([
      mkdir(orphanPaths.runDir, { recursive: true }),
      mkdir(terminalPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: orphanRunId,
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        started_at: '2026-04-09T08:36:05.089Z',
        updated_at: '2026-04-18T12:00:00.000Z',
        summary: 'legacy active-looking manifest was metadata-touched after completion',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      terminalPaths.manifestPath,
      JSON.stringify({
        run_id: terminalRunId,
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        summary: 'terminal replacement relies on run chronology',
        commands: []
      }),
      'utf8'
    );
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: null,
      latest_reason: null,
      claims: []
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running).toEqual([]);
    expect(discovery.all.find((entry) => entry.runId === orphanRunId)).toMatchObject({
      rawStatus: 'succeeded',
      statusReason: 'provider_claim_absent_newer_terminal_run',
      summary: expect.stringContaining(`newer terminal run ${terminalRunId} supersedes`)
    });
    const reconciliation = JSON.parse(
      await readFile(join(orphanPaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_absent_newer_terminal_run',
      recorded_at: '2026-04-13T02:26:01.632Z',
      replacement_run: {
        run_id: terminalRunId,
        status: 'succeeded',
        manifest_path: terminalPaths.manifestPath,
        updated_at: null
      }
    });
  });

  it('selects absent-claim replacement terminal truth by run chronology before refreshed update time', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-93'
    };
    const orphanPaths = resolveRunPaths(providerEnv, 'run-co-93-orphaned-active');
    const olderTerminalPaths = resolveRunPaths(providerEnv, 'run-co-93-terminal-failed');
    const newerTerminalPaths = resolveRunPaths(providerEnv, 'run-co-93-terminal-success');
    await Promise.all([
      mkdir(orphanPaths.runDir, { recursive: true }),
      mkdir(olderTerminalPaths.runDir, { recursive: true }),
      mkdir(newerTerminalPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-orphaned-active',
        task_id: 'linear-co-93',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-09T08:36:05.089Z',
        updated_at: '2026-04-09T08:40:00.000Z',
        summary: 'old provider run still active-looking',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      olderTerminalPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-terminal-failed',
        task_id: 'linear-co-93',
        pipeline_id: 'provider-linear-worker',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-13T02:26:01.632Z',
        updated_at: '2026-04-18T13:00:00.000Z',
        summary: 'older terminal run refreshed later',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      newerTerminalPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-terminal-success',
        task_id: 'linear-co-93',
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-14T02:26:01.632Z',
        updated_at: '2026-04-14T02:30:00.000Z',
        summary: 'chronologically newest terminal run',
        commands: []
      }),
      'utf8'
    );
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T13:01:00.000Z',
      rehydrated_at: '2026-04-18T13:01:00.000Z',
      latest_provider_key: null,
      latest_reason: null,
      claims: []
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running).toEqual([]);
    expect(discovery.all.find((entry) => entry.runId === 'run-co-93-orphaned-active')).toMatchObject({
      rawStatus: 'succeeded',
      statusReason: 'provider_claim_absent_newer_terminal_run',
      summary: expect.stringContaining('newer terminal run run-co-93-terminal-success supersedes')
    });
    const reconciliation = JSON.parse(
      await readFile(join(orphanPaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_absent_newer_terminal_run',
      replacement_run: {
        run_id: 'run-co-93-terminal-success',
        status: 'succeeded',
        manifest_path: newerTerminalPaths.manifestPath
      }
    });
  });

  it('reconciles orphan manifests with newer terminal file truth from another task directory', async () => {
    const { root, paths } = await createHostPaths();
    const oldEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-93-old'
    };
    const terminalEnv = {
      ...oldEnv,
      taskId: 'linear-co-93-new'
    };
    const orphanPaths = resolveRunPaths(oldEnv, 'run-co-93-old-active');
    const terminalPaths = resolveRunPaths(terminalEnv, 'run-co-93-terminal-success');
    await Promise.all([
      mkdir(orphanPaths.runDir, { recursive: true }),
      mkdir(terminalPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-old-active',
        task_id: 'linear-co-93-old',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-09T08:36:05.089Z',
        updated_at: '2026-04-09T08:40:00.000Z',
        summary: 'old provider run still active-looking under previous task id',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      terminalPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-93-terminal-success',
        task_id: 'linear-co-93-new',
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'co-93-id',
        issue_identifier: 'CO-93',
        started_at: '2026-04-13T02:26:01.632Z',
        updated_at: '2026-04-13T02:30:00.000Z',
        summary: 'newer terminal run under remapped task id',
        commands: []
      }),
      'utf8'
    );
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: null,
      latest_reason: 'provider_issue_removed',
      claims: []
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running).toEqual([]);
    expect(discovery.all.find((entry) => entry.runId === 'run-co-93-old-active')).toMatchObject({
      rawStatus: 'succeeded',
      statusReason: 'provider_claim_absent_newer_terminal_run',
      summary: expect.stringContaining('newer terminal run run-co-93-terminal-success supersedes')
    });
    const reconciliation = JSON.parse(
      await readFile(join(orphanPaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_absent_newer_terminal_run',
      recorded_at: '2026-04-13T02:30:00.000Z',
      replacement_run: {
        run_id: 'run-co-93-terminal-success',
        status: 'succeeded',
        manifest_path: terminalPaths.manifestPath
      }
    });
  });

  it('reconciles removed-intake orphan manifests without newer terminal file truth', async () => {
    const { root, paths } = await createHostPaths();
    const orphanEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-183'
    };
    const orphanPaths = resolveRunPaths(orphanEnv, 'run-co-183-orphaned-active');
    const unrelatedEnv = {
      ...orphanEnv,
      taskId: 'linear-co-unrelated'
    };
    const unrelatedPaths = resolveRunPaths(unrelatedEnv, 'run-unrelated-active');
    await Promise.all([
      mkdir(orphanPaths.runDir, { recursive: true }),
      mkdir(unrelatedPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-183-orphaned-active',
        task_id: 'linear-co-183',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-183-id',
        issue_identifier: 'CO-183',
        started_at: '2026-04-10T08:36:05.089Z',
        updated_at: '2026-04-10T08:40:00.000Z',
        summary: 'old provider run still active-looking after removed intake truth',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      unrelatedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-unrelated-active',
        task_id: 'linear-co-unrelated',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-unrelated-id',
        issue_identifier: 'CO-UNRELATED',
        started_at: '2026-04-18T08:36:05.089Z',
        updated_at: '2026-04-18T08:40:00.000Z',
        summary: 'unrelated active run without a claim must not inherit removed truth',
        commands: []
      }),
      'utf8'
    );
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: 'linear:co-183-id',
      latest_reason: 'provider_issue_removed',
      claims: []
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running.map((entry) => entry.runId)).toEqual(['run-unrelated-active']);
    expect(discovery.all.find((entry) => entry.runId === 'run-co-183-orphaned-active')).toMatchObject({
      rawStatus: 'cancelled',
      statusReason: 'provider_issue_removed',
      summary: expect.stringContaining('provider intake removed this issue')
    });
    expect(discovery.all.find((entry) => entry.runId === 'run-unrelated-active')).toMatchObject({
      rawStatus: 'in_progress',
      statusReason: null
    });
    const reconciliation = JSON.parse(
      await readFile(join(orphanPaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_issue_removed',
      reconciled_status: 'cancelled',
      recorded_at: '2026-04-18T12:10:00.000Z',
      provider_claim: null,
      replacement_run: null
    });
  });

  it('matches removed-intake reconciliation by issue identifier when issue id is absent', async () => {
    const { root, paths } = await createHostPaths();
    const orphanEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-183'
    };
    const orphanPaths = resolveRunPaths(orphanEnv, 'run-co-183-orphaned-active');
    const unrelatedEnv = {
      ...orphanEnv,
      taskId: 'linear-co-unrelated'
    };
    const unrelatedPaths = resolveRunPaths(unrelatedEnv, 'run-unrelated-active');
    await Promise.all([
      mkdir(orphanPaths.runDir, { recursive: true }),
      mkdir(unrelatedPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-183-orphaned-active',
        task_id: 'linear-co-183',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_identifier: 'CO-183',
        started_at: '2026-04-10T08:36:05.089Z',
        updated_at: '2026-04-10T08:40:00.000Z',
        summary: 'old provider run still active-looking after removed intake truth',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      unrelatedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-unrelated-active',
        task_id: 'linear-co-unrelated',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_identifier: 'CO-UNRELATED',
        started_at: '2026-04-18T08:36:05.089Z',
        updated_at: '2026-04-18T08:40:00.000Z',
        summary: 'unrelated active run without a claim must not inherit removed truth',
        commands: []
      }),
      'utf8'
    );
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: 'linear:CO-183',
      latest_reason: 'provider_issue_removed',
      claims: []
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running.map((entry) => entry.runId)).toEqual(['run-unrelated-active']);
    expect(discovery.all.find((entry) => entry.runId === 'run-co-183-orphaned-active')).toMatchObject({
      rawStatus: 'cancelled',
      statusReason: 'provider_issue_removed',
      summary: expect.stringContaining('provider intake removed this issue')
    });
    expect(discovery.all.find((entry) => entry.runId === 'run-unrelated-active')).toMatchObject({
      rawStatus: 'in_progress',
      statusReason: null
    });
    const reconciliation = JSON.parse(
      await readFile(join(orphanPaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_issue_removed',
      reconciled_status: 'cancelled',
      recorded_at: '2026-04-18T12:10:00.000Z'
    });
  });

  it('keeps discovery available when reconciliation sidecar writes fail', async () => {
    const { root, paths } = await createHostPaths();
    const orphanEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-191'
    };
    const orphanPaths = resolveRunPaths(orphanEnv, 'run-co-191-orphaned-active');
    const terminalPaths = resolveRunPaths(orphanEnv, 'run-co-191-terminal-success');
    await Promise.all([
      mkdir(orphanPaths.runDir, { recursive: true }),
      mkdir(terminalPaths.runDir, { recursive: true })
    ]);
    await writeFile(
      orphanPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-191-orphaned-active',
        task_id: 'linear-co-191',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-191-id',
        issue_identifier: 'CO-191',
        started_at: '2026-04-12T08:36:05.089Z',
        updated_at: '2026-04-12T08:40:00.000Z',
        summary: 'old provider run still active-looking',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      terminalPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-191-terminal-success',
        task_id: 'linear-co-191',
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'co-191-id',
        issue_identifier: 'CO-191',
        started_at: '2026-04-18T02:26:01.632Z',
        updated_at: '2026-04-18T02:30:00.000Z',
        summary: 'newer terminal run',
        commands: []
      }),
      'utf8'
    );
    await mkdir(join(orphanPaths.runDir, 'provider-linear-worker-reconciliation.json'));
    const baseClaim = createProviderIntakeState(terminalPaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: 'linear:co-191-id',
      latest_reason: 'provider_issue_released:not_active',
      claims: [
        {
          ...baseClaim,
          provider_key: 'linear:co-191-id',
          issue_id: 'co-191-id',
          issue_identifier: 'CO-191',
          issue_state: 'Done',
          issue_state_type: 'completed',
          task_id: 'linear-co-191',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          updated_at: '2026-04-18T12:09:00.000Z',
          run_id: 'run-co-191-terminal-success',
          run_manifest_path: terminalPaths.manifestPath
        }
      ]
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running).toEqual([]);
    expect(discovery.all.find((entry) => entry.runId === 'run-co-191-orphaned-active')).toMatchObject({
      rawStatus: 'succeeded',
      statusReason: 'provider_claim_released',
      summary: expect.stringContaining('newer terminal run run-co-191-terminal-success supersedes')
    });
  });

  it('reconciles older active manifests when the active claim points at a newer run', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-196'
    };
    const stalePaths = resolveRunPaths(providerEnv, 'run-co-196-stale-active');
    const livePaths = resolveRunPaths(providerEnv, 'run-co-196-live');
    await Promise.all([
      mkdir(stalePaths.runDir, { recursive: true }),
      mkdir(livePaths.runDir, { recursive: true })
    ]);
    await writeFile(
      stalePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-196-stale-active',
        task_id: 'linear-co-196',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-196-id',
        issue_identifier: 'CO-196',
        started_at: '2026-04-11T08:36:05.089Z',
        updated_at: '2026-04-11T08:40:00.000Z',
        summary: 'older provider run still active-looking after retry',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      livePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-co-196-live',
        task_id: 'linear-co-196',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-196-id',
        issue_identifier: 'CO-196',
        started_at: '2026-04-18T08:36:05.089Z',
        updated_at: '2026-04-18T08:40:00.000Z',
        summary: 'newer active provider run',
        commands: []
      }),
      'utf8'
    );
    const baseClaim = createProviderIntakeState(livePaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: 'linear:co-196-id',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          ...baseClaim,
          provider_key: 'linear:co-196-id',
          issue_id: 'co-196-id',
          issue_identifier: 'CO-196',
          issue_title: 'Retry active issue',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          task_id: 'linear-co-196',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          updated_at: '2026-04-18T12:09:00.000Z',
          run_id: 'run-co-196-live',
          run_manifest_path: livePaths.manifestPath
        }
      ]
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running.map((entry) => entry.runId)).toEqual(['run-co-196-live']);
    expect(discovery.all.find((entry) => entry.runId === 'run-co-196-stale-active')).toMatchObject({
      rawStatus: 'cancelled',
      statusReason: 'provider_claim_active_newer_run',
      summary: expect.stringContaining('newer active claim run run-co-196-live supersedes')
    });
    expect(discovery.all.find((entry) => entry.runId === 'run-co-196-live')).toMatchObject({
      rawStatus: 'in_progress'
    });
    const reconciliation = JSON.parse(
      await readFile(join(stalePaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_active_newer_run',
      reconciled_status: 'cancelled',
      recorded_at: '2026-04-18T12:09:00.000Z',
      provider_claim: {
        state: 'running',
        run_id: 'run-co-196-live',
        run_manifest_path: livePaths.manifestPath
      },
      replacement_run: null
    });
  });

  it('uses run-bound claim chronology when stale manifests are metadata-touched after the claim', async () => {
    const { root, paths } = await createHostPaths();
    const providerEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-co-241'
    };
    const staleRunId = 'linear-co-241-2026-04-09T08-36-05-089Z';
    const liveRunId = 'linear-co-241-2026-04-13T02-26-01-632Z';
    const stalePaths = resolveRunPaths(providerEnv, staleRunId);
    const livePaths = resolveRunPaths(providerEnv, liveRunId);
    await Promise.all([
      mkdir(stalePaths.runDir, { recursive: true }),
      mkdir(livePaths.runDir, { recursive: true })
    ]);
    await writeFile(
      stalePaths.manifestPath,
      JSON.stringify({
        run_id: staleRunId,
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        started_at: '2026-04-09T08:36:05.089Z',
        updated_at: '2026-04-18T12:00:00.000Z',
        summary: 'older provider run was metadata-touched after retry',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      livePaths.manifestPath,
      JSON.stringify({
        run_id: liveRunId,
        task_id: 'linear-co-241',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'co-241-id',
        issue_identifier: 'CO-241',
        summary: 'newer active provider run relies on run-id chronology',
        commands: []
      }),
      'utf8'
    );
    const baseClaim = createProviderIntakeState(livePaths.manifestPath).claims[0]!;
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-04-18T12:10:00.000Z',
      rehydrated_at: '2026-04-18T12:10:00.000Z',
      latest_provider_key: 'linear:co-241-id',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          ...baseClaim,
          provider_key: 'linear:co-241-id',
          issue_id: 'co-241-id',
          issue_identifier: 'CO-241',
          issue_title: 'Retry active issue',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          task_id: 'linear-co-241',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          updated_at: '2026-04-13T02:30:00.000Z',
          run_id: liveRunId,
          run_manifest_path: livePaths.manifestPath
        }
      ]
    };

    const discovery = await discoverCompatibilityCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(discovery.running.map((entry) => entry.runId)).toEqual([liveRunId]);
    expect(discovery.all.find((entry) => entry.runId === staleRunId)).toMatchObject({
      rawStatus: 'cancelled',
      statusReason: 'provider_claim_active_newer_run',
      summary: expect.stringContaining(`newer active claim run ${liveRunId} supersedes`)
    });
    const reconciliation = JSON.parse(
      await readFile(join(stalePaths.runDir, 'provider-linear-worker-reconciliation.json'), 'utf8')
    ) as Record<string, unknown>;
    expect(reconciliation).toMatchObject({
      reason: 'provider_claim_active_newer_run',
      reconciled_status: 'cancelled',
      recorded_at: '2026-04-13T02:30:00.000Z',
      provider_claim: {
        state: 'running',
        run_id: liveRunId,
        run_manifest_path: livePaths.manifestPath
      },
      replacement_run: null
    });
  });

  it('treats canceled manifests as retry fallback candidates when provider intake state is absent', async () => {
    const { root, paths } = await createHostPaths();
    const retryEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const retryPaths = resolveRunPaths(retryEnv, 'run-child');
    await mkdir(retryPaths.runDir, { recursive: true });
    await writeFile(
      retryPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'canceled',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'retry aborted before handoff',
        commands: []
      }),
      'utf8'
    );

    const discovery = await discoverCompatibilityCollectionContexts(createProjectionContext(paths));

    expect(discovery.running).toEqual([]);
    expect(discovery.retrying).toHaveLength(1);
    expect(discovery.retrying[0]).toMatchObject({
      issueIdentifier: 'CO-2',
      runId: 'run-child',
      rawStatus: 'canceled',
      displayStatus: 'canceled',
      summary: 'retry aborted before handoff'
    });
  });

  it('excludes auxiliary manual live proof harness runs from compatibility discovery', async () => {
    const { root, paths } = await createHostPaths();
    const taskEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const liveRunPaths = resolveRunPaths(taskEnv, 'run-live');
    await mkdir(liveRunPaths.runDir, { recursive: true });
    await writeFile(
      liveRunPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-live',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const helperRunPaths = resolveRunPaths(taskEnv, '2026-03-20T01-16-30-000Z-manual-live-proof');
    await mkdir(helperRunPaths.runDir, { recursive: true });
    await writeFile(
      helperRunPaths.manifestPath,
      JSON.stringify({
        run_id: '2026-03-20T01-16-30-000Z-manual-live-proof',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        status: 'in_progress',
        updated_at: '2026-03-20T01:16:30.000Z',
        summary: 'manual live proof harness'
      }),
      'utf8'
    );

    const discovery = await discoverCompatibilityCollectionContexts(createProjectionContext(paths));

    expect(discovery.running.map((entry) => entry.runId)).toEqual(['run-live']);
    expect(discovery.running.find((entry) => entry.runId?.includes('manual-live-proof'))).toBeUndefined();
  });

  it('discovers authoritative retry contexts even when the queued retry has no recorded attempt yet', async () => {
    const { paths } = await createHostPaths();
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:16:00.000Z',
      rehydrated_at: '2026-03-20T01:16:00.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_resumable_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T01:10:13.574Z',
          task_id: 'linear-lin-issue-1',
          mapping_source: 'provider_id_fallback',
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          accepted_at: '2026-03-20T01:10:13.574Z',
          updated_at: '2026-03-20T01:16:00.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_000_000,
          run_id: null,
          run_manifest_path: null,
          retry_queued: true,
          retry_attempt: null,
          retry_due_at: '2026-03-20T01:17:00.000Z',
          retry_error: null
        }
      ]
    };

    const retrying = await discoverAuthoritativeRetryCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(retrying).toHaveLength(1);
    expect(retrying[0]).toMatchObject({
      issueIdentifier: 'CO-2',
      displayStatus: 'retrying',
      rawStatus: 'resumable',
      summary: 'provider_issue_rehydrated_resumable_run',
      providerRetryState: {
        active: true,
        attempt: null,
        due_at: '2026-03-20T01:17:00.000Z',
        error: null
      }
    });
  });

  it('preserves proof updated_at when projection refresh finds no new session telemetry', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          latest_turn_id: null,
          latest_session_id: null,
          latest_session_id_source: null,
          turn_count: 1,
          last_event: 'token_count',
          last_message: 'stale proof snapshot',
          last_event_at: '2026-03-20T01:15:28.970Z',
          tokens: {
            input_tokens: 41,
            output_tokens: 9,
            total_tokens: 50
          },
          rate_limits: {
            primary: {
              used_percent: 18,
              window_minutes: 300
            },
            secondary: {
              used_percent: 52,
              window_minutes: 10080
            }
          },
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: root,
          end_reason: null,
          updated_at: '2026-03-20T01:15:28.970Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const codexHome = join(root, '.codex');
    await mkdir(codexHome, { recursive: true });

    const originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = codexHome;
    try {
      const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();
      const onDisk = JSON.parse(
        await readFile(join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as ProviderLinearWorkerProof;

      expect(selected?.providerLinearWorkerProof?.updated_at).toBe('2026-03-20T01:15:28.970Z');
      expect(selected?.providerLinearWorkerProof?.rate_limits).toEqual({
        primary: {
          used_percent: 18,
          window_minutes: 300
        },
        secondary: {
          used_percent: 52,
          window_minutes: 10080
        }
      });
      expect(onDisk.updated_at).toBe('2026-03-20T01:15:28.970Z');
      expect(onDisk.rate_limits).toEqual({
        primary: {
          used_percent: 18,
          window_minutes: 300
        },
        secondary: {
          used_percent: 52,
          window_minutes: 10080
        }
      });
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
  });

  it('refreshes selected proof to backfill resolved model provenance from hydration state', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-05-05T04:40:30.000Z',
        summary: 'provider run succeeded',
        commands: []
      }),
      'utf8'
    );
    const resolvedModelProvenance = buildProviderLinearWorkerResolvedModelProvenance({
      runtimeModel: 'gpt-5.5',
      runtimeReasoningEffort: 'xhigh',
      observedAt: '2026-05-05T04:40:01.000Z'
    });
    const proofPath = join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
    await writeFile(
      proofPath,
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-05-05T04:40:00.000Z',
          latest_turn_id: 'turn-1',
          latest_session_id: 'thread-1-turn-1',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 1,
          tokens: {
            input_tokens: 41,
            output_tokens: 9,
            total_tokens: 50
          },
          rate_limits: {
            primary: {
              used_percent: 18,
              window_minutes: 300
            }
          },
          owner_phase: 'ended',
          owner_status: 'succeeded',
          workspace_path: root,
          end_reason: 'issue_inactive',
          updated_at: '2026-05-05T04:40:30.000Z',
          resolved_model_provenance: resolvedModelProvenance
        }),
        null,
        2
      ),
      'utf8'
    );

    const codexHome = join(root, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '05', '05');
    const sessionLogPath = join(sessionDir, 'rollout-2026-05-05T04-40-00-thread-1.jsonl');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      sessionLogPath,
      [
        JSON.stringify({
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: root,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Autonomous intake handoff'
          },
          timestamp: '2026-05-05T04:40:00.000Z'
        }),
        JSON.stringify({
          type: 'turn_context',
          payload: {
            turn_id: 'turn-1',
            model: 'gpt-5.5',
            model_reasoning_effort: 'xhigh'
          },
          timestamp: '2026-05-05T04:40:01.000Z'
        })
      ].join('\n'),
      'utf8'
    );

    const originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = codexHome;
    try {
      await refreshProviderLinearWorkerProofSnapshot(
        childPaths.runDir,
        null,
        () => '2026-05-05T04:40:45.000Z',
        undefined,
        { CODEX_HOME: codexHome }
      );
      const olderPersistedProof = JSON.parse(
        await readFile(proofPath, 'utf8')
      ) as Record<string, unknown>;
      delete olderPersistedProof.resolved_model_provenance;
      await writeFile(proofPath, JSON.stringify(olderPersistedProof), 'utf8');

      const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();
      const onDisk = JSON.parse(await readFile(proofPath, 'utf8')) as ProviderLinearWorkerProof;

      expect(selected?.providerLinearWorkerProof?.resolved_model_provenance).toMatchObject({
        model: 'gpt-5.5',
        model_reasoning_effort: 'xhigh',
        source: 'runtime_reported'
      });
      expect(onDisk.resolved_model_provenance).toMatchObject({
        model: 'gpt-5.5',
        model_reasoning_effort: 'xhigh',
        source: 'runtime_reported'
      });
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
  });

  it('synthesizes the deterministic provider workspace for retry-only claims without a manifest snapshot', async () => {
    const { root, paths } = await createHostPaths();
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:16:00.000Z',
      rehydrated_at: '2026-03-20T01:16:00.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_resumable_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T01:10:13.574Z',
          task_id: 'linear-lin-issue-1',
          mapping_source: 'provider_id_fallback',
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          accepted_at: '2026-03-20T01:10:13.574Z',
          updated_at: '2026-03-20T01:16:00.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_000_000,
          run_id: null,
          run_manifest_path: null,
          retry_queued: true,
          retry_attempt: 2,
          retry_due_at: '2026-03-20T01:17:00.000Z',
          retry_error: 'retryable failure pending rerun'
        }
      ]
    };

    const retrying = await discoverAuthoritativeRetryCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(retrying).toHaveLength(1);
    expect(retrying[0]).toMatchObject({
      issueIdentifier: 'CO-2',
      compatibilityState: 'In Progress',
      workspacePath: join(root, '.workspaces', 'linear-lin-issue-1')
    });
  });

  it('prefers the deterministic provider workspace when an older retry manifest only points at the control workspace', async () => {
    const { root, paths } = await createHostPaths();
    const retryEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const retryPaths = resolveRunPaths(retryEnv, 'run-child');
    await mkdir(retryPaths.runDir, { recursive: true });
    await writeFile(
      retryPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'retryable failure pending rerun',
        commands: []
      }),
      'utf8'
    );

    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:16:00.000Z',
      rehydrated_at: '2026-03-20T01:16:00.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_resumable_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T01:10:13.574Z',
          task_id: 'linear-lin-issue-1',
          mapping_source: 'provider_id_fallback',
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          accepted_at: '2026-03-20T01:10:13.574Z',
          updated_at: '2026-03-20T01:16:00.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_000_000,
          run_id: 'run-child',
          run_manifest_path: retryPaths.manifestPath,
          retry_queued: true,
          retry_attempt: 2,
          retry_due_at: '2026-03-20T01:17:00.000Z',
          retry_error: 'retryable failure pending rerun'
        }
      ]
    };

    const retrying = await discoverAuthoritativeRetryCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(retrying).toHaveLength(1);
    expect(retrying[0]).toMatchObject({
      issueIdentifier: 'CO-2',
      workspacePath: join(root, '.workspaces', 'linear-lin-issue-1')
    });
  });

  it('keeps a task-local selected run on its own manifest when a sibling retry claim retains a prior manifest', async () => {
    const { root } = await createHostPaths((currentRoot) => join(currentRoot, '.runs'));
    const currentEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-current'
    };
    const currentPaths = resolveRunPaths(currentEnv, 'run-current');
    await mkdir(currentPaths.runDir, { recursive: true });
    await writeFile(
      currentPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-current',
        task_id: 'task-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        status: 'in_progress',
        updated_at: '2026-03-20T01:14:00.000Z',
        summary: 'current task remains selected',
        commands: []
      }),
      'utf8'
    );

    const retryEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-retry'
    };
    const retryPaths = resolveRunPaths(retryEnv, 'run-retry');
    await mkdir(retryPaths.runDir, { recursive: true });
    await writeFile(
      retryPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-retry',
        task_id: 'task-retry',
        issue_provider: 'linear',
        issue_id: 'issue-retry',
        issue_identifier: 'ISSUE-RETRY',
        status: 'failed',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'retry sibling kept prior manifest',
        commands: []
      }),
      'utf8'
    );

    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:16:00.000Z',
      rehydrated_at: '2026-03-20T01:16:00.000Z',
      latest_provider_key: 'linear:issue-retry',
      latest_reason: 'provider_issue_rehydrated_resumable_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:issue-retry',
          issue_id: 'issue-retry',
          issue_identifier: 'ISSUE-RETRY',
          issue_title: 'Retry sibling',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T01:16:00.000Z',
          task_id: 'task-retry',
          mapping_source: 'provider_id_fallback',
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          accepted_at: '2026-03-20T01:15:00.000Z',
          updated_at: '2026-03-20T01:16:00.000Z',
          last_delivery_id: 'delivery-retry',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_000_000,
          run_id: 'run-retry',
          run_manifest_path: retryPaths.manifestPath,
          retry_queued: true,
          retry_attempt: 2,
          retry_due_at: '2026-03-20T01:17:00.000Z',
          retry_error: 'retry pending'
        }
      ]
    };

    const selected = await createProjectionReader(
      currentPaths,
      currentPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'ISSUE-CURRENT',
      runId: 'run-current',
      summary: 'current task remains selected'
    });
  });
});
