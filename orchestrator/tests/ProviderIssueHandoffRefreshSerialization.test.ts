import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import * as questionChildResolutionAdapter from '../src/cli/control/questionChildResolutionAdapter.js';
import { runProviderIssueHandoffRefresh } from '../src/cli/control/controlServerPublicLifecycle.js';
import { createProviderIssueHandoffService } from '../src/cli/control/providerIssueHandoff.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import type { ProviderIntakeState } from '../src/cli/control/providerIntakeState.js';
import { PROVIDER_LINEAR_WORKER_PROOF_FILENAME } from '../src/cli/providerLinearWorkerRunner.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';

const cleanupRoots: string[] = [];

afterEach(async () => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createHostPaths() {
  const root = await mkdtemp(join(tmpdir(), 'provider-issue-refresh-serialization-'));
  cleanupRoots.push(root);
  const env = {
    repoRoot: root,
    runsRoot: join(root, '.runs'),
    outRoot: join(root, 'out'),
    taskId: 'local-mcp'
  };
  const paths = Object.assign(resolveRunPaths(env, 'control-host'), { repoRoot: root });
  await mkdir(paths.runDir, { recursive: true });
  return { root, paths };
}

function createProviderIntakeState(): ProviderIntakeState {
  return {
    schema_version: 1,
    updated_at: new Date(0).toISOString(),
    rehydrated_at: null,
    latest_provider_key: null,
    latest_reason: null,
    claims: []
  };
}

function createTrackedIssue(
  overrides: Partial<LiveLinearTrackedIssue> = {}
): LiveLinearTrackedIssue {
  return {
    provider: 'linear',
    id: 'lin-issue-1',
    identifier: 'CO-2',
    title: 'Autonomous intake handoff',
    url: null,
    state: 'In Progress',
    state_type: 'started',
    archived_at: null,
    trashed: false,
    workspace_id: 'workspace-1',
    viewer_id: 'viewer-1',
    assignee_id: 'viewer-1',
    assignee_name: 'Codex',
    team_id: 'team-1',
    team_key: 'CO',
    team_name: 'CO',
    project_id: 'project-1',
    project_name: 'Coordinator',
    updated_at: '2026-03-19T04:40:00.000Z',
    blocked_by: [],
    recent_activity: [],
    ...overrides
  };
}

const co185TaskId = 'linear-9a54c7d8-518f-4452-95aa-c5852008b38d';
const co185IssueUpdatedAt = '2026-04-15T01:18:56.003Z';

async function createCo185ActiveRun(root: string) {
  const childPaths = resolveRunPaths(
    {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: co185TaskId
    },
    'run-active'
  );
  await mkdir(childPaths.runDir, { recursive: true });
  await writeFile(
    childPaths.manifestPath,
    JSON.stringify({
      run_id: 'run-active',
      task_id: co185TaskId,
      pipeline_id: 'provider-linear-worker',
      status: 'in_progress',
      issue_provider: 'linear',
      issue_id: 'lin-issue-185',
      issue_identifier: 'CO-185',
      issue_updated_at: co185IssueUpdatedAt,
      started_at: '2026-04-15T01:09:24.461Z',
      updated_at: '2026-04-15T01:26:45.204Z'
    }),
    'utf8'
  );
  return childPaths;
}

function pushCo185ReleasedPendingClaim(
  state: ProviderIntakeState,
  runManifestPath: string,
  overrides: Partial<ProviderIntakeState['claims'][number]> = {}
) {
  state.claims.push({
    provider: 'linear',
    provider_key: 'linear:lin-issue-185',
    issue_id: 'lin-issue-185',
    issue_identifier: 'CO-185',
    issue_title: 'Provider helper constraints',
    issue_state: 'In Progress',
    issue_state_type: 'started',
    issue_updated_at: co185IssueUpdatedAt,
    task_id: co185TaskId,
    mapping_source: 'provider_id_fallback',
    state: 'released',
    reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
    accepted_at: '2026-04-15T01:09:24.461Z',
    updated_at: '2026-04-15T01:26:48.590Z',
    last_delivery_id: 'delivery-co-185',
    last_event: 'Issue',
    last_action: 'update',
    last_webhook_timestamp: 1_744_685_936_003,
    run_id: 'run-active',
    run_manifest_path: runManifestPath,
    launch_source: null,
    launch_token: null,
    ...overrides
  });
}

describe('runProviderIssueHandoffRefresh', () => {
  it('serializes best-effort rehydrate behind an in-flight refresh loop', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-21T07:00:00.000Z'));

    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-21T07:00:00.000Z',
      task_id: 'task-1303-active',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: '2026-03-21T07:00:00.000Z',
      updated_at: '2026-03-21T07:00:00.000Z',
      last_delivery_id: 'delivery-active',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_534_400_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token'
    });

    let refreshLoopBlocked = false;
    let releaseRefreshLoop: (() => void) | null = null;
    const persistPhases: string[] = [];

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => {
        persistPhases.push(refreshLoopBlocked ? 'during_refresh_loop' : 'outside_refresh_loop');
      }),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => {
        refreshLoopBlocked = true;
        return await new Promise<{ kind: 'skip'; reason: string }>((resolve) => {
          releaseRefreshLoop = () => {
            refreshLoopBlocked = false;
            resolve({
              kind: 'skip',
              reason: 'linear_refresh_unavailable'
            });
          };
        });
      }
    });

    const refreshPromise = service.refresh();
    await vi.waitFor(() => {
      expect(refreshLoopBlocked).toBe(true);
      expect(persistPhases).toEqual(['outside_refresh_loop']);
    });

    await vi.advanceTimersByTimeAsync(1_000);
    expect(persistPhases).toEqual(['outside_refresh_loop']);

    if (!releaseRefreshLoop) {
      throw new Error('Expected refresh loop gate to be captured.');
    }
    releaseRefreshLoop();
    await refreshPromise;
    await vi.waitFor(() => {
      expect(persistPhases).toEqual([
        'outside_refresh_loop',
        'outside_refresh_loop'
      ]);
    });
  });

  it('does not leak a poll refetch callback into later queued retry dispatch after overlapping cycles', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-restarted',
        manifestPath: '/tmp/provider-run/restarted-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:21:00.000Z'
      })
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      resolveTrackedIssue
    });

    await Promise.all([
      service.poll?.({
        trackedIssues: [],
        refetchTrackedIssues: async () => ({
          kind: 'skip',
          reason: 'stale-first-cycle-refetch'
        })
      }),
      service.poll?.({
        trackedIssues: []
      })
    ]);

    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:21:05.000Z',
      updated_at: '2026-03-19T04:21:10.000Z',
      last_delivery_id: null,
      last_event: null,
      last_action: null,
      last_webhook_timestamp: null,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:01.000Z',
      retry_error: null
    });

    await service.rehydrate();
    await vi.advanceTimersByTimeAsync(1_001);

    await vi.waitFor(() => {
      expect(launcher.start).toHaveBeenCalledTimes(1);
    });

    expect(resolveTrackedIssue).toHaveBeenCalledTimes(1);
    expect(resolveTrackedIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'lin-issue-1'
    });
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_retry_start_launched',
      retry_queued: false,
      retry_attempt: 1,
      retry_error: null
    });
  });

  it('dedupes released child cancellation across queued refreshes without blocking refresh completion', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-active');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'task-1303-active',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-active',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_mutable',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-active',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const cancelCalls: Array<Record<string, unknown>> = [];
    const cancelResolvers: Array<() => void> = [];
    let pendingCancels = 0;
    const releaseNextCancel = () => {
      const resolve = cancelResolvers.shift();
      if (!resolve) {
        throw new Error('No pending release cancel to resolve.');
      }
      resolve();
    };
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ payload }) => {
        cancelCalls.push(payload);
        pendingCancels += 1;
        await new Promise<void>((resolve) => {
          cancelResolvers.push(() => {
            pendingCancels -= 1;
            resolve();
          });
        });
      }
    );

    let resolveTrackedIssueCallCount = 0;
    let resolveFirstRefresh:
      | ((value: { kind: 'skip'; reason: string }) => void)
      | null = null;

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => {
        resolveTrackedIssueCallCount += 1;
        if (resolveTrackedIssueCallCount === 1) {
          return await new Promise<{ kind: 'skip'; reason: string }>((resolve) => {
            resolveFirstRefresh = resolve;
          });
        }
        return {
          kind: 'skip',
          reason: 'linear_refresh_unavailable'
        };
      }
    });

    let firstSettled = false;
    let secondSettled = false;
    const firstRefresh = runProviderIssueHandoffRefresh(service).finally(() => {
      firstSettled = true;
    });
    const secondRefresh = runProviderIssueHandoffRefresh(service, { queueIfBusy: true }).finally(() => {
      secondSettled = true;
    });

    await vi.waitFor(() => {
      expect(resolveTrackedIssueCallCount).toBe(1);
    });
    expect(firstSettled).toBe(false);
    expect(secondSettled).toBe(false);
    expect(cancelCalls).toHaveLength(0);

    if (!resolveFirstRefresh) {
      throw new Error('Expected first refresh resolution gate to be captured.');
    }
    resolveFirstRefresh({
      kind: 'skip',
      reason: 'linear_refresh_unavailable'
    });

    await vi.waitFor(() => {
      expect(cancelCalls).toEqual([
        expect.objectContaining({
          action: 'cancel',
          reason: 'provider_issue_released:not_mutable'
        })
      ]);
    });
    expect(pendingCancels).toBe(1);

    await vi.waitFor(() => {
      expect(resolveTrackedIssueCallCount).toBe(2);
      expect(firstSettled).toBe(true);
      expect(secondSettled).toBe(true);
    });
    await Promise.all([firstRefresh, secondRefresh]);
    expect(cancelCalls).toHaveLength(1);
    expect(pendingCancels).toBe(1);

    releaseNextCancel();
    await vi.waitFor(() => {
      expect(pendingCancels).toBe(0);
    });

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_mutable',
      task_id: 'task-1303-active',
      run_id: null,
      run_manifest_path: null
    });
  });

  it('retries once after a queued refresh observes the in-flight skip cancel fail', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-active');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'task-1303-active',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-active',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_mutable',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-active',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const cancelCalls: Array<Record<string, unknown>> = [];
    const cancelSettlers: Array<(outcome: 'resolve' | 'reject') => void> = [];
    let pendingCancels = 0;
    let maxPendingCancels = 0;
    const settleNextCancel = (outcome: 'resolve' | 'reject') => {
      const settle = cancelSettlers.shift();
      if (!settle) {
        throw new Error('No pending release cancel to settle.');
      }
      settle(outcome);
    };
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ payload }) => {
        cancelCalls.push(payload);
        pendingCancels += 1;
        maxPendingCancels = Math.max(maxPendingCancels, pendingCancels);
        await new Promise<void>((resolve, reject) => {
          cancelSettlers.push((outcome) => {
            pendingCancels -= 1;
            if (outcome === 'reject') {
              reject(new Error('cancel failed'));
              return;
            }
            resolve();
          });
        });
      }
    );

    let resolveTrackedIssueCallCount = 0;
    let resolveFirstRefresh:
      | ((value: { kind: 'skip'; reason: string }) => void)
      | null = null;

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => {
        resolveTrackedIssueCallCount += 1;
        if (resolveTrackedIssueCallCount === 1) {
          return await new Promise<{ kind: 'skip'; reason: string }>((resolve) => {
            resolveFirstRefresh = resolve;
          });
        }
        return {
          kind: 'skip',
          reason: 'linear_refresh_unavailable'
        };
      }
    });

    let firstSettled = false;
    let secondSettled = false;
    const firstRefresh = runProviderIssueHandoffRefresh(service).finally(() => {
      firstSettled = true;
    });
    const secondRefresh = runProviderIssueHandoffRefresh(service, { queueIfBusy: true }).finally(() => {
      secondSettled = true;
    });

    await vi.waitFor(() => {
      expect(resolveTrackedIssueCallCount).toBe(1);
    });
    if (!resolveFirstRefresh) {
      throw new Error('Expected first refresh resolution gate to be captured.');
    }
    resolveFirstRefresh({
      kind: 'skip',
      reason: 'linear_refresh_unavailable'
    });

    await vi.waitFor(() => {
      expect(cancelCalls).toHaveLength(1);
      expect(resolveTrackedIssueCallCount).toBe(2);
      expect(firstSettled).toBe(true);
      expect(secondSettled).toBe(true);
    });
    await Promise.all([firstRefresh, secondRefresh]);
    expect(maxPendingCancels).toBe(1);
    expect(pendingCancels).toBe(1);

    settleNextCancel('reject');

    await vi.waitFor(() => {
      expect(cancelCalls).toEqual([
        expect.objectContaining({
          action: 'cancel',
          reason: 'provider_issue_released:not_mutable'
        }),
        expect.objectContaining({
          action: 'cancel',
          reason: 'provider_issue_released:not_mutable'
        })
      ]);
    });
    expect(maxPendingCancels).toBe(1);
    expect(pendingCancels).toBe(1);

    settleNextCancel('resolve');
    await vi.waitFor(() => {
      expect(pendingCancels).toBe(0);
    });

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_mutable',
      task_id: 'task-1303-active',
      run_id: null,
      run_manifest_path: null
    });
  });

  it('collapses multiple waiting skipped refreshes into one follow-up retry after failure', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-active');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'task-1303-active',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-active',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_mutable',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-active',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const cancelCalls: Array<Record<string, unknown>> = [];
    const cancelSettlers: Array<(outcome: 'resolve' | 'reject') => void> = [];
    let pendingCancels = 0;
    let maxPendingCancels = 0;
    const settleNextCancel = (outcome: 'resolve' | 'reject') => {
      const settle = cancelSettlers.shift();
      if (!settle) {
        throw new Error('No pending release cancel to settle.');
      }
      settle(outcome);
    };
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ payload }) => {
        cancelCalls.push(payload);
        pendingCancels += 1;
        maxPendingCancels = Math.max(maxPendingCancels, pendingCancels);
        await new Promise<void>((resolve, reject) => {
          cancelSettlers.push((outcome) => {
            pendingCancels -= 1;
            if (outcome === 'reject') {
              reject(new Error('cancel failed'));
              return;
            }
            resolve();
          });
        });
      }
    );

    let resolveTrackedIssueCallCount = 0;
    let resolveFirstRefresh:
      | ((value: { kind: 'skip'; reason: string }) => void)
      | null = null;

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => {
        resolveTrackedIssueCallCount += 1;
        if (resolveTrackedIssueCallCount === 1) {
          return await new Promise<{ kind: 'skip'; reason: string }>((resolve) => {
            resolveFirstRefresh = resolve;
          });
        }
        return {
          kind: 'skip',
          reason: 'linear_refresh_unavailable'
        };
      }
    });

    const firstRefresh = runProviderIssueHandoffRefresh(service);
    const secondRefresh = runProviderIssueHandoffRefresh(service, { queueIfBusy: true });

    await vi.waitFor(() => {
      expect(resolveTrackedIssueCallCount).toBe(1);
    });
    if (!resolveFirstRefresh) {
      throw new Error('Expected first refresh resolution gate to be captured.');
    }
    resolveFirstRefresh({
      kind: 'skip',
      reason: 'linear_refresh_unavailable'
    });

    await Promise.all([firstRefresh, secondRefresh]);
    await vi.waitFor(() => {
      expect(cancelCalls).toHaveLength(1);
      expect(resolveTrackedIssueCallCount).toBe(2);
      expect(pendingCancels).toBe(1);
    });

    let thirdSettled = false;
    const thirdRefresh = runProviderIssueHandoffRefresh(service).finally(() => {
      thirdSettled = true;
    });
    await thirdRefresh;
    await vi.waitFor(() => {
      expect(resolveTrackedIssueCallCount).toBe(3);
      expect(thirdSettled).toBe(true);
      expect(cancelCalls).toHaveLength(1);
      expect(pendingCancels).toBe(1);
    });

    settleNextCancel('reject');
    await vi.waitFor(() => {
      expect(cancelCalls).toHaveLength(2);
      expect(pendingCancels).toBe(1);
    });

    settleNextCancel('reject');
    await vi.waitFor(() => {
      expect(cancelCalls).toHaveLength(2);
      expect(pendingCancels).toBe(0);
    });

    expect(maxPendingCancels).toBe(1);
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_mutable',
      task_id: 'task-1303-active',
      run_id: null,
      run_manifest_path: null
    });
  });

  it('caps skip-path cancel retries at one follow-up even when new skips arrive during the retry attempt', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-active');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'task-1303-active',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-active',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_mutable',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-active',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const cancelCalls: Array<Record<string, unknown>> = [];
    const cancelSettlers: Array<(outcome: 'resolve' | 'reject') => void> = [];
    let pendingCancels = 0;
    const settleNextCancel = (outcome: 'resolve' | 'reject') => {
      const settle = cancelSettlers.shift();
      if (!settle) {
        throw new Error('No pending release cancel to settle.');
      }
      settle(outcome);
    };
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ payload }) => {
        cancelCalls.push(payload);
        pendingCancels += 1;
        await new Promise<void>((resolve, reject) => {
          cancelSettlers.push((outcome) => {
            pendingCancels -= 1;
            if (outcome === 'reject') {
              reject(new Error('cancel failed'));
              return;
            }
            resolve();
          });
        });
      }
    );

    let resolveTrackedIssueCallCount = 0;
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => {
        resolveTrackedIssueCallCount += 1;
        return {
          kind: 'skip',
          reason: 'linear_refresh_unavailable'
        };
      }
    });

    await service.refresh();
    await vi.waitFor(() => {
      expect(cancelCalls).toHaveLength(1);
      expect(pendingCancels).toBe(1);
    });

    await service.refresh();
    expect(resolveTrackedIssueCallCount).toBe(2);
    settleNextCancel('reject');
    await vi.waitFor(() => {
      expect(cancelCalls).toHaveLength(2);
      expect(pendingCancels).toBe(1);
    });

    await service.refresh();
    expect(resolveTrackedIssueCallCount).toBe(3);

    settleNextCancel('reject');
    await vi.waitFor(() => {
      expect(cancelCalls).toHaveLength(2);
      expect(pendingCancels).toBe(0);
    });

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_mutable',
      run_id: null,
      run_manifest_path: null
    });
  });

  it('rehydrates a released active child on a later ready refresh after a transient release failure', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-active');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'task-1303-active',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-active',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-active',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const cancelCalls: Array<Record<string, unknown>> = [];
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ payload }) => {
        cancelCalls.push(payload);
        throw new Error('cancel failed');
      }
    );

    let resolveTrackedIssueCallCount = 0;
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      resolveTrackedIssue: async () => {
        resolveTrackedIssueCallCount += 1;
        if (resolveTrackedIssueCallCount === 1) {
          return {
            kind: 'release',
            reason: 'not_active'
          };
        }
        return {
          kind: 'ready',
          trackedIssue: createTrackedIssue()
        };
      }
    });

    await service.refresh();
    expect(cancelCalls).toHaveLength(1);
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });

    await service.refresh();

    expect(resolveTrackedIssueCallCount).toBe(2);
    expect(cancelCalls).toHaveLength(1);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
  });

  it('rehydrates released pending-reopen started claims when the retained run is still active', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      issue_title: 'Stale provider helper constraints',
      issue_updated_at: '2026-04-15T01:18:00.000Z'
    });

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue: vi.fn(async () => ({
        kind: 'ready' as const,
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          title: 'Provider helper constraints',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:18:56.003Z'
        })
      }))
    });

    await service.rehydrate();

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_title: 'Provider helper constraints',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:18:56.003Z',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.latest_reason).toBe('provider_issue_rehydrated_active_run');
  });

  it('preserves control-host launch provenance during released active-run rehydration when manifest provenance is complete', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const initialManifest = JSON.parse(
      await readFile(childPaths.manifestPath, 'utf8')
    ) as Record<string, unknown>;
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify(
        {
          ...initialManifest,
          provider_launch_source: 'control-host',
          provider_control_host_task_id: 'local-mcp',
          provider_control_host_run_id: 'control-host'
        },
        null,
        2
      ),
      'utf8'
    );
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      launch_source: 'control-host',
      launch_token: 'launch-token-co-289'
    });

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue: vi.fn(async () => ({
        kind: 'ready' as const,
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          title: 'Provider helper constraints',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:18:56.003Z'
        })
      }))
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'launch-token-co-289'
    });
    const manifest = JSON.parse(await readFile(childPaths.manifestPath, 'utf8')) as Record<
      string,
      unknown
    >;
    expect(manifest).toMatchObject({
      provider_launch_source: 'control-host',
      provider_control_host_task_id: 'local-mcp',
      provider_control_host_run_id: 'control-host'
    });
  });

  it('preserves control-host launch provenance from the discovery snapshot when the manifest changes before provenance resolution', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const initialManifest = JSON.parse(
      await readFile(childPaths.manifestPath, 'utf8')
    ) as Record<string, unknown>;
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify(
        {
          ...initialManifest,
          provider_launch_source: 'control-host',
          provider_control_host_task_id: 'local-mcp',
          provider_control_host_run_id: 'control-host'
        },
        null,
        2
      ),
      'utf8'
    );
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      launch_source: 'control-host',
      launch_token: 'launch-token-snapshot'
    });
    const resolveTrackedIssue = vi.fn(async () => {
      await writeFile(
        childPaths.manifestPath,
        JSON.stringify(
          {
            ...initialManifest,
            provider_launch_source: null,
            provider_control_host_task_id: null,
            provider_control_host_run_id: null
          },
          null,
          2
        ),
        'utf8'
      );
      return {
        kind: 'ready' as const,
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          title: 'Provider helper constraints',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:18:56.003Z'
        })
      };
    });

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue
    });

    await service.rehydrate();

    expect(resolveTrackedIssue).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'launch-token-snapshot'
    });
    const manifest = JSON.parse(await readFile(childPaths.manifestPath, 'utf8')) as Record<
      string,
      unknown
    >;
    expect(manifest).toMatchObject({
      provider_launch_source: null,
      provider_control_host_task_id: null,
      provider_control_host_run_id: null
    });
  });

  it('preserves control-host launch provenance when retained claim identity only has the active manifest path and camelCase manifest aliases', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const initialManifest = JSON.parse(
      await readFile(childPaths.manifestPath, 'utf8')
    ) as Record<string, unknown>;
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify(
        {
          ...initialManifest,
          providerLaunchSource: 'control-host',
          providerControlHostTaskId: 'local-mcp',
          providerControlHostRunId: 'control-host'
        },
        null,
        2
      ),
      'utf8'
    );
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      run_id: null,
      launch_source: 'control-host',
      launch_token: 'launch-token-manifest-only'
    });

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue: vi.fn(async () => ({
        kind: 'ready' as const,
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          title: 'Provider helper constraints',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:18:56.003Z'
        })
      }))
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'launch-token-manifest-only'
    });
  });

  it('clears stale claim launch provenance when the claim no longer identifies the active run', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const manifest = JSON.parse(await readFile(childPaths.manifestPath, 'utf8')) as Record<
      string,
      unknown
    >;
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify(
        {
          ...manifest,
          provider_launch_source: 'control-host',
          provider_control_host_task_id: 'local-mcp',
          provider_control_host_run_id: 'control-host'
        },
        null,
        2
      ),
      'utf8'
    );
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(
      state,
      join(root, '.runs', co185TaskId, 'cli', 'old-run', 'manifest.json'),
      {
        run_id: 'old-run',
        launch_source: 'control-host',
        launch_token: 'stale-launch-token'
      }
    );

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue: vi.fn(async () => ({
        kind: 'ready' as const,
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:18:56.003Z'
        })
      }))
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });
  });

  it('keeps released active-run rehydration fail-closed when claim launch provenance is absent despite complete manifest provenance', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const seededManifest = JSON.parse(
      await readFile(childPaths.manifestPath, 'utf8')
    ) as Record<string, unknown>;
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify(
        {
          ...seededManifest,
          provider_launch_source: 'control-host',
          provider_control_host_task_id: 'local-mcp',
          provider_control_host_run_id: 'control-host'
        },
        null,
        2
      ),
      'utf8'
    );
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath);

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue: vi.fn(async () => ({
        kind: 'ready' as const,
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:18:56.003Z'
        })
      }))
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      launch_source: null,
      launch_token: null
    });
    const manifest = JSON.parse(await readFile(childPaths.manifestPath, 'utf8')) as Record<string, unknown>;
    expect(manifest).toMatchObject({
      provider_launch_source: 'control-host',
      provider_control_host_task_id: 'local-mcp',
      provider_control_host_run_id: 'control-host'
    });
  });

  it('clears stale claim launch provenance when active-run manifest provenance is mismatched', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const manifest = JSON.parse(await readFile(childPaths.manifestPath, 'utf8')) as Record<string, unknown>;
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify(
        {
          ...manifest,
          provider_launch_source: 'control-host',
          provider_control_host_task_id: 'other-control-host-task',
          provider_control_host_run_id: 'control-host'
        },
        null,
        2
      ),
      'utf8'
    );
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      launch_source: 'control-host',
      launch_token: 'stale-launch-token'
    });

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue: vi.fn(async () => ({
        kind: 'ready' as const,
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:18:56.003Z'
        })
      }))
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      launch_source: null,
      launch_token: null
    });
    const persistedManifest = JSON.parse(await readFile(childPaths.manifestPath, 'utf8')) as Record<string, unknown>;
    expect(persistedManifest).toMatchObject({
      provider_launch_source: 'control-host',
      provider_control_host_task_id: 'other-control-host-task',
      provider_control_host_run_id: 'control-host'
    });
  });

  it('does not rehydrate a released active-run claim after fresh non-runnable issue truth', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      issue_title: 'Stale provider helper constraints',
      issue_updated_at: '2026-04-15T01:18:00.000Z'
    });

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-185',
        identifier: 'CO-185',
        title: 'Provider helper constraints',
        state: 'Done',
        state_type: 'completed',
        updated_at: '2026-04-15T01:30:00.000Z'
      })
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue
    });

    await service.rehydrate();

    expect(resolveTrackedIssue).toHaveBeenCalledTimes(1);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_title: 'Provider helper constraints',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-15T01:30:00.000Z',
      run_id: null,
      run_manifest_path: null
    });
    expect(state.latest_reason).toBe('provider_issue_released:not_active');
  });

  it('reconciles a terminal released pending-reopen merging claim without canceling unrelated live workers', async () => {
    const { root, paths } = await createHostPaths();
    const staleEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-72286a49-e68b-435a-be72-74d5c28feb09'
    };
    const stalePaths = resolveRunPaths(staleEnv, 'run-dead-merging');
    await mkdir(stalePaths.runDir, { recursive: true });
    await writeFile(
      stalePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-dead-merging',
        task_id: staleEnv.taskId,
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-194',
        issue_identifier: 'CO-194',
        issue_updated_at: '2026-04-15T16:30:00.000Z',
        started_at: '2026-04-15T16:30:00.000Z',
        updated_at: '2026-04-15T16:32:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(stalePaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-194',
        issue_identifier: 'CO-194',
        pid: '424242',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        attempt_started_at: '2026-04-15T16:30:00.000Z',
        updated_at: '2026-04-15T16:32:00.000Z'
      }),
      'utf8'
    );

    const liveEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-live-worker'
    };
    const livePaths = resolveRunPaths(liveEnv, 'run-live-worker');
    await mkdir(livePaths.runDir, { recursive: true });
    await writeFile(
      livePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-live-worker',
        task_id: liveEnv.taskId,
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-live',
        issue_identifier: 'CO-195',
        issue_updated_at: '2026-04-15T16:31:00.000Z',
        started_at: '2026-04-15T16:31:00.000Z',
        updated_at: '2026-04-15T16:34:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(livePaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-live',
        issue_identifier: 'CO-195',
        pid: '31337',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        attempt_started_at: '2026-04-15T16:31:00.000Z',
        updated_at: '2026-04-15T16:34:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-194',
      issue_id: 'lin-issue-194',
      issue_identifier: 'CO-194',
      issue_title: 'Terminal stale merging claim',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T16:30:00.000Z',
      task_id: staleEnv.taskId,
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      accepted_at: '2026-04-15T16:30:05.000Z',
      updated_at: '2026-04-15T16:32:05.000Z',
      last_delivery_id: 'delivery-co-194-merging',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_736_000_000,
      run_id: 'run-dead-merging',
      run_manifest_path: stalePaths.manifestPath,
      launch_source: null,
      launch_token: null
    });
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-live',
      issue_id: 'lin-issue-live',
      issue_identifier: 'CO-195',
      issue_title: 'Unrelated live worker',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T16:31:00.000Z',
      task_id: liveEnv.taskId,
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-04-15T16:31:05.000Z',
      updated_at: '2026-04-15T16:34:05.000Z',
      last_delivery_id: 'delivery-live-worker',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_736_060_000,
      run_id: 'run-live-worker',
      run_manifest_path: livePaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const cancelRequests: Array<{ manifestPath: string; payload: Record<string, unknown> }> = [];
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ manifestPath, payload }) => {
        cancelRequests.push({ manifestPath, payload });
      }
    );
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async ({ issueId }: { issueId: string }) => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue(
        issueId === 'lin-issue-194'
          ? {
              id: 'lin-issue-194',
              identifier: 'CO-194',
              title: 'Terminal stale merging claim',
              state: 'Done',
              state_type: 'completed',
              updated_at: '2026-04-15T16:38:07.274Z'
            }
          : {
              id: 'lin-issue-live',
              identifier: 'CO-195',
              title: 'Unrelated live worker',
              state: 'In Progress',
              state_type: 'started',
              updated_at: '2026-04-15T16:34:00.000Z'
            }
      )
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue,
      isProcessAlive: (pid) => pid === 31337
    });

    await service.refresh();

    expect(resolveTrackedIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'lin-issue-194'
    });
    expect(cancelRequests).toEqual([]);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-15T16:38:07.274Z',
      run_id: null,
      run_manifest_path: null
    });
    expect(state.claims[1]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      run_id: 'run-live-worker',
      run_manifest_path: livePaths.manifestPath
    });
    expect(state.claims.filter((claim) => claim.state === 'running')).toHaveLength(1);
  });

  it('does not retry release cancellation for a terminal manifest with stale in-progress proof', async () => {
    const { root, paths } = await createHostPaths();
    const failedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-terminal-stale-proof'
    };
    const failedPaths = resolveRunPaths(failedEnv, 'run-failed-terminal');
    await mkdir(failedPaths.runDir, { recursive: true });
    await writeFile(
      failedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-failed-terminal',
        task_id: 'linear-terminal-stale-proof',
        pipeline_id: 'provider-linear-worker',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-terminal',
        issue_identifier: 'CO-TERMINAL',
        issue_updated_at: '2026-04-15T16:38:07.274Z',
        started_at: '2026-04-15T16:00:00.000Z',
        updated_at: '2026-04-15T16:05:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(failedPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-terminal',
        issue_identifier: 'CO-TERMINAL',
        attempt_started_at: '2026-04-15T16:00:00.000Z',
        pid: 424242,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        updated_at: '2026-04-15T16:04:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-terminal',
      issue_id: 'lin-issue-terminal',
      issue_identifier: 'CO-TERMINAL',
      issue_title: 'Terminal manifest with stale proof',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-15T16:38:07.274Z',
      task_id: 'linear-terminal-stale-proof',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-04-15T16:00:01.000Z',
      updated_at: '2026-04-15T16:38:07.274Z',
      last_delivery_id: 'delivery-terminal',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_754_287_274,
      run_id: 'run-failed-terminal',
      run_manifest_path: failedPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const cancelRequests: Array<{ manifestPath: string; payload: Record<string, unknown> }> = [];
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ manifestPath, payload }) => {
        cancelRequests.push({ manifestPath, payload });
      }
    );
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue: vi.fn(async () => ({
        kind: 'ready' as const,
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-terminal',
          identifier: 'CO-TERMINAL',
          title: 'Terminal manifest with stale proof',
          state: 'Done',
          state_type: 'completed',
          updated_at: '2026-04-15T16:38:07.274Z'
        })
      })),
      isProcessAlive: () => false
    });

    await service.refresh();

    expect(cancelRequests).toEqual([]);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: 'run-failed-terminal',
      run_manifest_path: failedPaths.manifestPath
    });
  });

  it('still cancels null-status released runs when proof lacks fresh dead-local-pid evidence', async () => {
    const { root, paths } = await createHostPaths();
    const staleEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-remote-stale-proof'
    };
    const stalePaths = resolveRunPaths(staleEnv, 'run-remote-stale-proof');
    await mkdir(stalePaths.runDir, { recursive: true });
    await writeFile(
      stalePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-remote-stale-proof',
        task_id: 'linear-remote-stale-proof',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-remote-stale',
        issue_identifier: 'CO-REMOTE',
        issue_updated_at: '2026-04-15T16:38:07.274Z',
        started_at: '2026-04-15T16:10:00.000Z',
        updated_at: '2026-04-15T16:15:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(stalePaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-remote-stale',
        issue_identifier: 'CO-REMOTE',
        attempt_started_at: '2026-04-15T16:00:00.000Z',
        pid: 424242,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        updated_at: '2026-04-15T16:04:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-remote-stale',
      issue_id: 'lin-issue-remote-stale',
      issue_identifier: 'CO-REMOTE',
      issue_title: 'Remote stale proof',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-15T16:38:07.274Z',
      task_id: 'linear-remote-stale-proof',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-04-15T16:00:01.000Z',
      updated_at: '2026-04-15T16:38:07.274Z',
      last_delivery_id: 'delivery-remote-stale',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_754_287_274,
      run_id: 'run-remote-stale-proof',
      run_manifest_path: stalePaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const cancelRequests: Array<{ manifestPath: string; payload: Record<string, unknown> }> = [];
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ manifestPath, payload }) => {
        cancelRequests.push({ manifestPath, payload });
      }
    );
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue: vi.fn(async () => ({
        kind: 'skip' as const,
        reason: 'linear_refresh_unavailable'
      })),
      isProcessAlive: () => false
    });

    await service.refresh();

    await vi.waitFor(() => {
      expect(cancelRequests).toEqual([
        {
          manifestPath: stalePaths.manifestPath,
          payload: expect.objectContaining({
            action: 'cancel',
            reason: 'provider_issue_released:not_active'
          })
        }
      ]);
    });
  });

  it('persists fresh ready metadata before released active-run cancel fallthroughs', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      issue_title: 'Stale provider helper constraints',
      issue_updated_at: '2026-04-15T01:18:00.000Z'
    });

    const cancelCalls: Array<Record<string, unknown>> = [];
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ payload }) => {
        cancelCalls.push(payload);
      }
    );
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue: vi.fn(async () => ({
        kind: 'ready' as const,
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          title: 'Provider helper constraints',
          state: 'Ready',
          state_type: 'unstarted',
          updated_at: '2026-04-15T01:30:00.000Z'
        })
      }))
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      issue_title: 'Provider helper constraints',
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:30:00.000Z'
    });
    expect(cancelCalls).toHaveLength(0);

    state.claims[0].state = 'released';
    state.claims[0].reason = 'provider_issue_released_pending_reopen:provider_issue_released:not_active';
    state.claims[0].issue_state = 'In Progress';
    state.claims[0].issue_state_type = 'started';
    state.claims[0].issue_updated_at = '2026-04-15T01:18:00.000Z';
    await service.refresh();

    expect(cancelCalls).toEqual([
      expect.objectContaining({
        action: 'cancel',
        reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active'
      })
    ]);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:30:00.000Z'
    });
  });

  it('keeps release-cancel retries for pending-reopen active runs with cached non-started state', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:30:00.000Z'
    });

    const cancelCalls: Array<Record<string, unknown>> = [];
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ payload }) => {
        cancelCalls.push(payload);
      }
    );
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue: vi.fn(async () => ({
        kind: 'skip' as const,
        reason: 'linear_refresh_unavailable'
      }))
    });

    await service.refresh();

    expect(cancelCalls).toEqual([
      expect.objectContaining({
        action: 'cancel',
        reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active'
      })
    ]);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:30:00.000Z'
    });
  });

  it('refreshes stale released pending-reopen no-run claims from live started truth', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, '', {
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:18:00.000Z',
      run_id: null,
      run_manifest_path: null
    });

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-co-185-live-started-refresh',
        manifestPath: '/tmp/provider-run/co-185-live-started-refresh-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-185',
        identifier: 'CO-185',
        title: 'Provider helper constraints',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-04-15T01:18:56.003Z'
      })
    }));
    const refetchTrackedIssues = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssues: []
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    await service.poll?.({
      trackedIssues: [],
      refetchTrackedIssues,
      deferFreshDiscovery: true
    });

    expect(resolveTrackedIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'lin-issue-185'
    });
    expect(refetchTrackedIssues).not.toHaveBeenCalled();
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-185',
      pipelineId: 'provider-linear-worker',
      provider: 'linear',
      issueId: 'lin-issue-185',
      issueIdentifier: 'CO-185',
      issueUpdatedAt: '2026-04-15T01:18:56.003Z',
      launchToken: expect.any(String)
    }));
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_refresh_start_launched',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:18:56.003Z',
      task_id: 'linear-lin-issue-185',
      run_id: 'run-co-185-live-started-refresh',
      run_manifest_path: '/tmp/provider-run/co-185-live-started-refresh-manifest.json'
    });
  });

  it('updates live-started no-run pending-reopen metadata when state capacity is capped', async () => {
    const { root, paths } = await createHostPaths();
    const activePaths = resolveRunPaths(
      {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'linear-lin-active-live-started-cap'
      },
      'run-active-live-started-cap'
    );
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active-live-started-cap',
        task_id: 'linear-lin-active-live-started-cap',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-active-live-started-cap',
        issue_identifier: 'CO-184',
        issue_updated_at: '2026-04-15T01:17:00.000Z',
        updated_at: '2026-04-15T01:17:30.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-active-live-started-cap',
      issue_id: 'lin-active-live-started-cap',
      issue_identifier: 'CO-184',
      issue_title: 'Active started capacity occupant',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:17:00.000Z',
      task_id: 'linear-lin-active-live-started-cap',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_handoff_owned',
      accepted_at: '2026-04-15T01:17:00.000Z',
      updated_at: '2026-04-15T01:17:30.000Z',
      last_delivery_id: 'delivery-active-live-started-cap',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_686_220_000,
      run_id: 'run-active-live-started-cap',
      run_manifest_path: activePaths.manifestPath,
      launch_source: null,
      launch_token: null
    });
    pushCo185ReleasedPendingClaim(state, '', {
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:18:00.000Z',
      run_id: null,
      run_manifest_path: null
    });

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-co-185-should-not-launch-while-capped',
        manifestPath: '/tmp/provider-run/co-185-should-not-launch-while-capped-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-185',
        identifier: 'CO-185',
        title: 'Provider helper constraints',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-04-15T01:18:56.003Z'
      })
    }));
    const refetchTrackedIssues = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssues: []
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 3,
          max_concurrent_agents_by_state: {
            'In Progress': 1
          }
        }
      })
    });

    await service.poll?.({
      trackedIssues: [],
      refetchTrackedIssues,
      deferFreshDiscovery: true
    });

    expect(resolveTrackedIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'lin-issue-185'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-185')).toMatchObject({
      state: 'accepted',
      reason: 'provider_issue_refresh_start_blocked:max_concurrency',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:18:56.003Z',
      task_id: 'linear-lin-issue-185',
      run_id: null,
      run_manifest_path: null
    });
  });

  it('updates live-started no-run pending-reopen metadata when global capacity is capped', async () => {
    const { root, paths } = await createHostPaths();
    const activePaths = resolveRunPaths(
      {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'linear-lin-active-live-started-global-cap'
      },
      'run-active-live-started-global-cap'
    );
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active-live-started-global-cap',
        task_id: 'linear-lin-active-live-started-global-cap',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-active-live-started-global-cap',
        issue_identifier: 'CO-184',
        issue_updated_at: '2026-04-15T01:17:00.000Z',
        updated_at: '2026-04-15T01:17:30.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-active-live-started-global-cap',
      issue_id: 'lin-active-live-started-global-cap',
      issue_identifier: 'CO-184',
      issue_title: 'Active started global cap occupant',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:17:00.000Z',
      task_id: 'linear-lin-active-live-started-global-cap',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_handoff_owned',
      accepted_at: '2026-04-15T01:17:00.000Z',
      updated_at: '2026-04-15T01:17:30.000Z',
      last_delivery_id: 'delivery-active-live-started-global-cap',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_686_220_000,
      run_id: 'run-active-live-started-global-cap',
      run_manifest_path: activePaths.manifestPath,
      launch_source: null,
      launch_token: null
    });
    pushCo185ReleasedPendingClaim(state, '', {
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:18:00.000Z',
      run_id: null,
      run_manifest_path: null
    });

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-co-185-should-not-launch-while-global-capped',
        manifestPath: '/tmp/provider-run/co-185-should-not-launch-while-global-capped.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-185',
        identifier: 'CO-185',
        title: 'Provider helper constraints',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-04-15T01:18:56.003Z'
      })
    }));
    const refetchTrackedIssues = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssues: []
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    await service.poll?.({
      trackedIssues: [],
      refetchTrackedIssues,
      deferFreshDiscovery: true
    });

    expect(resolveTrackedIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'lin-issue-185'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-185')).toMatchObject({
      state: 'accepted',
      reason: 'provider_issue_refresh_start_blocked:max_concurrency',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:18:56.003Z',
      task_id: 'linear-lin-issue-185',
      run_id: null,
      run_manifest_path: null
    });
  });

  it('preserves fresh-discovery state slots for discovered live-started no-run pending-reopen claims', async () => {
    const { root, paths } = await createHostPaths();
    const activePaths = resolveRunPaths(
      {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'linear-lin-active-live-started-reserved'
      },
      'run-active-live-started-reserved'
    );
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active-live-started-reserved',
        task_id: 'linear-lin-active-live-started-reserved',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-active-live-started-reserved',
        issue_identifier: 'CO-184',
        issue_updated_at: '2026-04-15T01:17:00.000Z',
        updated_at: '2026-04-15T01:17:30.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-active-live-started-reserved',
      issue_id: 'lin-active-live-started-reserved',
      issue_identifier: 'CO-184',
      issue_title: 'Active started reserved slot occupant',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:17:00.000Z',
      task_id: 'linear-lin-active-live-started-reserved',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_handoff_owned',
      accepted_at: '2026-04-15T01:17:00.000Z',
      updated_at: '2026-04-15T01:17:30.000Z',
      last_delivery_id: 'delivery-active-live-started-reserved',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_686_220_000,
      run_id: 'run-active-live-started-reserved',
      run_manifest_path: activePaths.manifestPath,
      launch_source: null,
      launch_token: null
    });
    pushCo185ReleasedPendingClaim(state, '', {
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:18:00.000Z',
      run_id: null,
      run_manifest_path: null
    });

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-co-185-should-preserve-fresh-discovery-slot',
        manifestPath: '/tmp/provider-run/co-185-should-preserve-fresh-discovery-slot-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async (input: { issueId: string }) => {
      if (input.issueId !== 'lin-issue-185') {
        throw new Error(`unexpected direct issue refresh for ${input.issueId}`);
      }
      return {
        kind: 'ready' as const,
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          title: 'Provider helper constraints',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:18:56.003Z'
        })
      };
    });
    const refetchTrackedIssues = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssues: []
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 3,
          max_concurrent_agents_by_state: {
            'In Progress': 2
          }
        }
      })
    });

    await service.poll?.({
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-active-live-started-reserved',
          identifier: 'CO-184',
          title: 'Active started reserved slot occupant',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:17:00.000Z'
        }),
      ],
      refetchTrackedIssues,
      deferFreshDiscovery: true
    });

    expect(resolveTrackedIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'lin-issue-185'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-185')).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:18:56.003Z',
      run_id: null,
      run_manifest_path: null
    });
  });

  it('preserves fresh-discovery slots when live-started pending-reopen truth is already in the poll snapshot', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, '', {
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:18:00.000Z',
      run_id: null,
      run_manifest_path: null
    });

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-co-185-should-not-use-reserved-poll-snapshot-slot',
        manifestPath: '/tmp/provider-run/co-185-should-not-use-reserved-poll-snapshot-slot.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async (input: { issueId: string }) => {
      throw new Error(`unexpected direct issue refresh for ${input.issueId}`);
    });
    const refetchTrackedIssues = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssues: []
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    await service.poll?.({
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          title: 'Provider helper constraints',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:18:56.003Z'
        })
      ],
      refetchTrackedIssues,
      deferFreshDiscovery: true
    });

    expect(resolveTrackedIssue).not.toHaveBeenCalled();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-185')).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:18:56.003Z',
      run_id: null,
      run_manifest_path: null
    });
  });

  it('blocks live-start no-run probes when same-issue occupancy is unreadable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T01:20:00.000Z'));

    const { root, paths } = await createHostPaths();
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, '', {
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:18:00.000Z',
      run_id: null,
      run_manifest_path: null
    });
    const unreadablePaths = resolveRunPaths(
      {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'linear-lin-issue-185-foreign'
      },
      'run-unreadable-live-started'
    );
    await mkdir(unreadablePaths.runDir, { recursive: true });
    await writeFile(unreadablePaths.manifestPath, '{"run_id":"run-unreadable-live-started"', 'utf8');
    await writeFile(
      join(unreadablePaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-185',
        issue_identifier: 'CO-185',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        worker_host: 'worker-host-01',
        attempt_started_at: new Date(Date.now() - 120_000).toISOString(),
        updated_at: new Date(Date.now() - 60_000).toISOString()
      }),
      'utf8'
    );

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-co-185-duplicate-live-started',
        manifestPath: '/tmp/provider-run/co-185-duplicate-live-started-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => {
      throw new Error('same-issue occupied no-run claim should not use direct issue refresh');
    });
    const refetchTrackedIssues = vi.fn(async (input: { excludedIssueIds?: string[] }) => {
      expect(input.excludedIssueIds ?? []).toContain('lin-issue-185');
      return {
        kind: 'ready' as const,
        trackedIssues: []
      };
    });
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 2
        }
      })
    });

    await service.poll?.({
      trackedIssues: [],
      refetchTrackedIssues,
      deferFreshDiscovery: true
    });

    expect(resolveTrackedIssue).not.toHaveBeenCalled();
    expect(refetchTrackedIssues).toHaveBeenCalledTimes(1);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:18:00.000Z',
      run_id: null,
      run_manifest_path: null
    });
  });

  it('does not launch normally budgeted live-start probes when same-issue occupancy is unreadable and budget permits dispatch', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T01:20:00.000Z'));

    const { root, paths } = await createHostPaths();
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, '', {
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:18:00.000Z',
      run_id: null,
      run_manifest_path: null
    });
    const unreadablePaths = resolveRunPaths(
      {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'linear-lin-issue-185-foreign-budgeted'
      },
      'run-unreadable-live-started-budgeted'
    );
    await mkdir(unreadablePaths.runDir, { recursive: true });
    await writeFile(unreadablePaths.manifestPath, '{"run_id":"run-unreadable-live-started-budgeted"', 'utf8');
    await writeFile(
      join(unreadablePaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-185',
        issue_identifier: 'CO-185',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        worker_host: 'worker-host-01',
        attempt_started_at: new Date(Date.now() - 120_000).toISOString(),
        updated_at: new Date(Date.now() - 60_000).toISOString()
      }),
      'utf8'
    );

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-co-185-duplicate-budgeted-live-started',
        manifestPath: '/tmp/provider-run/co-185-duplicate-budgeted-live-started-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-185',
        identifier: 'CO-185',
        title: 'Provider helper constraints',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-04-15T01:18:56.003Z'
      })
    }));
    const refetchTrackedIssues = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssues: []
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 3
        }
      })
    });

    await service.poll?.({
      trackedIssues: [],
      refetchTrackedIssues,
      deferFreshDiscovery: true
    });

    expect(resolveTrackedIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'lin-issue-185'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:18:00.000Z',
      run_id: null,
      run_manifest_path: null
    });
  });

  it('keeps release-cancel retries for ordinary released not-active active runs with cached terminal state', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-15T01:10:00.000Z'
    });

    const cancelCalls: Array<Record<string, unknown>> = [];
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ payload }) => {
        cancelCalls.push(payload);
      }
    );
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'skip' as const,
      reason: 'linear_refresh_unavailable'
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue
    });

    await service.refresh();

    expect(resolveTrackedIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'lin-issue-185'
    });
    await vi.waitFor(() => {
      expect(cancelCalls).toEqual([
        expect.objectContaining({
          action: 'cancel',
          reason: 'provider_issue_released:not_active'
        })
      ]);
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-15T01:10:00.000Z'
    });
  });

  it('does not reattach a released active run while cancellation is in flight', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      issue_state: 'Done',
      issue_state_type: 'completed',
      reason: 'provider_issue_released:not_mutable'
    });

    const cancelCalls: Array<Record<string, unknown>> = [];
    const cancelResolvers: Array<() => void> = [];
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ payload }) => {
        cancelCalls.push(payload);
        await new Promise<void>((resolve) => cancelResolvers.push(resolve));
      }
    );
    let resolveStarted = false;
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue: vi.fn(async () =>
        resolveStarted
          ? {
              kind: 'ready' as const,
              trackedIssue: createTrackedIssue({
                id: 'lin-issue-185',
                identifier: 'CO-185',
                title: 'Provider helper constraints',
                state: 'In Progress',
                state_type: 'started',
                updated_at: '2026-04-15T01:18:56.003Z'
              })
            }
          : {
              kind: 'skip' as const,
              reason: 'linear_refresh_unavailable'
            }
      )
    });

    await service.refresh();
    expect(cancelCalls).toHaveLength(1);

    state.claims[0].issue_state = 'In Progress';
    state.claims[0].issue_state_type = 'started';
    state.claims[0].reason = 'provider_issue_released_pending_reopen:provider_issue_released:not_active';
    resolveStarted = true;
    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });

    cancelResolvers.splice(0).forEach((resolve) => resolve());
  });

  it('does not refresh-rehydrate released runs from older started issue truth', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:30:00.000Z'
    });

    const cancelCalls: Array<Record<string, unknown>> = [];
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ payload }) => {
        cancelCalls.push(payload);
      }
    );
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue: vi.fn(async () => ({
        kind: 'ready' as const,
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          title: 'Provider helper constraints',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:18:56.003Z'
        })
      }))
    });

    await service.refresh();

    expect(cancelCalls).toHaveLength(1);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-04-15T01:30:00.000Z',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
  });

  it('refreshes released pending-reopen started claims back to running from cached started state', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath);

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker'
    });

    await service.refresh();

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:18:56.003Z',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.latest_reason).toBe('provider_issue_rehydrated_active_run');
  });

  it('rehydrates ordinary released not-active claims only with fresh started truth and live runs', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      reason: 'provider_issue_released:not_active'
    });

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-185',
        identifier: 'CO-185',
        title: 'Provider helper constraints',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-04-15T01:18:56.003Z'
      })
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue
    });

    await service.rehydrate();

    expect(resolveTrackedIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'lin-issue-185'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:18:56.003Z',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.latest_reason).toBe('provider_issue_rehydrated_active_run');
  });

  it('rehydrates ordinary released not-active claims when cached issue metadata is stale non-started', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-15T01:10:00.000Z'
    });

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-185',
        identifier: 'CO-185',
        title: 'Provider helper constraints',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-04-15T01:18:56.003Z'
      })
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue
    });

    await service.rehydrate();

    expect(resolveTrackedIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'lin-issue-185'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:18:56.003Z',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.latest_reason).toBe('provider_issue_rehydrated_active_run');
  });

  it('does not rehydrate ordinary released not-active claims from cached started metadata alone', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      reason: 'provider_issue_released:not_active'
    });

    const cancelCalls: Array<Record<string, unknown>> = [];
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ payload }) => {
        cancelCalls.push(payload);
      }
    );
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker'
    });

    await service.rehydrate();

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(cancelCalls).toHaveLength(0);
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
  });

  it('does not fail closed ordinary released not-active live workers before fresh started resolution', async () => {
    const { root, paths } = await createHostPaths();
    const childPaths = await createCo185ActiveRun(root);
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, childPaths.manifestPath, {
      reason: 'provider_issue_released:not_active'
    });

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-185',
        identifier: 'CO-185',
        title: 'Provider helper constraints',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-04-15T01:18:56.003Z'
      })
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue
    });

    await service.poll?.({
      trackedIssues: [],
      allowPollFailClosed: true,
      deferFreshDiscovery: true
    });

    expect(resolveTrackedIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'lin-issue-185'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-15T01:18:56.003Z',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
  });

  it('keeps retained missing-manifest ordinary released not-active claims fail-closed without no-live proof', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, '', {
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-15T01:10:00.000Z',
      run_id: 'run-retained-missing-manifest',
      run_manifest_path: ''
    });

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-co-185-restarted',
        manifestPath: '/tmp/provider-run/co-185-restarted-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'skip' as const,
      reason: 'provider_issue_poll_deferred_for_fresh_discovery'
    }));
    const refetchTrackedIssues = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          title: 'Provider helper constraints',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:18:56.003Z'
        })
      ]
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    await service.poll?.({
      trackedIssues: [],
      refetchTrackedIssues,
      allowPollFailClosed: true,
      deferFreshDiscovery: true
    });

    expect(resolveTrackedIssue).not.toHaveBeenCalled();
    expect(refetchTrackedIssues).not.toHaveBeenCalled();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-15T01:10:00.000Z',
      run_id: 'run-retained-missing-manifest',
      run_manifest_path: ''
    });
  });

  it('keeps synthetic missing-manifest ordinary released not-active claims fail-closed', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    pushCo185ReleasedPendingClaim(state, '', {
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-15T01:10:00.000Z',
      run_id: co185TaskId,
      run_manifest_path: null
    });

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-co-185-restarted',
        manifestPath: '/tmp/provider-run/co-185-restarted-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => {
      throw new Error('synthetic released not-active claim should not use direct issue refresh');
    });
    const refetchTrackedIssues = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-issue-185',
          identifier: 'CO-185',
          title: 'Provider helper constraints',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-15T01:18:56.003Z'
        })
      ]
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    await service.poll?.({
      trackedIssues: [],
      refetchTrackedIssues,
      allowPollFailClosed: true,
      deferFreshDiscovery: true
    });

    expect(resolveTrackedIssue).not.toHaveBeenCalled();
    expect(refetchTrackedIssues).not.toHaveBeenCalled();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-15T01:10:00.000Z',
      run_id: co185TaskId,
      run_manifest_path: null
    });
  });

  it('retries released queued child cancellation on a later ready refresh after a transient release failure', async () => {
    const { root, paths } = await createHostPaths();
    const queuedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-queued'
    };
    const queuedPaths = resolveRunPaths(queuedEnv, 'run-queued');
    await mkdir(queuedPaths.runDir, { recursive: true });
    await writeFile(
      queuedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-queued',
        task_id: 'task-1303-queued',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const failedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-failed'
    };
    const failedPaths = resolveRunPaths(failedEnv, 'run-failed');
    await mkdir(failedPaths.runDir, { recursive: true });
    await writeFile(
      failedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-failed',
        task_id: 'task-1303-failed',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-queued',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-active',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-queued',
      run_manifest_path: queuedPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const cancelCalls: Array<Record<string, unknown>> = [];
    const cancelSettlers: Array<(outcome: 'resolve' | 'reject') => void> = [];
    let pendingCancels = 0;
    const settleNextCancel = (outcome: 'resolve' | 'reject') => {
      const settle = cancelSettlers.shift();
      if (!settle) {
        throw new Error('No pending release cancel to settle.');
      }
      settle(outcome);
    };
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async ({ payload }) => {
        cancelCalls.push(payload);
        pendingCancels += 1;
        await new Promise<void>((resolve, reject) => {
          cancelSettlers.push((outcome) => {
            pendingCancels -= 1;
            if (outcome === 'reject') {
              reject(new Error('cancel failed'));
              return;
            }
            resolve();
          });
        });
      }
    );

    let resolveTrackedIssueCallCount = 0;
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      resolveTrackedIssue: async () => {
        resolveTrackedIssueCallCount += 1;
        if (resolveTrackedIssueCallCount === 1) {
          return {
            kind: 'skip',
            reason: 'linear_refresh_unavailable'
          };
        }
        return {
          kind: 'ready',
          trackedIssue: createTrackedIssue()
        };
      }
    });

    await service.refresh();
    await vi.waitFor(() => {
      expect(cancelCalls).toHaveLength(1);
      expect(pendingCancels).toBe(1);
    });

    await service.refresh();
    expect(resolveTrackedIssueCallCount).toBe(2);
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: 'run-queued',
      run_manifest_path: queuedPaths.manifestPath
    });

    settleNextCancel('reject');
    await vi.waitFor(() => {
      expect(pendingCancels).toBe(0);
    });

    await service.refresh();
    expect(resolveTrackedIssueCallCount).toBe(3);
    await vi.waitFor(() => {
      expect(cancelCalls).toEqual([
        expect.objectContaining({
          action: 'cancel',
          reason: 'provider_issue_released:not_active'
        }),
        expect.objectContaining({
          action: 'cancel',
          reason: 'provider_issue_released:not_active'
        })
      ]);
      expect(pendingCancels).toBe(1);
    });
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: 'run-queued',
      run_manifest_path: queuedPaths.manifestPath
    });

    settleNextCancel('resolve');
    await vi.waitFor(() => {
      expect(pendingCancels).toBe(0);
    });
  });

  it('reconciles a stale merge-closeout action-required claim after live terminal truth is reread', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c';
    const runId = '2026-04-17T02-04-33-897Z-d18707f4';
    const completedPaths = resolveRunPaths(
      {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId
      },
      runId
    );
    await mkdir(completedPaths.runDir, { recursive: true });
    await writeFile(
      completedPaths.manifestPath,
      JSON.stringify({
        run_id: runId,
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: '59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c',
        issue_identifier: 'CO-211',
        issue_updated_at: '2026-04-17T02:04:28.234Z',
        started_at: '2026-04-17T02:04:34.014Z',
        updated_at: '2026-04-17T03:50:45.850Z',
        completed_at: '2026-04-17T03:50:45.820Z',
        summary: 'Provider linear worker reached review handoff.'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c',
      issue_id: '59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c',
      issue_identifier: 'CO-211',
      issue_title: 'Control host: prevent repeated refresh-stuck restart churn while active provider workers remain healthy',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-17T03:51:02.741Z',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      accepted_at: '2026-04-17T02:04:29.689Z',
      updated_at: '2026-04-17T05:35:08.264Z',
      last_delivery_id: null,
      last_event: 'poll_tick',
      last_action: 'reconcile',
      last_webhook_timestamp: null,
      run_id: runId,
      run_manifest_path: completedPaths.manifestPath,
      worker_host: null,
      launch_source: 'control-host',
      launch_token: 'f730c7d679b5b13ff935d92097a7aa00',
      launch_started_at: '2026-04-17T02:04:29.689Z',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null,
      review_promotion: null,
      merge_closeout: {
        recorded_at: '2026-04-17T03:51:34.035Z',
        issue_id: '59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c',
        issue_identifier: 'CO-211',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-17T03:51:02.741Z',
        status: 'action_required',
        reason: 'pending_shared_root_reconciliation',
        summary:
          'Merged attached PR #506; shared-root reconciliation is pending (shared_root_not_on_main) before the Linear issue can transition to Done.',
        attached_pr_urls: ['https://github.com/Kbediako/CO/pull/506'],
        ignored_historical_pr_urls: [],
        conflicting_attached_pr_urls: [],
        pr: {
          url: 'https://github.com/Kbediako/CO/pull/506',
          owner: 'Kbediako',
          repo: 'CO',
          number: 506
        },
        snapshot: {
          state: 'MERGED',
          review_decision: 'NONE',
          merge_state_status: 'UNKNOWN',
          ready_to_merge: false,
          gate_reasons: ['state=MERGED', 'merge_state=UNKNOWN'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-04-17T03:51:37Z',
          merged_at: '2026-04-17T03:51:37Z',
          head_oid: 'b154340a90bb7fb46b5f5af5074b8e94f8a19853',
          github_rate_limit: null
        },
        branch_recovery: null,
        merge_attempt: {
          attempted_at: '2026-04-17T03:51:36.081Z',
          command: 'gh',
          args: [
            'pr',
            'merge',
            '506',
            '--squash',
            '--repo',
            'Kbediako/CO',
            '--match-head-commit',
            'b154340a90bb7fb46b5f5af5074b8e94f8a19853'
          ],
          exit_code: 0,
          ok: true,
          stdout: null,
          stderr: null
        },
        shared_root: {
          status: 'skipped',
          attempted_at: '2026-04-17T03:51:40.227Z',
          before_status: '## linear/co-196-codex-0121-plugin-marketplace',
          after_status: '## linear/co-196-codex-0121-plugin-marketplace',
          reason: 'shared_root_not_on_main'
        },
        linear_transition: null,
        github_rate_limit: null
      }
    });

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async ({ issueId }: { issueId: string }) => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        id: issueId,
        identifier: 'CO-211',
        title:
          'Control host: prevent repeated refresh-stuck restart churn while active provider workers remain healthy',
        state: 'Done',
        state_type: 'completed',
        updated_at: '2026-04-17T03:51:37.100Z'
      })
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue
    });

    await service.refresh();

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-17T03:51:37.100Z',
      run_id: runId,
      run_manifest_path: completedPaths.manifestPath,
      merge_closeout: {
        status: 'action_required',
        reason: 'pending_shared_root_reconciliation',
        issue_state: 'Merging',
        issue_state_type: 'started',
        shared_root: {
          status: 'skipped',
          reason: 'shared_root_not_on_main'
        },
        linear_transition: null
      }
    });
  });

  it('rehydrates an archived terminal merge-closeout claim without preserving stale merging authority', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c';
    const runId = '2026-04-17T02-04-33-897Z-d18707f4';
    const completedPaths = resolveRunPaths(
      {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId
      },
      runId
    );
    await mkdir(completedPaths.runDir, { recursive: true });
    await writeFile(
      completedPaths.manifestPath,
      JSON.stringify({
        run_id: runId,
        task_id: taskId,
        pipeline_id: 'provider-linear-worker',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: '59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c',
        issue_identifier: 'CO-211',
        issue_updated_at: '2026-04-17T02:04:28.234Z',
        started_at: '2026-04-17T02:04:34.014Z',
        updated_at: '2026-04-17T03:50:45.850Z',
        completed_at: '2026-04-17T03:50:45.820Z',
        summary: 'Provider linear worker reached review handoff.'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c',
      issue_id: '59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c',
      issue_identifier: 'CO-211',
      issue_title:
        'Control host: prevent repeated refresh-stuck restart churn while active provider workers remain healthy',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-17T03:51:02.741Z',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      accepted_at: '2026-04-17T02:04:29.689Z',
      updated_at: '2026-04-17T05:35:08.264Z',
      last_delivery_id: null,
      last_event: 'poll_tick',
      last_action: 'reconcile',
      last_webhook_timestamp: null,
      run_id: runId,
      run_manifest_path: completedPaths.manifestPath,
      worker_host: null,
      launch_source: 'control-host',
      launch_token: 'f730c7d679b5b13ff935d92097a7aa00',
      launch_started_at: '2026-04-17T02:04:29.689Z',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null,
      review_promotion: null,
      merge_closeout: {
        recorded_at: '2026-04-17T03:51:34.035Z',
        issue_id: '59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c',
        issue_identifier: 'CO-211',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-17T03:51:02.741Z',
        status: 'action_required',
        reason: 'pending_shared_root_reconciliation',
        summary:
          'Merged attached PR #506; shared-root reconciliation is pending (shared_root_not_on_main) before the Linear issue can transition to Done.',
        attached_pr_urls: ['https://github.com/Kbediako/CO/pull/506'],
        ignored_historical_pr_urls: [],
        conflicting_attached_pr_urls: [],
        pr: {
          url: 'https://github.com/Kbediako/CO/pull/506',
          owner: 'Kbediako',
          repo: 'CO',
          number: 506
        },
        snapshot: {
          state: 'MERGED',
          review_decision: 'NONE',
          merge_state_status: 'UNKNOWN',
          ready_to_merge: false,
          gate_reasons: ['state=MERGED', 'merge_state=UNKNOWN'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-04-17T03:51:37Z',
          merged_at: '2026-04-17T03:51:37Z',
          head_oid: 'b154340a90bb7fb46b5f5af5074b8e94f8a19853',
          github_rate_limit: null
        },
        branch_recovery: null,
        merge_attempt: {
          attempted_at: '2026-04-17T03:51:36.081Z',
          command: 'gh',
          args: [
            'pr',
            'merge',
            '506',
            '--squash',
            '--repo',
            'Kbediako/CO',
            '--match-head-commit',
            'b154340a90bb7fb46b5f5af5074b8e94f8a19853'
          ],
          exit_code: 0,
          ok: true,
          stdout: null,
          stderr: null
        },
        shared_root: {
          status: 'skipped',
          attempted_at: '2026-04-17T03:51:40.227Z',
          before_status: '## linear/co-196-codex-0121-plugin-marketplace',
          after_status: '## linear/co-196-codex-0121-plugin-marketplace',
          reason: 'shared_root_not_on_main'
        },
        linear_transition: null,
        github_rate_limit: null
      }
    });

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async ({ issueId }: { issueId: string }) => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        id: issueId,
        identifier: 'CO-211',
        title:
          'Control host: prevent repeated refresh-stuck restart churn while active provider workers remain healthy',
        state: 'Done',
        state_type: 'completed',
        updated_at: '2026-04-17T03:51:37.100Z',
        archived_at: '2026-04-17T04:00:00.000Z'
      })
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'provider-linear-worker',
      resolveTrackedIssue
    });

    await service.rehydrate();

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-17T03:51:37.100Z',
      issue_archived_at: '2026-04-17T04:00:00.000Z',
      run_id: runId,
      run_manifest_path: completedPaths.manifestPath,
      merge_closeout: {
        status: 'action_required',
        reason: 'pending_shared_root_reconciliation',
        issue_state: 'Merging',
        issue_state_type: 'started',
        shared_root: {
          status: 'skipped',
          reason: 'shared_root_not_on_main'
        },
        linear_transition: null
      },
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('keeps merge-closeout authority when cached terminal truth lacks updated_at freshness proof', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c';
    const runId = '2026-04-17T02-04-33-897Z-d18707f4';
    const completedPaths = resolveRunPaths(
      {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId
      },
      runId
    );
    await mkdir(completedPaths.runDir, { recursive: true });
    await writeFile(
      completedPaths.manifestPath,
      JSON.stringify({
        run_id: runId,
        task_id: taskId,
        issue_provider: 'linear',
        issue_id: '59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c',
        issue_identifier: 'CO-211',
        pipeline_id: 'diagnostics',
        pipeline_title: 'Diagnostics',
        status: 'succeeded',
        started_at: '2026-04-17T02:04:34.014Z',
        updated_at: '2026-04-17T03:50:45.850Z',
        completed_at: '2026-04-17T03:50:45.820Z',
        summary: 'Provider linear worker reached review handoff.'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c',
      issue_id: '59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c',
      issue_identifier: 'CO-211',
      issue_title:
        'Control host: prevent repeated refresh-stuck restart churn while active provider workers remain healthy',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: null,
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      accepted_at: '2026-04-17T02:04:29.689Z',
      updated_at: '2026-04-17T05:35:08.264Z',
      last_delivery_id: null,
      last_event: 'poll_tick',
      last_action: 'reconcile',
      last_webhook_timestamp: null,
      run_id: runId,
      run_manifest_path: completedPaths.manifestPath,
      worker_host: null,
      launch_source: 'control-host',
      launch_token: 'f730c7d679b5b13ff935d92097a7aa00',
      launch_started_at: '2026-04-17T02:04:29.689Z',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null,
      review_promotion: null,
      merge_closeout: {
        recorded_at: '2026-04-17T03:51:34.035Z',
        issue_id: '59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c',
        issue_identifier: 'CO-211',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-17T03:51:02.741Z',
        status: 'action_required',
        reason: 'pending_shared_root_reconciliation',
        summary:
          'Merged attached PR #506; shared-root reconciliation is pending (shared_root_not_on_main) before the Linear issue can transition to Done.',
        attached_pr_urls: ['https://github.com/Kbediako/CO/pull/506'],
        ignored_historical_pr_urls: [],
        conflicting_attached_pr_urls: [],
        pr: {
          url: 'https://github.com/Kbediako/CO/pull/506',
          owner: 'Kbediako',
          repo: 'CO',
          number: 506
        },
        snapshot: {
          state: 'MERGED',
          review_decision: 'NONE',
          merge_state_status: 'UNKNOWN',
          ready_to_merge: false,
          gate_reasons: ['state=MERGED', 'merge_state=UNKNOWN'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-04-17T03:51:37Z',
          merged_at: '2026-04-17T03:51:37Z',
          head_oid: 'b154340a90bb7fb46b5f5af5074b8e94f8a19853',
          github_rate_limit: null
        },
        branch_recovery: null,
        merge_attempt: {
          attempted_at: '2026-04-17T03:51:36.081Z',
          command: 'gh',
          args: [
            'pr',
            'merge',
            '506',
            '--squash',
            '--repo',
            'Kbediako/CO',
            '--match-head-commit',
            'b154340a90bb7fb46b5f5af5074b8e94f8a19853'
          ],
          exit_code: 0,
          ok: true,
          stdout: null,
          stderr: null
        },
        shared_root: {
          status: 'skipped',
          attempted_at: '2026-04-17T03:51:40.227Z',
          before_status: '## linear/co-196-codex-0121-plugin-marketplace',
          after_status: '## linear/co-196-codex-0121-plugin-marketplace',
          reason: 'shared_root_not_on_main'
        },
        linear_transition: null,
        github_rate_limit: null
      }
    });

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'skip' as const,
      reason: 'dispatch_source_unavailable'
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      resolveTrackedIssue
    });

    await service.refresh();

    expect(resolveTrackedIssue).toHaveBeenCalled();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: null,
      run_id: runId,
      run_manifest_path: completedPaths.manifestPath,
      merge_closeout: {
        status: 'action_required',
        reason: 'pending_shared_root_reconciliation',
        issue_state: 'Merging',
        issue_state_type: 'started',
        shared_root: {
          status: 'skipped',
          reason: 'shared_root_not_on_main'
        },
        linear_transition: null
      }
    });
  });
});
