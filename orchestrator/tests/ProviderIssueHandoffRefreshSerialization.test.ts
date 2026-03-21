import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import * as questionChildResolutionAdapter from '../src/cli/control/questionChildResolutionAdapter.js';
import { runProviderIssueHandoffRefresh } from '../src/cli/control/controlServerPublicLifecycle.js';
import { createProviderIssueHandoffService } from '../src/cli/control/providerIssueHandoff.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import type { ProviderIntakeState } from '../src/cli/control/providerIntakeState.js';
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
    workspace_id: 'workspace-1',
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
      reason: 'provider_issue_released:not_active',
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
          reason: 'provider_issue_released:not_active'
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
      reason: 'provider_issue_released:not_active',
      task_id: 'task-1303-active',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
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
      reason: 'provider_issue_released:not_active',
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
          reason: 'provider_issue_released:not_active'
        }),
        expect.objectContaining({
          action: 'cancel',
          reason: 'provider_issue_released:not_active'
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
      reason: 'provider_issue_released:not_active',
      task_id: 'task-1303-active',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
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
      reason: 'provider_issue_released:not_active',
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
      reason: 'provider_issue_released:not_active',
      task_id: 'task-1303-active',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
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
      reason: 'provider_issue_released:not_active',
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
      reason: 'provider_issue_released:not_active',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
  });

  it('retries released active child cancellation on a later ready refresh after a transient release failure', async () => {
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
    expect(cancelCalls).toHaveLength(2);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
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
});
