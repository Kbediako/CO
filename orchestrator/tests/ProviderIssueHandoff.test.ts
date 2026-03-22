import http from 'node:http';
import { access, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createProviderIssueHandoffService
} from '../src/cli/control/providerIssueHandoff.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import * as questionChildResolutionAdapter from '../src/cli/control/questionChildResolutionAdapter.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';
import { resolveProviderWorkspacePath } from '../src/cli/run/workspacePath.js';
import {
  normalizeProviderIntakeState,
  type ProviderIntakeState
} from '../src/cli/control/providerIntakeState.js';

const cleanupRoots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createHostPaths() {
  const root = await mkdtemp(join(tmpdir(), 'provider-issue-handoff-'));
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

async function createControlEndpointServer(): Promise<{
  baseUrl: string;
  actions: Array<Record<string, unknown>>;
  close(): Promise<void>;
}> {
  const actions: Array<Record<string, unknown>> = [];
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      actions.push(JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind control endpoint test server.');
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    actions,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
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
    priority: 2,
    created_at: '2026-03-18T04:00:00.000Z',
    updated_at: '2026-03-19T04:00:00.000Z',
    blocked_by: [],
    recent_activity: [],
    ...overrides
  };
}

async function flushAsyncWork(turns = 8): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
  }
}

const realSetImmediate = globalThis.setImmediate.bind(globalThis);

async function waitForRealEventLoopTurn(): Promise<void> {
  await new Promise<void>((resolve) => {
    realSetImmediate(resolve);
  });
}

async function waitForCondition(
  predicate: () => boolean,
  turns = 256
): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    if (predicate()) {
      return;
    }
    await vi.advanceTimersByTimeAsync(0);
    await flushAsyncWork();
    await waitForRealEventLoopTurn();
  }
  throw new Error(`Condition not met after ${turns} timer turns.`);
}

async function waitForMockCalls(
  mockFn: { mock: { calls: unknown[][] } },
  expectedCalls = 1,
  turns = 256
): Promise<void> {
  await waitForCondition(() => mockFn.mock.calls.length >= expectedCalls, turns);
}

function getLatestScheduledTimeoutCallback(
  setTimeoutSpy: { mock: { calls: unknown[][] } }
): () => void {
  for (let index = setTimeoutSpy.mock.calls.length - 1; index >= 0; index -= 1) {
    const [callback] = setTimeoutSpy.mock.calls[index] ?? [];
    if (typeof callback !== 'function') {
      continue;
    }
    return callback as () => void;
  }
  throw new Error('No scheduled timeout callback found.');
}

describe('createProviderIssueHandoffService', () => {
  it('persists a starting claim before launching a deterministic start for a started Linear issue', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => {
        expect(state.claims[0]).toMatchObject({
          provider_key: 'linear:lin-issue-1',
          state: 'starting',
          task_id: 'linear-lin-issue-1'
        });
        return null;
      }),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue(),
      deliveryId: 'delivery-1',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_000_000
    });

    expect(result.kind).toBe('start');
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:00:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      provider_key: 'linear:lin-issue-1',
      state: 'starting',
      task_id: 'linear-lin-issue-1',
      issue_identifier: 'CO-2',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('discovers a fresh eligible active issue on poll without a webhook delivery', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    await service.poll?.({
      trackedIssues: [createTrackedIssue()]
    });

    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:00:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      provider_key: 'linear:lin-issue-1',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      last_delivery_id: null,
      last_event: 'poll_tick',
      last_action: 'reconcile',
      last_webhook_timestamp: null
    });
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it('retries a fresh poll candidate after a pre-launch persist failure instead of stranding it in-memory', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    let persistCallCount = 0;
    const persist = vi.fn(async () => {
      persistCallCount += 1;
      if (persistCallCount === 2) {
        throw new Error('pre-launch persist failed');
      }
    });
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    await expect(
      service.poll?.({
        trackedIssues: [createTrackedIssue()]
      })
    ).resolves.toBeUndefined();

    expect(state.claims).toEqual([]);
    expect(launcher.start).not.toHaveBeenCalled();

    await expect(
      service.poll?.({
        trackedIssues: [createTrackedIssue()]
      })
    ).resolves.toBeUndefined();

    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      provider_key: 'linear:lin-issue-1',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      last_event: 'poll_tick',
      last_action: 'reconcile'
    });
  });

  it('dispatches fresh poll candidates in Symphony order', async () => {
    const { paths } = await createHostPaths();
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state: createProviderIntakeState(),
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics'
    });

    await service.poll?.({
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-issue-z',
          identifier: 'ZZ-9',
          priority: 1,
          created_at: '2026-03-19T04:00:00.000Z'
        }),
        createTrackedIssue({
          id: 'lin-issue-p2',
          identifier: 'MID-2',
          priority: 2,
          created_at: '2026-03-17T04:00:00.000Z'
        }),
        createTrackedIssue({
          id: 'lin-issue-old',
          identifier: 'MID-1',
          priority: 1,
          created_at: '2026-03-18T04:00:00.000Z'
        }),
        createTrackedIssue({
          id: 'lin-issue-a',
          identifier: 'AA-1',
          priority: 1,
          created_at: '2026-03-19T04:00:00.000Z'
        })
      ]
    });

    expect(launcher.start.mock.calls.map(([input]) => (input as { issueId: string }).issueId)).toEqual([
      'lin-issue-old',
      'lin-issue-a',
      'lin-issue-z',
      'lin-issue-p2'
    ]);
  });

  it('does not launch fresh poll candidates when existing occupied claims consume the global slot budget', async () => {
    const { root, paths } = await createHostPaths();
    const occupiedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-occupied'
    };
    const occupiedPaths = resolveRunPaths(occupiedEnv, 'run-occupied');
    await mkdir(occupiedPaths.runDir, { recursive: true });
    await writeFile(
      occupiedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-occupied',
        task_id: 'task-occupied',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-occupied',
        issue_identifier: 'CO-1',
        updated_at: '2026-03-19T04:00:00.000Z'
      }),
      'utf8'
    );

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state: createProviderIntakeState(),
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics',
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    await service.poll?.({
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-issue-occupied',
          identifier: 'CO-1',
          priority: 1
        }),
        createTrackedIssue({
          id: 'lin-issue-fresh',
          identifier: 'CO-2',
          priority: 1
        })
      ]
    });

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('treats queued retry claims as occupied poll slots before launching fresh poll candidates', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-retry',
      issue_id: 'lin-issue-retry',
      issue_identifier: 'CO-1',
      issue_title: 'Retry me first',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'task-retry',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:00:00.000Z',
      updated_at: '2026-03-19T04:00:00.000Z',
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
      retry_due_at: '2026-03-19T04:30:00.000Z',
      retry_error: null
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
      startPipelineId: 'diagnostics',
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    await service.poll?.({
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-issue-retry',
          identifier: 'CO-1',
          priority: 1
        }),
        createTrackedIssue({
          id: 'lin-issue-fresh',
          identifier: 'CO-2',
          priority: 2
        })
      ]
    });

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      provider_key: 'linear:lin-issue-retry',
      retry_queued: true,
      retry_due_at: '2026-03-19T04:30:00.000Z'
    });
  });

  it('treats owned claims that become queued for retry during refresh as occupied poll slots', async () => {
    const { root, paths } = await createHostPaths();
    const failedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-owned-failed'
    };
    const failedPaths = resolveRunPaths(failedEnv, 'run-owned-failed');
    await mkdir(failedPaths.runDir, { recursive: true });
    await writeFile(
      failedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-owned-failed',
        task_id: 'task-owned-failed',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-owned',
        issue_identifier: 'CO-1',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-owned',
      issue_id: 'lin-issue-owned',
      issue_identifier: 'CO-1',
      issue_title: 'Retry after refresh',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'linear-lin-issue-owned',
      mapping_source: 'provider_id_fallback',
      state: 'accepted',
      reason: 'provider_issue_accepted',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: null,
      last_event: null,
      last_action: null,
      last_webhook_timestamp: null,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null
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
      startPipelineId: 'diagnostics',
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    await service.poll?.({
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-issue-owned',
          identifier: 'CO-1',
          priority: 1,
          updated_at: '2026-03-19T04:21:00.000Z'
        }),
        createTrackedIssue({
          id: 'lin-issue-fresh',
          identifier: 'CO-2',
          priority: 2,
          updated_at: '2026-03-19T04:22:00.000Z'
        })
      ]
    });

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-owned')).toMatchObject({
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      task_id: 'task-owned-failed',
      run_id: 'run-owned-failed',
      run_manifest_path: failedPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: expect.any(String),
      retry_error: null
    });
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-fresh')).toBeUndefined();
  });

  it('does not launch more owned accepted claims than the configured poll slot budget', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push(
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-owned-1',
        issue_id: 'lin-issue-owned-1',
        issue_identifier: 'CO-1',
        issue_title: 'Owned claim one',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        task_id: null,
        mapping_source: 'provider_id_fallback',
        state: 'accepted',
        reason: 'provider_issue_accepted',
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: null,
        last_event: null,
        last_action: null,
        last_webhook_timestamp: null,
        run_id: null,
        run_manifest_path: null,
        launch_source: null,
        launch_token: null
      },
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-owned-2',
        issue_id: 'lin-issue-owned-2',
        issue_identifier: 'CO-2',
        issue_title: 'Owned claim two',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        task_id: null,
        mapping_source: 'provider_id_fallback',
        state: 'accepted',
        reason: 'provider_issue_accepted',
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: null,
        last_event: null,
        last_action: null,
        last_webhook_timestamp: null,
        run_id: null,
        run_manifest_path: null,
        launch_source: null,
        launch_token: null
      }
    );

    const launcher = {
      start: vi.fn(async ({ issueId }: { issueId: string }) => ({
        runId: `run-${issueId}`,
        manifestPath: `/tmp/provider-run/${issueId}.json`
      })),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics',
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      }),
      resolveTrackedIssue: async ({ issueId }) => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          id: issueId,
          identifier: issueId === 'lin-issue-owned-1' ? 'CO-1' : 'CO-2',
          updated_at: '2026-03-19T04:21:00.000Z'
        })
      })
    });

    await service.refresh();

    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(launcher.start.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        issueId: 'lin-issue-owned-1'
      })
    );
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-owned-1')).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_refresh_start_launched',
      run_id: 'run-lin-issue-owned-1',
      run_manifest_path: '/tmp/provider-run/lin-issue-owned-1.json'
    });
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-owned-2')).toMatchObject({
      state: 'accepted',
      reason: 'provider_issue_rehydration_pending_revalidation',
      run_id: null,
      run_manifest_path: null
    });
  });

  it('treats ignored retry-owning poll outcomes as occupied poll slots', async () => {
    const { root, paths } = await createHostPaths();
    const completedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-owned-completed'
    };
    const completedPaths = resolveRunPaths(completedEnv, 'run-owned-completed');
    await mkdir(completedPaths.runDir, { recursive: true });
    await writeFile(
      completedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-owned-completed',
        task_id: 'task-owned-completed',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-owned',
        issue_identifier: 'CO-1',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics',
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    await service.poll?.({
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-issue-owned',
          identifier: 'CO-1',
          priority: 1,
          updated_at: '2026-03-19T04:21:00.000Z'
        }),
        createTrackedIssue({
          id: 'lin-issue-fresh',
          identifier: 'CO-2',
          priority: 2,
          updated_at: '2026-03-19T04:22:00.000Z'
        })
      ]
    });

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-owned')).toMatchObject({
      state: 'accepted',
      reason: 'provider_issue_post_worker_exit_refresh_pending',
      task_id: 'task-owned-completed',
      run_id: 'run-owned-completed',
      run_manifest_path: completedPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: expect.any(String),
      retry_error: null
    });
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-fresh')).toBeUndefined();
  });

  it('uses poll truth state for unmatched in-progress runs when consuming per-state poll slots', async () => {
    const { root, paths } = await createHostPaths();
    const occupiedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-occupied'
    };
    const occupiedPaths = resolveRunPaths(occupiedEnv, 'run-occupied');
    await mkdir(occupiedPaths.runDir, { recursive: true });
    await writeFile(
      occupiedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-occupied',
        task_id: 'task-occupied',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-occupied',
        issue_identifier: 'CO-1',
        updated_at: '2026-03-19T04:00:00.000Z'
      }),
      'utf8'
    );

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state: createProviderIntakeState(),
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics',
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 2,
          max_concurrent_agents_by_state: {
            'in progress': 1
          }
        }
      })
    });

    await service.poll?.({
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-issue-occupied',
          identifier: 'CO-1',
          priority: 1,
          state: 'In Progress',
          state_type: 'started'
        }),
        createTrackedIssue({
          id: 'lin-issue-fresh',
          identifier: 'CO-2',
          priority: 2,
          state: 'In Progress',
          state_type: 'started'
        }),
        createTrackedIssue({
          id: 'lin-issue-todo',
          identifier: 'CO-3',
          priority: 3,
          state: 'Todo',
          state_type: null,
          created_at: '2026-03-20T04:00:00.000Z'
        })
      ]
    });

    expect(launcher.start.mock.calls.map(([input]) => (input as { issueId: string }).issueId)).toEqual([
      'lin-issue-todo'
    ]);
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('respects per-state slot overrides while continuing to dispatch other eligible states', async () => {
    const { paths } = await createHostPaths();
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state: createProviderIntakeState(),
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics',
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 2,
          max_concurrent_agents_by_state: {
            'in progress': 1
          }
        }
      })
    });

    await service.poll?.({
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-issue-in-progress-2',
          identifier: 'CO-3',
          priority: 2,
          state: 'In Progress',
          state_type: 'started'
        }),
        createTrackedIssue({
          id: 'lin-issue-todo',
          identifier: 'CO-4',
          priority: 3,
          state: 'Todo',
          state_type: null,
          created_at: '2026-03-20T04:00:00.000Z'
        }),
        createTrackedIssue({
          id: 'lin-issue-in-progress-1',
          identifier: 'CO-2',
          priority: 1,
          state: 'In Progress',
          state_type: 'started'
        })
      ]
    });

    expect(launcher.start.mock.calls.map(([input]) => (input as { issueId: string }).issueId)).toEqual([
      'lin-issue-in-progress-1',
      'lin-issue-todo'
    ]);
  });

  it('releases an existing claim when poll candidate truth no longer includes the issue', async () => {
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
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'accepted',
      reason: 'provider_issue_rehydration_pending_revalidation',
      accepted_at: '2026-03-19T04:00:00.000Z',
      updated_at: '2026-03-19T04:00:00.000Z',
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
      retry_due_at: '2026-03-19T04:00:10.000Z',
      retry_error: null
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
      startPipelineId: 'diagnostics'
    });

    await service.poll?.({
      trackedIssues: []
    });

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_found',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('falls back to single-issue resolution when poll truth omits a completed claimed issue', async () => {
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
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'accepted',
      reason: 'provider_issue_rehydration_pending_revalidation',
      accepted_at: '2026-03-19T04:00:00.000Z',
      updated_at: '2026-03-19T04:00:00.000Z',
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
      retry_due_at: '2026-03-19T04:00:10.000Z',
      retry_error: null
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
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async ({ issueId }) => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          id: issueId,
          identifier: 'CO-2',
          state: 'Done',
          state_type: 'completed',
          updated_at: '2026-03-19T04:10:00.000Z'
        })
      })
    });

    await service.poll?.({
      trackedIssues: []
    });

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:10:00.000Z',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('releases a queued retry when the retry candidate refetch no longer returns the issue', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

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

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics'
    });

    await service.poll?.({
      trackedIssues: [createTrackedIssue({ updated_at: '2026-03-19T04:21:00.000Z' })],
      refetchTrackedIssues: async () => ({
        kind: 'ready',
        trackedIssues: []
      })
    });

    await vi.advanceTimersByTimeAsync(1_001);
    await waitForCondition(() => state.claims[0]?.state === 'released');

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_found',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('falls back to single-issue resolution when queued retry refetch omits a completed issue', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

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

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async ({ issueId }) => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          id: issueId,
          identifier: 'CO-2',
          state: 'Done',
          state_type: 'completed',
          updated_at: '2026-03-19T04:31:00.000Z'
        })
      })
    });

    await service.poll?.({
      trackedIssues: [createTrackedIssue({ updated_at: '2026-03-19T04:21:00.000Z' })],
      refetchTrackedIssues: async () => ({
        kind: 'ready',
        trackedIssues: []
      })
    });

    await vi.advanceTimersByTimeAsync(1_001);
    await waitForCondition(() => state.claims[0]?.state === 'released');

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:31:00.000Z',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('preserves the current retry attempt when queued retry refetch is skipped', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

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

    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics'
    });

    await service.poll?.({
      trackedIssues: [createTrackedIssue({ updated_at: '2026-03-19T04:21:00.000Z' })],
      refetchTrackedIssues: async () => ({
        kind: 'skip',
        reason: 'dispatch_source_credentials_missing'
      })
    });

    await vi.advanceTimersByTimeAsync(1_001);
    await waitForCondition(
      () => state.claims[0]?.retry_error === 'retry poll failed: dispatch_source_credentials_missing'
    );

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: expect.any(String),
      retry_error: 'retry poll failed: dispatch_source_credentials_missing'
    });
    expect(Number.isFinite(Date.parse(state.claims[0]?.retry_due_at ?? ''))).toBe(true);
  });

  it('preserves queued retry ownership when a null-attempt retry refetch is skipped', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

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
      retry_attempt: null,
      retry_due_at: '2026-03-19T04:30:01.000Z',
      retry_error: null
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
      startPipelineId: 'diagnostics'
    });

    await service.poll?.({
      trackedIssues: [createTrackedIssue({ updated_at: '2026-03-19T04:21:00.000Z' })],
      refetchTrackedIssues: async () => ({
        kind: 'skip',
        reason: 'dispatch_source_credentials_missing'
      })
    });

    await vi.advanceTimersByTimeAsync(1_001);
    await waitForCondition(
      () => state.claims[0]?.retry_error === 'retry poll failed: dispatch_source_credentials_missing'
    );

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      retry_queued: true,
      retry_attempt: null,
      retry_due_at: expect.any(String),
      retry_error: 'retry poll failed: dispatch_source_credentials_missing'
    });
    expect(Number.isFinite(Date.parse(state.claims[0]?.retry_due_at ?? ''))).toBe(true);
  });

  it('preserves claims when bulk tracked issue refresh is skipped', async () => {
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
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'accepted',
      reason: 'provider_issue_accepted',
      accepted_at: '2026-03-19T04:21:05.000Z',
      updated_at: '2026-03-19T04:21:10.000Z',
      last_delivery_id: null,
      last_event: null,
      last_action: null,
      last_webhook_timestamp: null,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics',
      resolveTrackedIssues: async () => ({
        kind: 'skip',
        reason: 'dispatch_source_credentials_missing'
      })
    });

    await expect(service.refresh()).resolves.toBeUndefined();

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'accepted',
      reason: 'provider_issue_rehydration_pending_revalidation',
      issue_updated_at: '2026-03-19T04:21:00.000Z'
    });
  });

  it('ignores accepted Todo issues when any blocker is still non-terminal', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        state: 'Todo',
        state_type: 'unstarted',
        blocked_by: [
          {
            id: 'lin-blocker-1',
            identifier: 'CO-9',
            state: 'In Progress'
          }
        ]
      }),
      deliveryId: 'delivery-todo-blocked',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_010_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_todo_blocked_by_non_terminal'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'ignored',
      reason: 'provider_issue_todo_blocked_by_non_terminal',
      issue_state: 'Todo',
      issue_state_type: 'unstarted'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('accepts Todo issues when blockers use custom completed names with terminal state types', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        state: 'Todo',
        state_type: 'unstarted',
        blocked_by: [
          {
            id: 'lin-blocker-1',
            identifier: 'CO-9',
            state: 'Ready for Release',
            state_type: 'completed'
          }
        ]
      }),
      deliveryId: 'delivery-todo-terminal-blocker',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_015_000
    });

    expect(result.kind).toBe('start');
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:00:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      issue_state: 'Todo',
      issue_state_type: 'unstarted'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('accepts Merging and Rework as active workflow states', async () => {
    for (const workflowState of ['Merging', 'Rework']) {
      const { paths } = await createHostPaths();
      const state = createProviderIntakeState();
      const persist = vi.fn(async () => undefined);
      const launcher = {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      };

      const service = createProviderIssueHandoffService({
        paths,
        state,
        persist,
        launcher,
        startPipelineId: 'diagnostics'
      });

      const result = await service.handleAcceptedTrackedIssue({
        trackedIssue: createTrackedIssue({
          state: workflowState,
          state_type: 'started'
        }),
        deliveryId: `delivery-${workflowState.toLowerCase().replace(/\s+/gu, '-')}`,
        event: 'Issue',
        action: 'update',
        webhookTimestamp: 1_742_360_020_000
      });

      expect(result.kind).toBe('start');
      expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
        taskId: 'linear-lin-issue-1',
        pipelineId: 'diagnostics',
        provider: 'linear',
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-2',
        issueUpdatedAt: '2026-03-19T04:00:00.000Z',
        launchToken: expect.any(String)
      }));
      expect(launcher.resume).not.toHaveBeenCalled();
      expect(state.claims[0]).toMatchObject({
        state: 'starting',
        issue_state: workflowState,
        issue_state_type: 'started'
      });
      expect(persist).toHaveBeenCalledTimes(1);
    }
  });

  it('accepts custom started states when they are non-terminal and not a review handoff alias', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        state: 'QA Ready',
        state_type: 'started'
      }),
      deliveryId: 'delivery-started-custom-state',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_020_250
    });

    expect(result.kind).toBe('start');
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:00:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      issue_state: 'QA Ready',
      issue_state_type: 'started'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it.each(['Human Review', 'In Review'])(
    'ignores %s issues even when Linear marks them started',
    async (reviewState) => {
      const { paths } = await createHostPaths();
      const state = createProviderIntakeState();
      const persist = vi.fn(async () => undefined);
      const launcher = {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      };

      const service = createProviderIssueHandoffService({
        paths,
        state,
        persist,
        launcher,
        startPipelineId: 'diagnostics'
      });

      const result = await service.handleAcceptedTrackedIssue({
        trackedIssue: createTrackedIssue({
          state: reviewState,
          state_type: 'started'
        }),
        deliveryId: `delivery-${reviewState.toLowerCase().replace(/\s+/gu, '-')}-started`,
        event: 'Issue',
        action: 'update',
        webhookTimestamp: 1_742_360_020_500
      });

      expect(result).toMatchObject({
        kind: 'ignored',
        reason: 'provider_issue_state_not_active'
      });
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
      expect(state.claims[0]).toMatchObject({
        state: 'ignored',
        reason: 'provider_issue_state_not_active',
        issue_state: reviewState,
        issue_state_type: 'started'
      });
      expect(persist).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['Human Review', 'In Review'])(
    'releases an active run promptly when a direct webhook moves the issue to %s',
    async (reviewState) => {
      const { root, paths } = await createHostPaths();
      const otherEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'task-webhook-review-release-other-pipeline'
      };
      const otherPaths = resolveRunPaths(otherEnv, 'run-webhook-review-release-other-pipeline');
      await mkdir(otherPaths.runDir, { recursive: true });
      await writeFile(
        otherPaths.manifestPath,
        JSON.stringify({
          run_id: 'run-webhook-review-release-other-pipeline',
          task_id: 'task-webhook-review-release-other-pipeline',
          pipeline_id: 'provider-linear-worker',
          status: 'in_progress',
          issue_provider: 'linear',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_updated_at: '2026-03-19T04:20:00.000Z',
          updated_at: '2026-03-19T04:31:00.000Z'
        }),
        'utf8'
      );
      const otherEndpoint = await createControlEndpointServer();
      await writeFile(
        join(otherPaths.runDir, 'control_endpoint.json'),
        JSON.stringify({
          base_url: otherEndpoint.baseUrl,
          token_path: 'control_auth.json'
        }),
        'utf8'
      );
      await writeFile(otherPaths.controlAuthPath, JSON.stringify({ token: 'other-child-token' }), 'utf8');

      const childEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'task-webhook-review-release'
      };
      const childPaths = resolveRunPaths(childEnv, 'run-webhook-review-release');
      await mkdir(childPaths.runDir, { recursive: true });
      await writeFile(
        childPaths.manifestPath,
        JSON.stringify({
          run_id: 'run-webhook-review-release',
          task_id: 'task-webhook-review-release',
          pipeline_id: 'diagnostics',
          status: 'in_progress',
          issue_provider: 'linear',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_updated_at: '2026-03-19T04:20:00.000Z',
          workspace_path: join(root, '.workspaces', 'task-webhook-review-release'),
          updated_at: '2026-03-19T04:30:00.000Z'
        }),
        'utf8'
      );
      const endpoint = await createControlEndpointServer();
      await writeFile(
        join(childPaths.runDir, 'control_endpoint.json'),
        JSON.stringify({
          base_url: endpoint.baseUrl,
          token_path: 'control_auth.json'
        }),
        'utf8'
      );
      await writeFile(childPaths.controlAuthPath, JSON.stringify({ token: 'child-token' }), 'utf8');

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
        task_id: 'task-webhook-review-release',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_run_already_active',
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: 'delivery-in-progress',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_049_000,
        run_id: 'run-webhook-review-release',
        run_manifest_path: childPaths.manifestPath,
        launch_source: 'control-host',
        launch_token: 'webhook-review-release-token'
      });

      const persist = vi.fn(async () => undefined);
      const launcher = {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      };

      const service = createProviderIssueHandoffService({
        paths,
        state,
        persist,
        launcher,
        startPipelineId: 'diagnostics'
      });

      try {
        const result = await service.handleAcceptedTrackedIssue({
          trackedIssue: createTrackedIssue({
            state: reviewState,
            state_type: 'started',
            updated_at: '2026-03-19T04:30:00.000Z'
          }),
          deliveryId: `delivery-${reviewState.toLowerCase().replace(/\s+/gu, '-')}-webhook-release`,
          event: 'Issue',
          action: 'update',
          webhookTimestamp: 1_742_360_050_500
        });

        expect(result).toMatchObject({
          kind: 'ignored',
          reason: 'provider_issue_released:not_active'
        });
        await vi.waitFor(() => {
          expect(endpoint.actions).toEqual([
            expect.objectContaining({
              action: 'cancel',
              reason: 'provider_issue_released:not_active'
            })
          ]);
        });
        expect(otherEndpoint.actions).toEqual([]);
      } finally {
        await endpoint.close();
        await otherEndpoint.close();
      }

      expect(state.claims[0]).toMatchObject({
        state: 'released',
        reason: 'provider_issue_released:not_active',
        issue_state: reviewState,
        issue_state_type: 'started',
        run_id: 'run-webhook-review-release',
        run_manifest_path: childPaths.manifestPath
      });
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
    }
  );

  it('preserves a foreign-pipeline active claim when a direct webhook moves the issue to Human Review', async () => {
    const { root, paths } = await createHostPaths();
    const otherEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-webhook-review-foreign-pipeline'
    };
    const otherPaths = resolveRunPaths(otherEnv, 'run-webhook-review-foreign-pipeline');
    await mkdir(otherPaths.runDir, { recursive: true });
    await writeFile(
      otherPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-webhook-review-foreign-pipeline',
        task_id: 'task-webhook-review-foreign-pipeline',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    const otherEndpoint = await createControlEndpointServer();
    await writeFile(
      join(otherPaths.runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: otherEndpoint.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(otherPaths.controlAuthPath, JSON.stringify({ token: 'other-child-token' }), 'utf8');

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
      task_id: 'task-webhook-review-foreign-pipeline',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_run_already_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-in-progress',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_049_000,
      run_id: 'run-webhook-review-foreign-pipeline',
      run_manifest_path: otherPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'webhook-review-foreign-pipeline-token'
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    try {
      const result = await service.handleAcceptedTrackedIssue({
        trackedIssue: createTrackedIssue({
          state: 'Human Review',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:00.000Z'
        }),
        deliveryId: 'delivery-human-review-foreign-pipeline',
        event: 'Issue',
        action: 'update',
        webhookTimestamp: 1_742_360_050_500
      });

      expect(result).toMatchObject({
        kind: 'ignored',
        reason: 'provider_issue_state_not_active'
      });
      expect(otherEndpoint.actions).toEqual([]);
    } finally {
      await otherEndpoint.close();
    }

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_run_already_active',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      run_id: 'run-webhook-review-foreign-pipeline',
      run_manifest_path: otherPaths.manifestPath
    });
    expect(persist).not.toHaveBeenCalled();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('accepts started issues when the provider state name is missing', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        state: null,
        state_type: 'started'
      }),
      deliveryId: 'delivery-started-null-state',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_021_000
    });

    expect(result.kind).toBe('start');
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:00:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      issue_state: null,
      issue_state_type: 'started'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('captures the started run identity immediately while keeping the handoff inflight until rehydrate confirms activity', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const publishRuntime = vi.fn();
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-child',
        manifestPath: '/tmp/provider-run/manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      publishRuntime
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue(),
      deliveryId: 'delivery-1b',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_100_000
    });

    expect(result.kind).toBe('start');
    expect(state.claims[0]).toMatchObject({
      provider_key: 'linear:lin-issue-1',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-child',
      run_manifest_path: '/tmp/provider-run/manifest.json',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
    expect(result.claim).toMatchObject({
      state: 'starting',
      run_id: 'run-child',
      run_manifest_path: '/tmp/provider-run/manifest.json'
    });
    expect(persist).toHaveBeenCalledTimes(2);
    expect(publishRuntime).toHaveBeenCalledWith('provider-intake.start');
  });

  it('still queues best-effort rehydrate when post-start runtime publication throws', async () => {
    vi.useFakeTimers();

    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const publishRuntime = vi.fn(() => {
      throw new Error('publish failed');
    });
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-child',
        manifestPath: '/tmp/provider-run/manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      publishRuntime
    });

    await expect(
      service.handleAcceptedTrackedIssue({
        trackedIssue: createTrackedIssue(),
        deliveryId: 'delivery-1c',
        event: 'Issue',
        action: 'update',
        webhookTimestamp: 1_742_360_200_000
      })
    ).rejects.toThrow('publish failed');

    expect(persist).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it('keeps a manifest-observed start claim inflight so repeat deliveries do not launch a duplicate run', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-child',
        manifestPath: '/tmp/provider-run/manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher
    });

    const first = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue(),
      deliveryId: 'delivery-1b',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_100_000
    });
    const second = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:00:01.000Z'
      }),
      deliveryId: 'delivery-1c',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_101_000
    });

    expect(first.kind).toBe('start');
    expect(second).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_handoff_inflight'
    });
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_handoff_inflight',
      run_id: 'run-child',
      run_manifest_path: '/tmp/provider-run/manifest.json'
    });
    expect(launcher.start).toHaveBeenCalledTimes(1);
  });

  it('persists a resuming claim before resuming the latest failed run for the same provider issue', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-child'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'task-1303-child',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => {
        expect(state.claims[0]).toMatchObject({
          state: 'resumable',
          run_id: 'run-child',
          task_id: 'task-1303-child'
        });
      })
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      deliveryId: 'delivery-2',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_361_000_000
    });

    expect(result.kind).toBe('ignored');
    expect(result.reason).toBe('provider_issue_rehydrated_resumable_run');
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      run_id: 'run-child',
      run_manifest_path: childPaths.manifestPath,
      task_id: 'task-1303-child',
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: expect.any(String),
      retry_error: null
    });
    expect(Number.isFinite(Date.parse(state.claims[0]?.retry_due_at ?? ''))).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('keeps a queued child run tied to an in-flight handoff instead of launching a duplicate start', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-child'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'task-1303-child',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:20:00.000Z'
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
      task_id: 'task-1303-child',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_rehydrated_queued_run',
      accepted_at: '2026-03-19T04:20:00.000Z',
      updated_at: '2026-03-19T04:20:00.000Z',
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-child',
      run_manifest_path: childPaths.manifestPath
    });
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:21:00.000Z'
      }),
      deliveryId: 'delivery-queued',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_100_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_handoff_inflight'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_handoff_inflight',
      run_id: 'run-child',
      run_manifest_path: childPaths.manifestPath,
      task_id: 'task-1303-child'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('prefers an in-progress child run over a newer queued child run during duplicate-event discovery', async () => {
    const { root, paths } = await createHostPaths();
    const activeEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active'
    };
    const queuedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-queued'
    };
    const activePaths = resolveRunPaths(activeEnv, 'run-active');
    const queuedPaths = resolveRunPaths(queuedEnv, 'run-queued');
    await mkdir(activePaths.runDir, { recursive: true });
    await mkdir(queuedPaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'task-1303-active',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:20:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      queuedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-queued',
        task_id: 'task-1303-queued',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:21:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:22:00.000Z'
      }),
      deliveryId: 'delivery-mixed-active',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_200_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_run_already_active'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_run_already_active',
      run_id: 'run-active',
      run_manifest_path: activePaths.manifestPath,
      task_id: 'task-1303-active'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('launches a new start when the only active child run belongs to a different pipeline during duplicate-event discovery', async () => {
    const { root, paths } = await createHostPaths();
    const activeEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1318-other-pipeline'
    };
    const activePaths = resolveRunPaths(activeEnv, 'run-other-pipeline');
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-other-pipeline',
        task_id: 'task-1318-other-pipeline',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:20:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-started',
        manifestPath: '/tmp/provider-run/run-started-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:22:00.000Z'
      }),
      deliveryId: 'delivery-other-pipeline-active',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_200_500
    });

    expect(result).toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:22:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_start_launched',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-started',
      run_manifest_path: '/tmp/provider-run/run-started-manifest.json',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it('reattaches a legacy active child run without pipeline_id during duplicate-event discovery', async () => {
    const { root, paths } = await createHostPaths();
    const activeEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-legacy-no-pipeline'
    };
    const activePaths = resolveRunPaths(activeEnv, 'run-legacy-active');
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-legacy-active',
        task_id: 'task-legacy-no-pipeline',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:20:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'provider-linear-worker'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:22:00.000Z'
      }),
      deliveryId: 'delivery-legacy-active',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_200_500
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_run_already_active'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_run_already_active',
      run_id: 'run-legacy-active',
      run_manifest_path: activePaths.manifestPath,
      task_id: 'task-legacy-no-pipeline'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('resumes a newer failed child run instead of treating an older queued run as active', async () => {
    const { root, paths } = await createHostPaths();
    const queuedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-queued'
    };
    const failedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-failed'
    };
    const queuedPaths = resolveRunPaths(queuedEnv, 'run-queued');
    const failedPaths = resolveRunPaths(failedEnv, 'run-failed');
    await mkdir(queuedPaths.runDir, { recursive: true });
    await mkdir(failedPaths.runDir, { recursive: true });
    await writeFile(
      queuedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-queued',
        task_id: 'task-1303-queued',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:20:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      failedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-failed',
        task_id: 'task-1303-failed',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:21:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:22:00.000Z'
      }),
      deliveryId: 'delivery-failed-after-queued',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_250_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_rehydrated_resumable_run'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      run_id: 'run-failed',
      run_manifest_path: failedPaths.manifestPath,
      task_id: 'task-1303-failed',
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: expect.any(String),
      retry_error: null
    });
    expect(Number.isFinite(Date.parse(state.claims[0]?.retry_due_at ?? ''))).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('re-reads claim state after async run discovery before launching a duplicate handoff', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    let injectedInflightClaim = false;
    vi.resetModules();
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return {
        ...actual,
        readdir: vi.fn(async () => {
          if (!injectedInflightClaim) {
            injectedInflightClaim = true;
            state.claims.push({
              provider: 'linear',
              provider_key: 'linear:lin-issue-1',
              issue_id: 'lin-issue-1',
              issue_identifier: 'CO-2',
              issue_title: 'Autonomous intake handoff',
              issue_state: 'In Progress',
              issue_state_type: 'started',
              issue_updated_at: '2026-03-19T04:00:00.000Z',
              task_id: 'linear-lin-issue-1',
              mapping_source: 'provider_id_fallback',
              state: 'starting',
              reason: 'provider_issue_start_launched',
              accepted_at: '2026-03-19T04:00:00.000Z',
              updated_at: '2026-03-19T04:00:00.000Z',
              last_delivery_id: 'delivery-1',
              last_event: 'Issue',
              last_action: 'update',
              last_webhook_timestamp: 1_742_360_000_000,
              run_id: null,
              run_manifest_path: null
            });
          }
          return [];
        })
      };
    });

    try {
      const { createProviderIssueHandoffService: createProviderIssueHandoffServiceWithMockedDiscovery } =
        await import('../src/cli/control/providerIssueHandoff.js');
      const service = createProviderIssueHandoffServiceWithMockedDiscovery({
        paths,
        state,
        persist,
        launcher,
        startPipelineId: 'diagnostics'
      });

      const result = await service.handleAcceptedTrackedIssue({
        trackedIssue: createTrackedIssue(),
        deliveryId: 'delivery-2',
        event: 'Issue',
        action: 'update',
        webhookTimestamp: 1_742_361_000_000
      });

      expect(result).toMatchObject({
        kind: 'ignored',
        reason: 'provider_issue_handoff_inflight'
      });
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
      expect(state.claims[0]).toMatchObject({
        provider_key: 'linear:lin-issue-1',
        state: 'starting',
        reason: 'provider_issue_handoff_inflight'
      });
    } finally {
      vi.doUnmock('node:fs/promises');
      vi.resetModules();
    }
  });

  it('keeps a start claim in-flight when the first rehydrate probe finds no child run', async () => {
    const scheduledCallbacks: Array<() => void> = [];
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      ((callback: TimerHandler) => {
        if (typeof callback === 'function') {
          scheduledCallbacks.push(callback as () => void);
        }
        return {
          unref() {
            return this;
          }
        } as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout
    );

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-child'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const publishRuntime = vi.fn();
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      publishRuntime
    });

    await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue(),
      deliveryId: 'delivery-3',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_362_000_000
    });

    expect(scheduledCallbacks).toHaveLength(1);
    await service.rehydrate();
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      run_id: null,
      run_manifest_path: null
    });

    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'task-1303-child',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:32:00.000Z'
      }),
      'utf8'
    );

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      run_id: 'run-child',
      run_manifest_path: childPaths.manifestPath,
      task_id: 'task-1303-child'
    });
    expect(publishRuntime).toHaveBeenCalledWith('provider-intake.rehydrate');
  });

  it('keeps queued child runs pending during explicit restart rehydrate', async () => {
    const scheduledCallbacks: Array<() => void> = [];
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      ((callback: TimerHandler) => {
        if (typeof callback === 'function') {
          scheduledCallbacks.push(callback as () => void);
        }
        return {
          unref() {
            return this;
          }
        } as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout
    );

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-child'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'task-1303-child',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:32:00.000Z'
      }),
      'utf8'
    );

    const launchedAt = new Date().toISOString();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: launchedAt,
      updated_at: launchedAt,
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: null,
      run_manifest_path: null
    });
    const persist = vi.fn(async () => undefined);

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_rehydrated_queued_run',
      run_id: 'run-child',
      run_manifest_path: childPaths.manifestPath,
      task_id: 'task-1303-child'
    });
    expect(scheduledCallbacks).toHaveLength(1);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('marks stale queued-only handoffs as handoff_failed during explicit restart rehydrate', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-child'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'task-1303-child',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:32:00.000Z'
      }),
      'utf8'
    );

    const launchedAt = new Date(Date.now() - 60_000).toISOString();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: launchedAt,
      updated_at: launchedAt,
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: null,
      run_manifest_path: null
    });
    const persist = vi.fn(async () => undefined);

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_rehydration_timeout',
      run_id: 'run-child',
      run_manifest_path: childPaths.manifestPath,
      task_id: 'task-1303-child'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('prefers an in-progress child run over a newer queued child run during explicit restart rehydrate', async () => {
    const { root, paths } = await createHostPaths();
    const activeEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active'
    };
    const queuedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-queued'
    };
    const activePaths = resolveRunPaths(activeEnv, 'run-active');
    const queuedPaths = resolveRunPaths(queuedEnv, 'run-queued');
    await mkdir(activePaths.runDir, { recursive: true });
    await mkdir(queuedPaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'task-1303-active',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      queuedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-queued',
        task_id: 'task-1303-queued',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:32:00.000Z'
      }),
      'utf8'
    );

    const launchedAt = new Date().toISOString();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: launchedAt,
      updated_at: launchedAt,
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: null,
      run_manifest_path: null
    });
    const persist = vi.fn(async () => undefined);

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-active',
      run_manifest_path: activePaths.manifestPath,
      task_id: 'task-1303-active'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('keeps a starting claim detached during explicit restart rehydrate when the only active child run belongs to a different pipeline', async () => {
    const { root, paths } = await createHostPaths();
    const activeEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1318-other-pipeline'
    };
    const activePaths = resolveRunPaths(activeEnv, 'run-other-pipeline');
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-other-pipeline',
        task_id: 'task-1318-other-pipeline',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );

    const launchedAt = new Date().toISOString();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: launchedAt,
      updated_at: launchedAt,
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token-1'
    });
    const persist = vi.fn(async () => undefined);

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'diagnostics'
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_start_launched',
      task_id: 'linear-lin-issue-1',
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token-1'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('reattaches a legacy active child run without pipeline_id during explicit restart rehydrate', async () => {
    const { root, paths } = await createHostPaths();
    const activeEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-legacy-no-pipeline'
    };
    const activePaths = resolveRunPaths(activeEnv, 'run-legacy-active');
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-legacy-active',
        task_id: 'task-legacy-no-pipeline',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );

    const launchedAt = new Date().toISOString();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: launchedAt,
      updated_at: launchedAt,
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token-1'
    });
    const persist = vi.fn(async () => undefined);

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'provider-linear-worker'
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      task_id: 'task-legacy-no-pipeline',
      run_id: 'run-legacy-active',
      run_manifest_path: activePaths.manifestPath
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('prefers a newer failed child run over an older queued child run during explicit restart rehydrate', async () => {
    const { root, paths } = await createHostPaths();
    const queuedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-queued'
    };
    const failedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-failed'
    };
    const queuedPaths = resolveRunPaths(queuedEnv, 'run-queued');
    const failedPaths = resolveRunPaths(failedEnv, 'run-failed');
    await mkdir(queuedPaths.runDir, { recursive: true });
    await mkdir(failedPaths.runDir, { recursive: true });
    await writeFile(
      queuedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-queued',
        task_id: 'task-1303-queued',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:20:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      failedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-failed',
        task_id: 'task-1303-failed',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:21:00.000Z'
      }),
      'utf8'
    );

    const launchedAt = new Date(Date.now() - 60_000).toISOString();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: launchedAt,
      updated_at: launchedAt,
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: null,
      run_manifest_path: null
    });
    const persist = vi.fn(async () => undefined);

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      run_id: 'run-failed',
      run_manifest_path: failedPaths.manifestPath,
      task_id: 'task-1303-failed'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('preserves launch provenance when rehydrate only backfills the manifest path for the same run id', async () => {
    const { root, paths } = await createHostPaths();
    const activeEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active'
    };
    const activePaths = resolveRunPaths(activeEnv, 'run-active');
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'task-1303-active',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:32:00.000Z'
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
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'task-1303-active',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: '2026-03-19T04:00:00.000Z',
      updated_at: '2026-03-19T04:20:00.000Z',
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: 'run-active',
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token-1'
    });
    const persist = vi.fn(async () => undefined);

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      task_id: 'task-1303-active',
      run_id: 'run-active',
      run_manifest_path: activePaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'launch-token-1'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('clears launch provenance when rehydrate binds the claim to a different child run identity', async () => {
    const { root, paths } = await createHostPaths();
    const oldEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-old'
    };
    const newEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-new'
    };
    const oldPaths = resolveRunPaths(oldEnv, 'run-old');
    const newPaths = resolveRunPaths(newEnv, 'run-new');
    await mkdir(oldPaths.runDir, { recursive: true });
    await mkdir(newPaths.runDir, { recursive: true });
    await writeFile(
      oldPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-old',
        task_id: 'task-1303-old',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:20:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      newPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-new',
        task_id: 'task-1303-new',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:21:00.000Z'
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
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'task-1303-old',
      mapping_source: 'provider_id_fallback',
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      accepted_at: '2026-03-19T04:00:00.000Z',
      updated_at: '2026-03-19T04:20:00.000Z',
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: 'run-old',
      run_manifest_path: oldPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'launch-token-old'
    });
    const persist = vi.fn(async () => undefined);

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      task_id: 'task-1303-new',
      run_id: 'run-new',
      run_manifest_path: newPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('marks stale in-flight claims as handoff_failed during explicit restart rehydrate', async () => {
    const { paths } = await createHostPaths();
    const launchedAt = new Date(Date.now() - 60_000).toISOString();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: launchedAt,
      updated_at: launchedAt,
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: null,
      run_manifest_path: null
    });
    const persist = vi.fn(async () => undefined);

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_rehydration_timeout'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('surfaces manifest parse errors instead of treating them as missing runs', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-child'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(childPaths.manifestPath, '{not-json', 'utf8');

    const service = createProviderIssueHandoffService({
      paths,
      state: createProviderIntakeState(),
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await expect(service.rehydrate()).rejects.toThrow();
  });

  it('leaves a newer active webhook pending refresh when the latest discovered run already succeeded', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:20:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:21:00.000Z'
      }),
      deliveryId: 'delivery-completed-restart',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_100_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_post_worker_exit_refresh_pending'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'accepted',
      reason: 'provider_issue_post_worker_exit_refresh_pending',
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      task_id: 'task-1303-completed',
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: expect.any(String),
      retry_error: null
    });
    expect(Number.isFinite(Date.parse(state.claims[0]?.retry_due_at ?? ''))).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('repairs a persisted accepted retry deadline during rehydrate so startup rebuild regains a live owner', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

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
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'accepted',
      reason: 'provider_issue_post_worker_exit_refresh_pending',
      accepted_at: '2026-03-19T04:21:05.000Z',
      updated_at: '2026-03-19T04:21:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: '/tmp/provider-run/missing-manifest.json',
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: 'not-a-date',
      retry_error: null
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-rebuilt',
        manifestPath: '/tmp/provider-run/rebuilt-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'accepted',
      reason: 'provider_issue_post_worker_exit_refresh_pending',
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: expect.any(String),
      retry_error: null
    });
    expect(state.claims[0]?.retry_due_at).not.toBe('not-a-date');
    expect(Number.isFinite(Date.parse(state.claims[0]?.retry_due_at ?? ''))).toBe(true);

    await vi.advanceTimersByTimeAsync(1_001);
    await flushAsyncWork();
    await waitForMockCalls(launcher.start, 1, 1024);

    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(launcher.start.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:21:00.000Z',
      launchToken: expect.any(String)
    }));
  });

  it('repairs a persisted accepted retry deadline during rehydrate even when the queued retry has no recorded attempt yet', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

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
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'accepted',
      reason: 'provider_issue_post_worker_exit_refresh_pending',
      accepted_at: '2026-03-19T04:21:05.000Z',
      updated_at: '2026-03-19T04:21:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: '/tmp/provider-run/missing-manifest.json',
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: null,
      retry_due_at: 'not-a-date',
      retry_error: null
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-rebuilt',
        manifestPath: '/tmp/provider-run/rebuilt-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'accepted',
      reason: 'provider_issue_post_worker_exit_refresh_pending',
      retry_queued: true,
      retry_attempt: null,
      retry_due_at: expect.any(String),
      retry_error: null
    });
    expect(state.claims[0]?.retry_due_at).not.toBe('not-a-date');
    expect(Number.isFinite(Date.parse(state.claims[0]?.retry_due_at ?? ''))).toBe(true);

    await vi.advanceTimersByTimeAsync(1_001);
    await flushAsyncWork();
    await waitForMockCalls(launcher.start, 1, 1024);

    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(launcher.start.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:21:00.000Z',
      launchToken: expect.any(String)
    }));
  });

  it('holds an explicitly queued post-worker-exit retry until due_at and preserves the attempt when the retry queue launches it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_post_worker_exit_start_failed:worker owner continuation unavailable',
      accepted_at: '2026-03-19T04:21:05.000Z',
      updated_at: '2026-03-19T04:21:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'post-worker-exit-retry-token',
      retry_queued: true,
      retry_attempt: 2,
      retry_due_at: '2026-03-19T04:30:10.000Z',
      retry_error: 'worker owner continuation unavailable'
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-continuation',
        manifestPath: '/tmp/provider-run/continuation-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          updated_at: '2026-03-19T04:21:00.000Z'
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_post_worker_exit_start_failed:worker owner continuation unavailable',
      retry_queued: true,
      retry_attempt: 2,
      retry_due_at: '2026-03-19T04:30:10.000Z',
      retry_error: 'worker owner continuation unavailable'
    });

    await vi.advanceTimersByTimeAsync(9_000);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_001);
    await flushAsyncWork();
    await waitForMockCalls(launcher.start, 1, 1024);

    expect(launcher.start.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:21:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_post_worker_exit_start_launched',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-continuation',
      run_manifest_path: '/tmp/provider-run/continuation-manifest.json',
      retry_queued: false,
      retry_attempt: 2,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('cancels and replaces queued retry ownership when a newer persisted due_at supersedes an older timer', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:21:05.000Z',
      updated_at: '2026-03-19T04:21:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:05.000Z',
      retry_error: null
    });

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-replaced',
        manifestPath: '/tmp/provider-run/replaced-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          updated_at: '2026-03-19T04:21:00.000Z'
        })
      })
    });

    await service.rehydrate();

    state.claims[0] = {
      ...state.claims[0]!,
      retry_due_at: '2026-03-19T04:30:10.000Z'
    };

    await service.rehydrate();

    await vi.advanceTimersByTimeAsync(5_001);
    expect(launcher.start).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5_001);
    await flushAsyncWork();
    await waitForMockCalls(launcher.start);
    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(launcher.start.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:21:00.000Z',
      launchToken: expect.any(String)
    }));
  });

  it('persists blocker metadata for queued retries before a restart falls back to snapshot-only dispatch', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      issue_state: 'Todo',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      issue_blocked_by: null,
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:21:05.000Z',
      updated_at: '2026-03-19T04:21:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:01.000Z',
      retry_error: null
    });

    let persistedState = normalizeProviderIntakeState(
      JSON.parse(JSON.stringify(state)) as ProviderIntakeState
    );
    const persist = vi.fn(async () => {
      persistedState = normalizeProviderIntakeState(
        JSON.parse(JSON.stringify(state)) as ProviderIntakeState
      );
    });

    const liveService = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Todo',
          state_type: 'unstarted',
          updated_at: '2026-03-19T04:21:00.000Z',
          blocked_by: [
            {
              id: 'lin-blocker-1',
              identifier: 'CO-9',
              state: 'In Progress',
              state_type: 'started'
            }
          ]
        })
      })
    });

    await liveService.refresh();

    expect(persist).toHaveBeenCalled();
    expect(persistedState.claims[0]?.issue_blocked_by).toEqual([
      {
        id: 'lin-blocker-1',
        identifier: 'CO-9',
        state: 'In Progress',
        state_type: 'started'
      }
    ]);

    const restartedLauncher = {
      start: vi.fn(async () => ({
        runId: 'run-restarted',
        manifestPath: '/tmp/provider-run/restarted-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    createProviderIssueHandoffService({
      paths,
      state: persistedState,
      persist: vi.fn(async () => undefined),
      launcher: restartedLauncher,
      startPipelineId: 'diagnostics'
    });

    await vi.advanceTimersByTimeAsync(1_001);
    await flushAsyncWork();
    await waitForCondition(
      () =>
        persistedState.claims[0]?.state === 'released' &&
        persistedState.claims[0]?.reason === 'provider_issue_released:todo_blocked_by_non_terminal'
    );

    expect(restartedLauncher.start).not.toHaveBeenCalled();
    expect(restartedLauncher.resume).not.toHaveBeenCalled();
  });

  it('rebuilds queued retry ownership on rehydrate and dispatches exactly once while a refresh overlaps the due-boundary launch', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:21:05.000Z',
      updated_at: '2026-03-19T04:21:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:01.000Z',
      retry_error: null
    });

    let resolveStart: (() => void) | null = null;
    const launcher = {
      start: vi.fn(
        () =>
          new Promise<{ runId: string; manifestPath: string }>((resolve) => {
            resolveStart = () =>
              resolve({
                runId: 'run-rehydrated',
                manifestPath: '/tmp/provider-run/rehydrated-manifest.json'
              });
          })
      ),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          updated_at: '2026-03-19T04:21:00.000Z'
        })
      })
    });

    await service.rehydrate();

    await vi.advanceTimersByTimeAsync(1_001);
    await flushAsyncWork();
    await waitForMockCalls(launcher.start, 1, 1024);

    const refreshPromise = service.refresh();
    await flushAsyncWork();

    resolveStart?.();
    await refreshPromise;
    await flushAsyncWork();

    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(launcher.start.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:21:00.000Z',
      launchToken: expect.any(String)
    }));
  });

  it('dispatches persisted queued retries after the first refresh without an explicit rehydrate', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:21:05.000Z',
      updated_at: '2026-03-19T04:21:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:01.000Z',
      retry_error: null
    });

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-continuation',
        manifestPath: '/tmp/provider-run/continuation-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          updated_at: '2026-03-19T04:21:00.000Z'
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_001);
    await flushAsyncWork();
    await waitForMockCalls(launcher.start, 1, 1024);

    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(launcher.start.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        taskId: 'linear-lin-issue-1',
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-2'
      })
    );
  });

  it('releases snapshot-only Todo retries when persisted blocker metadata is still non-terminal', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      issue_state: 'Todo',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      issue_blocked_by: [
        {
          id: 'lin-blocker-1',
          identifier: 'CO-9',
          state: 'In Progress',
          state_type: 'started'
        }
      ],
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:21:05.000Z',
      updated_at: '2026-03-19T04:21:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:01.000Z',
      retry_error: null
    });

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-continuation',
        manifestPath: '/tmp/provider-run/continuation-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics'
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();

    const scheduledTimeoutCount = setTimeoutSpy.mock.calls.length;
    expect(scheduledTimeoutCount).toBe(1);
    const [, delayMs] = setTimeoutSpy.mock.calls[scheduledTimeoutCount - 1] ?? [];
    expect(delayMs).toBeGreaterThanOrEqual(999);
    expect(delayMs).toBeLessThanOrEqual(1_000);
    getLatestScheduledTimeoutCallback(setTimeoutSpy)();
    await flushAsyncWork();
    await waitForCondition(
      () =>
        state.claims[0]?.state === 'released' &&
        state.claims[0]?.reason === 'provider_issue_released:todo_blocked_by_non_terminal'
    );

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]?.retry_queued).toBeNull();
    expect(state.claims[0]?.retry_due_at).toBeNull();
  });

  it('continues snapshot-only Todo retries when persisted blocker metadata is terminal', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      issue_state: 'Todo',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      issue_blocked_by: [
        {
          id: 'lin-blocker-1',
          identifier: 'CO-9',
          state: 'Done',
          state_type: 'completed'
        }
      ],
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:21:05.000Z',
      updated_at: '2026-03-19T04:21:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:01.000Z',
      retry_error: null
    });

    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-continuation',
        manifestPath: '/tmp/provider-run/continuation-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      startPipelineId: 'diagnostics'
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_001);
    await flushAsyncWork();
    await waitForMockCalls(launcher.start, 1, 1024);

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        taskId: 'linear-lin-issue-1',
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-2'
      })
    );
  });

  it('keeps duplicate equal-timestamp deliveries ignored after a succeeded child run', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:20:00.000Z'
      }),
      deliveryId: 'delivery-completed-duplicate',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_100_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_run_already_completed'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_run_already_completed',
      task_id: 'task-1303-completed',
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('keeps restart-time duplicate deliveries ignored when a legacy succeeded manifest lacks issue_updated_at', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        started_at: '2026-03-19T04:05:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:00:00.000Z'
      }),
      deliveryId: 'delivery-completed-legacy-duplicate',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_100_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_run_already_completed'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_run_already_completed',
      task_id: 'task-1303-completed',
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it.each([
    'provider_issue_start_failed:transient launch failure',
    'provider_issue_retry_start_failed:transient launch failure'
  ] as const)('retries a same-timestamp accepted issue after a fresher relaunch claim failed (%s)', async (failureReason) => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: failureReason,
      accepted_at: '2026-03-19T04:21:05.000Z',
      updated_at: '2026-03-19T04:21:10.000Z',
      last_delivery_id: 'delivery-failed-start',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token-failed'
    } satisfies ProviderIntakeState['claims'][number]);

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:21:00.000Z'
      }),
      deliveryId: 'delivery-retry-after-failed-start',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_100_000
    });

    expect(result).toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:21:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_start_launched',
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      task_id: 'linear-lin-issue-1',
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: expect.any(String),
      retry_queued: false,
      retry_attempt: 1,
      retry_due_at: null,
      retry_error: null
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('requeues a queued retry without a recorded attempt after a fresh start failure', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

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
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'accepted',
      reason: 'provider_issue_post_worker_exit_refresh_pending',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-failed-start',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: null,
      retry_due_at: '2026-03-19T04:30:05.000Z',
      retry_error: null
    } satisfies ProviderIntakeState['claims'][number]);

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => {
        throw new Error('transient launch failure');
      }),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    await expect(
      service.handleAcceptedTrackedIssue({
        trackedIssue: createTrackedIssue({
          updated_at: '2026-03-19T04:21:00.000Z'
        }),
        deliveryId: 'delivery-retry-null-attempt-start-failed',
        event: 'Issue',
        action: 'update',
        webhookTimestamp: 1_742_360_100_000
      })
    ).rejects.toThrow('Failed to start provider issue CO-2: provider_issue_start_failed:transient launch failure');

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_start_failed:transient launch failure',
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      task_id: 'linear-lin-issue-1',
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: expect.any(String),
      retry_queued: true,
      retry_attempt: null,
      retry_due_at: expect.any(String),
      retry_error: 'transient launch failure'
    });
    expect(Number.isFinite(Date.parse(state.claims[0]?.retry_due_at ?? ''))).toBe(true);
  });

  it('keeps an in-memory handoff_failed retry state when persisting the failure record fails so a same-timestamp retry can relaunch immediately', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    let persistCallCount = 0;
    const persist = vi.fn(async () => {
      persistCallCount += 1;
      if (persistCallCount === 2) {
        throw new Error('post-failure persist failed');
      }
    });
    const launcher = {
      start: vi
        .fn(async () => null)
        .mockRejectedValueOnce(new Error('transient launch failure'))
        .mockResolvedValueOnce(null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const trackedIssue = createTrackedIssue({
      updated_at: '2026-03-19T04:21:00.000Z'
    });

    await expect(
      service.handleAcceptedTrackedIssue({
        trackedIssue,
        deliveryId: 'delivery-start-failure-persist',
        event: 'Issue',
        action: 'update',
        webhookTimestamp: 1_742_360_100_000
      })
    ).rejects.toThrow('post-failure persist failed');

    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_start_failed:transient launch failure',
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      retry_queued: null,
      retry_error: null
    });

    await expect(
      service.handleAcceptedTrackedIssue({
        trackedIssue,
        deliveryId: 'delivery-start-failure-retry',
        event: 'Issue',
        action: 'update',
        webhookTimestamp: 1_742_360_100_100
      })
    ).resolves.toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });

    expect(launcher.start).toHaveBeenCalledTimes(2);
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_start_launched',
      issue_updated_at: '2026-03-19T04:21:00.000Z',
      retry_queued: null,
      retry_error: null
    });
  });

  it('prefers the fresher discovered completed run timestamp over a stale existing claim', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_run_already_completed',
      accepted_at: '2026-03-19T04:00:10.000Z',
      updated_at: '2026-03-19T04:00:15.000Z',
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath
    } satisfies ProviderIntakeState['claims'][number]);

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:20:00.000Z'
      }),
      deliveryId: 'delivery-completed-fresher-run',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_100_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_run_already_completed'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_run_already_completed',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-completed',
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('keeps completed runs ignored when the next accepted issue is missing updated_at', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: null
      }),
      deliveryId: 'delivery-completed-null-updated-at',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_100_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_run_already_completed'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_run_already_completed',
      task_id: 'task-1303-completed',
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('releases inactive issues on refresh and cancels only the matching-pipeline child run', async () => {
    const { root, paths } = await createHostPaths();
    const queuedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-000-queued'
    };
    const queuedPaths = resolveRunPaths(queuedEnv, 'run-queued');
    await mkdir(queuedPaths.runDir, { recursive: true });
    await writeFile(
      queuedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-queued',
        task_id: 'task-1303-000-queued',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    const queuedEndpoint = await createControlEndpointServer();
    await writeFile(
      join(queuedPaths.runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: queuedEndpoint.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(queuedPaths.controlAuthPath, JSON.stringify({ token: 'queued-token' }), 'utf8');

    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'task-1303-active',
        pipeline_id: 'diagnostics',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    const endpoint = await createControlEndpointServer();
    await writeFile(
      join(childPaths.runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: endpoint.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(childPaths.controlAuthPath, JSON.stringify({ token: 'child-token' }), 'utf8');
    const workspacePath = resolveProviderWorkspacePath(root, 'task-1303-active');
    await mkdir(workspacePath, { recursive: true });
    await writeFile(join(workspacePath, '.git'), 'gitdir: /tmp/provider-worktree\n', 'utf8');

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
      last_delivery_id: 'delivery-running',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-child',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Done',
          state_type: 'completed'
        })
      })
    });

    try {
      await service.refresh();

      await vi.waitFor(() => {
        expect(endpoint.actions).toEqual([
          expect.objectContaining({
            action: 'cancel',
            reason: 'provider_issue_released:not_active'
          })
        ]);
      });
      expect(queuedEndpoint.actions).toEqual([]);
      expect(state.claims[0]).toMatchObject({
        state: 'released',
        reason: 'provider_issue_released:not_active',
        issue_state: 'Done',
        issue_state_type: 'completed',
        run_id: 'run-child',
        run_manifest_path: childPaths.manifestPath
      });
      await expect(access(workspacePath)).resolves.toBeUndefined();
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
    } finally {
      await endpoint.close();
      await queuedEndpoint.close();
    }
  });

  it('releases inactive issues on refresh and cancels a queued child run before it becomes active', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-queued'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-queued');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
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
    const endpoint = await createControlEndpointServer();
    await writeFile(
      join(childPaths.runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: endpoint.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(childPaths.controlAuthPath, JSON.stringify({ token: 'child-token' }), 'utf8');

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Todo',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-queued',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-queued',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-queued',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'queued-launch-token'
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Done',
          state_type: 'completed'
        })
      })
    });

    try {
      await service.refresh();
      await vi.waitFor(() => {
        expect(endpoint.actions).toEqual([
          expect.objectContaining({
            action: 'cancel',
            reason: 'provider_issue_released:not_active'
          })
        ]);
      });
    } finally {
      await endpoint.close();
    }

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: 'run-queued',
      run_manifest_path: childPaths.manifestPath
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('releases blocked Todo issues without cleaning their provider workspace', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-blocked'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-blocked');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-blocked',
        task_id: 'task-1303-blocked',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        workspace_path: join(root, '.workspaces', 'task-1303-blocked'),
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    const endpoint = await createControlEndpointServer();
    await writeFile(
      join(childPaths.runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: endpoint.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(childPaths.controlAuthPath, JSON.stringify({ token: 'child-token' }), 'utf8');
    const workspacePath = resolveProviderWorkspacePath(root, 'task-1303-blocked');
    await mkdir(workspacePath, { recursive: true });
    await writeFile(join(workspacePath, '.git'), 'gitdir: /tmp/provider-worktree\n', 'utf8');

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Todo',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-blocked',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-blocked',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-blocked',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'blocked-launch-token'
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Todo',
          state_type: 'unstarted',
          blocked_by: [
            {
              id: 'lin-blocker-1',
              identifier: 'CO-9',
              state: 'In Progress'
            }
          ]
        })
      })
    });

    try {
      await service.refresh();
    } finally {
      await endpoint.close();
    }

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:todo_blocked_by_non_terminal',
      issue_state: 'Todo',
      issue_state_type: 'unstarted',
      run_id: 'run-blocked',
      run_manifest_path: childPaths.manifestPath
    });
    await expect(access(workspacePath)).resolves.toBeUndefined();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it.each(['Human Review', 'In Review'])(
    'releases %s issues without cleaning their provider workspace',
    async (reviewState) => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-human-review'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-human-review');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-human-review',
        task_id: 'task-1303-human-review',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        workspace_path: join(root, '.workspaces', 'task-1303-human-review'),
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    const endpoint = await createControlEndpointServer();
    await writeFile(
      join(childPaths.runDir, 'control_endpoint.json'),
      JSON.stringify({
        base_url: endpoint.baseUrl,
        token_path: 'control_auth.json'
      }),
      'utf8'
    );
    await writeFile(childPaths.controlAuthPath, JSON.stringify({ token: 'child-token' }), 'utf8');
    const workspacePath = resolveProviderWorkspacePath(root, 'task-1303-human-review');
    await mkdir(workspacePath, { recursive: true });
    await writeFile(join(workspacePath, '.git'), 'gitdir: /tmp/provider-worktree\n', 'utf8');

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
      task_id: 'task-1303-human-review',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-human-review',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-human-review',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'human-review-launch-token'
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: reviewState,
          state_type: 'started'
        })
      })
    });

    try {
      await service.refresh();
      await vi.waitFor(() => {
        expect(endpoint.actions).toEqual([
          expect.objectContaining({
            action: 'cancel',
            reason: 'provider_issue_released:not_active'
          })
        ]);
      });
    } finally {
      await endpoint.close();
    }

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_state: reviewState,
      issue_state_type: 'started',
      run_id: 'run-human-review',
      run_manifest_path: childPaths.manifestPath
    });
    await expect(access(workspacePath)).resolves.toBeUndefined();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    }
  );

  it('keeps manifest-less starting claim workspaces intact when refresh releases them', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'task-1303-manifestless';
    const workspacePath = resolveProviderWorkspacePath(root, taskId);
    await mkdir(workspacePath, { recursive: true });
    await writeFile(join(workspacePath, '.git'), 'gitdir: /tmp/provider-worktree\n', 'utf8');

    const now = new Date().toISOString();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: now,
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: now,
      updated_at: now,
      last_delivery_id: 'delivery-manifestless',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'manifestless-launch-token'
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Done',
          state_type: 'completed'
        })
      })
    });

    await service.refresh();

    await expect(access(workspacePath)).resolves.toBeUndefined();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: taskId,
      run_id: null,
      run_manifest_path: null
    });
  });

  it.each([
    ['starting', 'provider_issue_start_launched'],
    ['resuming', 'provider_issue_resume_launched']
  ] as const)(
    'rehydrates a manifest-less %s claim to completed when the child run finished after the launch timestamp',
    async (claimState, claimReason) => {
      const { root, paths } = await createHostPaths();
      const taskId = 'linear-lin-issue-1';
      const childEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId
      };
      const childPaths = resolveRunPaths(childEnv, 'run-fresh-completed');
      await mkdir(childPaths.runDir, { recursive: true });
      await writeFile(
        childPaths.manifestPath,
        JSON.stringify({
          run_id: 'run-fresh-completed',
          task_id: taskId,
          status: 'succeeded',
          issue_provider: 'linear',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_updated_at: '2026-03-19T04:45:00.000Z',
          updated_at: '2026-03-19T04:46:00.000Z'
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
        issue_updated_at: '2026-03-19T04:40:00.000Z',
        task_id: taskId,
        mapping_source: 'provider_id_fallback',
        state: claimState,
        reason: claimReason,
        accepted_at: '2026-03-19T04:40:00.000Z',
        updated_at: '2026-03-19T04:40:00.000Z',
        last_delivery_id: `delivery-${claimState}-fresh-completed`,
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_050_000,
        run_id: null,
        run_manifest_path: null,
        launch_source: 'control-host',
        launch_token: `${claimState}-fresh-completed-token`
      });

      const persist = vi.fn(async () => undefined);
      const service = createProviderIssueHandoffService({
        paths,
        state,
        persist,
        launcher: {
          start: vi.fn(async () => null),
          resume: vi.fn(async () => undefined)
        }
      });

      await service.rehydrate();

      expect(state.claims[0]).toMatchObject({
        state: 'completed',
        reason: 'provider_issue_rehydrated_completed_run',
        task_id: taskId,
        run_id: 'run-fresh-completed',
        run_manifest_path: childPaths.manifestPath
      });
    }
  );

  it.each([
    ['starting', 'provider_issue_start_launched'],
    ['resuming', 'provider_issue_resume_launched']
  ] as const)(
    'keeps manifest-less %s claims detached from historical succeeded runs when refresh releases them',
    async (claimState, claimReason) => {
      const { root, paths } = await createHostPaths();
      const taskId = 'linear-lin-issue-1';

      const childEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId
      };
      const childPaths = resolveRunPaths(childEnv, 'run-completed');
      const historicalManifest = JSON.stringify({
        run_id: 'run-completed',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      });

      const now = '2026-03-19T04:40:00.000Z';
      const state = createProviderIntakeState();
      state.claims.push({
        provider: 'linear',
        provider_key: 'linear:lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_title: 'Autonomous intake handoff',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: now,
        task_id: taskId,
        mapping_source: 'provider_id_fallback',
        state: claimState,
        reason: claimReason,
        accepted_at: now,
        updated_at: now,
        last_delivery_id: `delivery-${claimState}`,
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_050_000,
        run_id: null,
        run_manifest_path: null,
        launch_source: 'control-host',
        launch_token: `${claimState}-launch-token`
      });

      let persistCallCount = 0;
      const persist = vi.fn(async () => {
        persistCallCount += 1;
        if (persistCallCount === 1) {
          await mkdir(childPaths.runDir, { recursive: true });
          await writeFile(childPaths.manifestPath, historicalManifest, 'utf8');
        }
      });
      const launcher = {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      };

      const service = createProviderIssueHandoffService({
        paths,
        state,
        persist,
        launcher,
        resolveTrackedIssue: async () => ({
          kind: 'ready',
          trackedIssue: createTrackedIssue({
            state: 'Done',
            state_type: 'completed'
          })
        })
      });

      await service.refresh();

      expect(state.claims[0]).toMatchObject({
        state: 'released',
        reason: 'provider_issue_released:not_active',
        task_id: taskId,
        run_id: null,
        run_manifest_path: null
      });
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
    }
  );

  it('persists the release even when cancelling an inactive queued child run fails closed', async () => {
    const { root, paths } = await createHostPaths();
    const now = new Date().toISOString();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-queued'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-queued');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
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

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Todo',
      issue_state_type: 'unstarted',
      issue_updated_at: now,
      task_id: 'task-1303-queued',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: now,
      updated_at: now,
      last_delivery_id: 'delivery-queued',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-queued',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'queued-launch-token'
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Done',
          state_type: 'completed'
        })
      })
    });

    await service.refresh();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: 'run-queued',
      run_manifest_path: childPaths.manifestPath
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('queues a post-worker-exit scheduler retry on refresh and lets the retry owner launch it at the due boundary', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-continuation',
        manifestPath: '/tmp/provider-run/continuation-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          updated_at: '2026-03-19T04:20:00.000Z'
        })
      })
    });

    await service.refresh();
    await waitForCondition(
      () =>
        state.claims[0]?.retry_queued === true &&
        state.claims[0]?.retry_due_at === '2026-03-19T04:30:01.000Z'
    );

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      task_id: 'task-1303-completed',
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:01.000Z',
      retry_error: null
    });

    await vi.advanceTimersByTimeAsync(1_001);
    await flushAsyncWork();
    await waitForMockCalls(launcher.start);

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:20:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_post_worker_exit_start_launched',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-continuation',
      run_manifest_path: '/tmp/provider-run/continuation-manifest.json',
      launch_source: 'control-host',
      launch_token: expect.any(String),
      retry_queued: false,
      retry_attempt: 1,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('fails closed when the retry owner cannot start a queued post-worker-exit continuation safely', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => {
        throw new Error('worker owner continuation unavailable');
      }),
      resume: vi.fn(async () => undefined)
    };
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          updated_at: '2026-03-19T04:40:00.000Z'
        })
      })
    });

    await expect(service.refresh()).resolves.toBeUndefined();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_001);
    await flushAsyncWork();
    await waitForMockCalls(launcher.start, 1, 1024);

    expect(launcher.start.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:40:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_post_worker_exit_start_failed:worker owner continuation unavailable',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      task_id: 'linear-lin-issue-1',
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: expect.any(String),
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: expect.any(String),
      retry_error: 'worker owner continuation unavailable'
    });
    expect(Number.isFinite(Date.parse(state.claims[0]?.retry_due_at ?? ''))).toBe(true);
  });

  it.each(['persist', 'publish'] as const)(
    'still queues best-effort rehydrate after a refresh-launched start when post-start %s fails',
    async (failureMode) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

      const { root, paths } = await createHostPaths();
      const childEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'linear-lin-issue-1'
      };
      const childPaths = resolveRunPaths(childEnv, 'run-completed');
      await mkdir(childPaths.runDir, { recursive: true });
      await writeFile(
        childPaths.manifestPath,
        JSON.stringify({
          run_id: 'run-completed',
          task_id: 'linear-lin-issue-1',
          status: 'succeeded',
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
        task_id: 'linear-lin-issue-1',
        mapping_source: 'provider_id_fallback',
        state: 'completed',
        reason: 'provider_issue_rehydrated_completed_run',
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: 'delivery-completed',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_050_000,
        run_id: 'run-completed',
        run_manifest_path: childPaths.manifestPath,
        launch_source: null,
        launch_token: null
      });

      let persistCallCount = 0;
      const persist = vi.fn(async () => {
        persistCallCount += 1;
        if (failureMode === 'persist' && persistCallCount === 4) {
          throw new Error('post-start persist failed');
        }
      });
      const publishRuntime = vi.fn(() => {
        if (failureMode === 'publish') {
          throw new Error('post-start publish failed');
        }
      });
      const launcher = {
        start: vi.fn(async () => ({
          runId: 'run-continuation',
          manifestPath: '/tmp/provider-run/continuation-manifest.json'
        })),
        resume: vi.fn(async () => undefined)
      };
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      const service = createProviderIssueHandoffService({
        paths,
        state,
        persist,
        launcher,
        publishRuntime,
        startPipelineId: 'diagnostics',
        resolveTrackedIssue: async () => ({
          kind: 'ready',
          trackedIssue: createTrackedIssue({
            updated_at: '2026-03-19T04:40:00.000Z'
          })
        })
      });

      await expect(service.refresh()).resolves.toBeUndefined();
      await waitForMockCalls(setTimeoutSpy);

      expect(launcher.resume).not.toHaveBeenCalled();
      expect(launcher.start).not.toHaveBeenCalled();
      await waitForCondition(
        () =>
          state.claims[0]?.retry_queued === true &&
          state.claims[0]?.retry_due_at === '2026-03-19T04:30:01.000Z'
      );

      const scheduledTimeoutCount = setTimeoutSpy.mock.calls.length;
      expect(scheduledTimeoutCount).toBe(1);
      const [, delayMs] = setTimeoutSpy.mock.calls[scheduledTimeoutCount - 1] ?? [];
      expect(delayMs).toBeGreaterThanOrEqual(999);
      expect(delayMs).toBeLessThanOrEqual(1_000);
      getLatestScheduledTimeoutCallback(setTimeoutSpy)();
      await flushAsyncWork();
      await waitForMockCalls(launcher.start, 1, 1024);

      expect(launcher.start.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
        taskId: 'linear-lin-issue-1',
        pipelineId: 'diagnostics',
        provider: 'linear',
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-2',
        issueUpdatedAt: '2026-03-19T04:40:00.000Z',
        launchToken: expect.any(String)
      }));
      expect(state.claims[0]).toMatchObject({
        state: 'starting',
        reason: 'provider_issue_post_worker_exit_start_launched',
        task_id: 'linear-lin-issue-1',
        run_id: 'run-continuation',
        run_manifest_path: '/tmp/provider-run/continuation-manifest.json',
        launch_source: 'control-host',
        launch_token: expect.any(String),
        retry_queued: false,
        retry_attempt: 1,
        retry_due_at: null,
        retry_error: null
      });
      expect(setTimeoutSpy.mock.calls.length).toBeGreaterThan(scheduledTimeoutCount);
    }
  );

  it('keeps released claims released during rehydrate even when historical completed runs still exist', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      issue_updated_at: null,
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: 'task-1303-completed',
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath
    });
  });

  it('reattaches a released claim to its persisted run_id when a resumed child loses only the manifest path', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const targetPaths = resolveRunPaths(childEnv, 'run-completed-target');
    await mkdir(targetPaths.runDir, { recursive: true });
    await writeFile(
      targetPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed-target',
        task_id: 'task-1303-completed',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        started_at: '2026-03-19T04:10:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    const newerPaths = resolveRunPaths(childEnv, 'run-completed-newer');
    await mkdir(newerPaths.runDir, { recursive: true });
    await writeFile(
      newerPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed-newer',
        task_id: 'task-1303-completed',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:40:00.000Z',
        updated_at: '2026-03-19T04:50:00.000Z'
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
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-completed-target',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed-target',
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'detached-release-resume-token',
      launch_started_at: '2026-03-19T04:20:30.000Z'
    });

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: 'task-1303-completed',
      run_id: 'run-completed-target',
      run_manifest_path: targetPaths.manifestPath
    });
  });

  it('reattaches a released claim after upgrading a manifest-only starting claim that synthesized run_id from task_id', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const acceptedAt = new Date(Date.now() - 1_500).toISOString();
    const launchStartedAt = new Date(Date.now() - 1_000).toISOString();
    const issueUpdatedAt = new Date(Date.now() - 500).toISOString();
    const childStartedAt = new Date(Date.parse(launchStartedAt) + 1).toISOString();
    const childUpdatedAt = new Date(Date.parse(childStartedAt) + 1_000).toISOString();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-upgraded-release');

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: issueUpdatedAt,
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: acceptedAt,
      updated_at: launchStartedAt,
      last_delivery_id: 'delivery-manifest-only-starting',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'manifest-only-starting-token',
      launch_started_at: launchStartedAt
    });

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => ({
        kind: 'release',
        reason: 'not_active'
      })
    });

    await service.refresh();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: taskId,
      run_id: taskId,
      run_manifest_path: childPaths.manifestPath
    });

    state.claims[0] = {
      ...state.claims[0],
      run_manifest_path: null
    };

    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-upgraded-release',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: issueUpdatedAt,
        started_at: childStartedAt,
        updated_at: childUpdatedAt
      }),
      'utf8'
    );

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: taskId,
      run_id: 'run-upgraded-release',
      run_manifest_path: childPaths.manifestPath,
      launch_started_at: launchStartedAt
    });
  });

  it('reattaches a handoff_failed claim to its persisted run_id when a resumed child loses only the manifest path', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const targetPaths = resolveRunPaths(childEnv, 'run-handoff-target');
    await mkdir(targetPaths.runDir, { recursive: true });
    await writeFile(
      targetPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-handoff-target',
        task_id: 'task-1303-completed',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        started_at: '2026-03-19T04:10:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    const newerPaths = resolveRunPaths(childEnv, 'run-handoff-newer');
    await mkdir(newerPaths.runDir, { recursive: true });
    await writeFile(
      newerPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-handoff-newer',
        task_id: 'task-1303-completed',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:40:00.000Z',
        started_at: '2026-03-19T04:40:00.000Z',
        updated_at: '2026-03-19T04:50:00.000Z'
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
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_resume_failed:control host restarted',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:30.000Z',
      last_delivery_id: 'delivery-handoff-target',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-handoff-target',
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'handoff-resume-token',
      launch_started_at: '2026-03-19T04:20:30.000Z'
    });

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      task_id: 'task-1303-completed',
      run_id: 'run-handoff-target',
      run_manifest_path: targetPaths.manifestPath
    });
  });

  it('cleans terminal released provider workspaces during refresh startup replay', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        workspace_path: join(root, '.workspaces', 'task-1303-completed'),
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    const workspacePath = resolveProviderWorkspacePath(root, 'task-1303-completed');
    await mkdir(workspacePath, { recursive: true });
    await writeFile(join(workspacePath, '.git'), 'gitdir: /tmp/provider-worktree\n', 'utf8');

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
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Done',
          state_type: 'completed'
        })
      })
    });

    await service.refresh();

    await expect(access(workspacePath)).rejects.toThrow();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed'
    });
  });

  it('publishes released-claim refreshes when only tracked issue metadata changes', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      issue_blocked_by: null,
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const publishRuntime = vi.fn();
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      publishRuntime,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Done',
          state_type: 'completed',
          updated_at: '2026-03-19T04:40:00.000Z',
          blocked_by: [
            {
              id: 'lin-blocker-1',
              identifier: 'CO-9',
              state: 'Done',
              state_type: 'completed'
            }
          ]
        })
      })
    });

    await service.refresh();

    expect(publishRuntime).toHaveBeenCalledWith('provider-intake.refresh');
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      issue_blocked_by: [
        {
          id: 'lin-blocker-1',
          identifier: 'CO-9',
          state: 'Done',
          state_type: 'completed'
        }
      ]
    });
  });

  it('cleans only the repo-root provider workspace when the runs root lives outside the repo', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-issue-handoff-repo-'));
    const runsRoot = await mkdtemp(join(tmpdir(), 'provider-issue-handoff-runs-'));
    cleanupRoots.push(root, runsRoot);
    const env = {
      repoRoot: root,
      runsRoot,
      outRoot: join(root, 'out'),
      taskId: 'local-mcp'
    };
    const paths = Object.assign(resolveRunPaths(env, 'control-host'), { repoRoot: root });
    await mkdir(paths.runDir, { recursive: true });

    const childEnv = {
      repoRoot: root,
      runsRoot,
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        workspace_path: join(root, '.workspaces', 'task-1303-completed'),
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    const workspacePath = resolveProviderWorkspacePath(root, 'task-1303-completed');
    await mkdir(workspacePath, { recursive: true });
    await writeFile(join(workspacePath, '.git'), 'gitdir: /tmp/provider-worktree\n', 'utf8');
    const decoyWorkspacePath = join(runsRoot, '.workspaces', 'task-1303-completed');
    await mkdir(decoyWorkspacePath, { recursive: true });
    await writeFile(join(decoyWorkspacePath, '.git'), 'gitdir: /tmp/decoy-provider-worktree\n', 'utf8');

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
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    await expect(access(workspacePath)).rejects.toThrow();
    await expect(access(decoyWorkspacePath)).resolves.toBeUndefined();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath
    });
  });

  it('keeps terminal released provider workspaces intact during rehydrate while a queued child run still exists', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-queued');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-queued',
        task_id: 'task-1303-completed',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        workspace_path: join(root, '.workspaces', 'task-1303-completed'),
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    const workspacePath = resolveProviderWorkspacePath(root, 'task-1303-completed');
    await mkdir(workspacePath, { recursive: true });
    await writeFile(join(workspacePath, '.git'), 'gitdir: /tmp/provider-worktree\n', 'utf8');

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
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-queued',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    await expect(access(workspacePath)).resolves.toBeUndefined();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: 'run-queued',
      run_manifest_path: childPaths.manifestPath
    });
  });

  it('keeps released claims bound to the matching pipeline during rehydrate while another pipeline stays active', async () => {
    const { root, paths } = await createHostPaths();
    const otherEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active-other-pipeline'
    };
    const otherPaths = resolveRunPaths(otherEnv, 'run-active-other-pipeline');
    await mkdir(otherPaths.runDir, { recursive: true });
    await writeFile(
      otherPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active-other-pipeline',
        task_id: 'task-1303-active-other-pipeline',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );

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
        pipeline_id: 'diagnostics',
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

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      startPipelineId: 'diagnostics',
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-active',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
  });

  it('keeps the release transition persisted when child cancellation fails during refresh', async () => {
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

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => ({
        kind: 'release',
        reason: 'not_active'
      })
    });

    await expect(service.refresh()).resolves.toBeUndefined();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: 'task-1303-active',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
    expect(persist).toHaveBeenCalled();
  });

  it('keeps a draining released claim released when an accepted webhook re-enters before child cancel settles', async () => {
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

    let resolveCancelAttempt: (() => void) | null = null;
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async () =>
        await new Promise<void>((resolve) => {
          resolveCancelAttempt = resolve;
        })
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

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      resolveTrackedIssue: async () => ({
        kind: 'release',
        reason: 'not_active'
      })
    });

    const refreshPromise = service.refresh();
    await vi.waitFor(() => {
      expect(state.claims[0]).toMatchObject({
        state: 'released',
        reason: 'provider_issue_released:not_active',
        task_id: 'task-1303-active',
        run_id: 'run-active',
        run_manifest_path: childPaths.manifestPath
      });
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:40:00.000Z'
      }),
      deliveryId: 'delivery-release-drain-reentry',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_200_000
    });

    expect(result.kind).toBe('ignored');
    expect(result.claim).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      task_id: 'task-1303-active',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      task_id: 'task-1303-active',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();

    if (!resolveCancelAttempt) {
      throw new Error('Expected the child cancel attempt to be in flight.');
    }
    resolveCancelAttempt();
    await refreshPromise;

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      task_id: 'task-1303-active',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
  });

  it('preserves released blocker metadata when an equal-timestamp replay arrives with different blockers', async () => {
    const { paths } = await createHostPaths();
    const existingBlockers = [
      {
        id: 'lin-blocker-existing',
        identifier: 'CO-9',
        state: 'Todo',
        state_type: 'unstarted'
      }
    ];
    const incomingBlockers = [
      {
        id: 'lin-blocker-incoming',
        identifier: 'CO-10',
        state: 'In Progress',
        state_type: 'started'
      }
    ];
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Todo',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      issue_blocked_by: existingBlockers,
      task_id: 'task-1303-released',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-released',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-released',
      run_manifest_path: '/tmp/run-released/manifest.json',
      launch_source: null,
      launch_token: null
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-19T04:20:00.000Z',
        blocked_by: incomingBlockers
      }),
      deliveryId: 'delivery-released-replay',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_200_000
    });

    expect(result.kind).toBe('ignored');
    expect(result.claim).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_state: 'Todo',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:20:00.000Z'
    });
    expect(result.claim.issue_blocked_by).toEqual(existingBlockers);
    expect(state.claims[0]?.issue_blocked_by).toEqual(existingBlockers);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('relaunches a newer accepted webhook replay after the release drain has settled', async () => {
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

    let resolveCancelAttempt: (() => void) | null = null;
    vi.spyOn(questionChildResolutionAdapter, 'callChildControlEndpoint').mockImplementation(
      async () =>
        await new Promise<void>((resolve) => {
          resolveCancelAttempt = resolve;
        })
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

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-restarted',
        manifestPath: '/tmp/provider-run/restarted-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      resolveTrackedIssue: async () => ({
        kind: 'release',
        reason: 'not_active'
      })
    });

    const refreshPromise = service.refresh();
    await vi.waitFor(() => {
      expect(state.claims[0]).toMatchObject({
        state: 'released',
        reason: 'provider_issue_released:not_active',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        task_id: 'task-1303-active',
        run_id: 'run-active',
        run_manifest_path: childPaths.manifestPath
      });
    });

    const firstResult = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:40:00.000Z'
      }),
      deliveryId: 'delivery-release-drain-reentry',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_200_000
    });

    expect(firstResult.kind).toBe('ignored');
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      task_id: 'task-1303-active',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });

    if (!resolveCancelAttempt) {
      throw new Error('Expected the child cancel attempt to be in flight.');
    }
    resolveCancelAttempt();
    await refreshPromise;

    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'task-1303-active',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:41:00.000Z'
      }),
      'utf8'
    );

    const replayResult = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:40:00.000Z'
      }),
      deliveryId: 'delivery-release-drain-replay',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_210_000
    });

    expect(replayResult).toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:40:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_start_launched',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-restarted',
      run_manifest_path: '/tmp/provider-run/restarted-manifest.json',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
  });

  it('allows a newer active webhook to relaunch a released claim after the release drain has settled', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed',
        task_id: 'task-1303-completed',
        status: 'succeeded',
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
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-released-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-reopened',
        manifestPath: '/tmp/provider-run/reopened-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:40:00.000Z'
      }),
      deliveryId: 'delivery-release-reopened',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_200_000
    });

    expect(result).toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:40:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_start_launched',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-reopened',
      run_manifest_path: '/tmp/provider-run/reopened-manifest.json',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
  });

  it('reattaches a detached released claim to a child that finished after launch_started_at', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-detached-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-detached-completed',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:44:00.000Z',
        started_at: '2026-03-19T04:40:31.000Z',
        updated_at: '2026-03-19T04:45:00.000Z'
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
      issue_updated_at: '2026-03-19T04:44:00.000Z',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:40:00.000Z',
      updated_at: '2026-03-19T04:50:00.000Z',
      last_delivery_id: 'delivery-detached-release',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'detached-release-token',
      launch_started_at: '2026-03-19T04:40:30.000Z'
    });

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: taskId,
      run_id: 'run-detached-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_started_at: '2026-03-19T04:40:30.000Z'
    });
  });

  it('reattaches a detached released claim when the child started exactly at launch_started_at', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-detached-same-start');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-detached-same-start',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:44:00.000Z',
        started_at: '2026-03-19T04:40:30.000Z',
        updated_at: '2026-03-19T04:45:00.000Z'
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
      issue_updated_at: '2026-03-19T04:44:00.000Z',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:40:00.000Z',
      updated_at: '2026-03-19T04:50:00.000Z',
      last_delivery_id: 'delivery-detached-release-same-start',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'detached-release-token-same-start',
      launch_started_at: '2026-03-19T04:40:30.000Z'
    });

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: taskId,
      run_id: 'run-detached-same-start',
      run_manifest_path: childPaths.manifestPath,
      launch_started_at: '2026-03-19T04:40:30.000Z'
    });
  });

  it('does not reattach a detached released claim to an older child that only finished after launch_started_at', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-detached-older');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-detached-older',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:44:00.000Z',
        started_at: '2026-03-19T04:40:00.000Z',
        updated_at: '2026-03-19T04:45:00.000Z'
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
      issue_updated_at: '2026-03-19T04:44:00.000Z',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:40:00.000Z',
      updated_at: '2026-03-19T04:50:00.000Z',
      last_delivery_id: 'delivery-detached-release-older',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'detached-release-token-older',
      launch_started_at: '2026-03-19T04:40:30.000Z'
    });

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: taskId,
      run_id: null,
      run_manifest_path: null,
      launch_started_at: '2026-03-19T04:40:30.000Z'
    });
  });

  it('reattaches a legacy detached released claim using the current issue update timestamp', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-legacy-released');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-legacy-released',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:44:00.000Z',
        started_at: '2026-03-19T04:40:31.000Z',
        updated_at: '2026-03-19T04:45:00.000Z'
      }),
      'utf8'
    );

    const state = normalizeProviderIntakeState({
      schema_version: 1,
      updated_at: '2026-03-19T04:50:00.000Z',
      rehydrated_at: null,
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_released:not_active',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-03-19T04:44:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'released',
          reason: 'provider_issue_released:not_active',
          accepted_at: '2026-03-19T04:40:00.000Z',
          updated_at: '2026-03-19T04:50:00.000Z',
          last_delivery_id: 'delivery-legacy-released',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_050_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'legacy-released-token'
        }
      ]
    });

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: taskId,
      run_id: 'run-legacy-released',
      run_manifest_path: childPaths.manifestPath,
      launch_started_at: null
    });
  });

  it('recovers a detached child after upgrade from a legacy handoff_failed claim without launch_started_at', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-upgrade-recovered');
    const state = normalizeProviderIntakeState({
      schema_version: 1,
      updated_at: '2026-03-19T04:50:00.000Z',
      rehydrated_at: null,
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_failed:transient launch failure',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-19T04:40:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'handoff_failed',
          reason: 'provider_issue_start_failed:transient launch failure',
          accepted_at: '2026-03-19T04:40:05.000Z',
          updated_at: '2026-03-19T04:40:10.000Z',
          last_delivery_id: 'delivery-failed-start',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_050_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-token-failed'
        }
      ]
    });

    let persistCallCount = 0;
    const persist = vi.fn(async () => {
      persistCallCount += 1;
      if (persistCallCount === 2) {
        await mkdir(childPaths.runDir, { recursive: true });
        await writeFile(
          childPaths.manifestPath,
          JSON.stringify({
            run_id: 'run-upgrade-recovered',
            task_id: taskId,
            status: 'succeeded',
            issue_provider: 'linear',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-2',
            issue_updated_at: '2026-03-19T04:44:00.000Z',
            started_at: '2026-03-19T04:40:06.000Z',
            updated_at: '2026-03-19T04:40:08.000Z'
          }),
          'utf8'
        );
      }
    });
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => ({
        kind: 'release',
        reason: 'not_active'
      })
    });

    await service.refresh();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: null,
      run_manifest_path: null,
      launch_started_at: null
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: taskId,
      run_id: 'run-upgrade-recovered',
      run_manifest_path: childPaths.manifestPath,
      launch_started_at: null
    });
  });

  it('does not reattach a reopened legacy handoff_failed claim to an older child from a prior attempt', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-legacy-prior-attempt');
    const state = normalizeProviderIntakeState({
      schema_version: 1,
      updated_at: '2026-03-19T04:50:00.000Z',
      rehydrated_at: null,
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_start_failed:transient launch failure',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Autonomous intake handoff',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-19T04:40:00.000Z',
          task_id: taskId,
          mapping_source: 'provider_id_fallback',
          state: 'handoff_failed',
          reason: 'provider_issue_start_failed:transient launch failure',
          accepted_at: '2026-03-19T04:00:05.000Z',
          updated_at: '2026-03-19T04:40:10.000Z',
          last_delivery_id: 'delivery-prior-attempt',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_050_000,
          run_id: null,
          run_manifest_path: null,
          launch_source: 'control-host',
          launch_token: 'launch-token-prior-attempt'
        }
      ]
    });

    let persistCallCount = 0;
    const persist = vi.fn(async () => {
      persistCallCount += 1;
      if (persistCallCount === 2) {
        await mkdir(childPaths.runDir, { recursive: true });
        await writeFile(
          childPaths.manifestPath,
          JSON.stringify({
            run_id: 'run-legacy-prior-attempt',
            task_id: taskId,
            status: 'succeeded',
            issue_provider: 'linear',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-2',
            issue_updated_at: '2026-03-19T04:20:00.000Z',
            started_at: '2026-03-19T04:10:00.000Z',
            updated_at: '2026-03-19T04:45:00.000Z'
          }),
          'utf8'
        );
      }
    });
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => ({
        kind: 'release',
        reason: 'not_active'
      })
    });

    await service.refresh();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: null,
      run_manifest_path: null,
      launch_started_at: null
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: taskId,
      run_id: null,
      run_manifest_path: null,
      launch_started_at: null
    });
  });

  it('preserves released metadata and reattaches the child when an older accepted webhook is ignored', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-released-ignored');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-released-ignored',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:50:00.000Z',
        started_at: '2026-03-19T04:50:01.000Z',
        updated_at: '2026-03-19T04:55:00.000Z'
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
      issue_updated_at: '2026-03-19T04:50:00.000Z',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:40:00.000Z',
      updated_at: '2026-03-19T04:56:00.000Z',
      last_delivery_id: 'delivery-released-current',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'released-current-token',
      launch_started_at: '2026-03-19T04:40:30.000Z'
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        updated_at: '2026-03-19T04:45:00.000Z'
      }),
      deliveryId: 'delivery-release-stale-reentry',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_200_000
    });

    expect(result.kind).toBe('ignored');
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:50:00.000Z',
      task_id: taskId,
      run_id: 'run-released-ignored',
      run_manifest_path: childPaths.manifestPath
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('reattaches a detached released child after upgrading a legacy handoff_failed claim without inventing launch_started_at', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-legacy-handoff-failed');

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_rehydration_timeout',
      accepted_at: '2026-03-19T04:40:00.000Z',
      updated_at: '2026-03-19T04:40:30.000Z',
      last_delivery_id: 'delivery-legacy-handoff-failed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'legacy-handoff-failed-token'
    });

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => ({
        kind: 'release',
        reason: 'not_active'
      })
    });

    await service.refresh();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      run_id: null,
      run_manifest_path: null,
      launch_started_at: null
    });

    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-legacy-handoff-failed',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:44:00.000Z',
        started_at: '2026-03-19T04:40:01.000Z',
        updated_at: '2026-03-19T04:45:00.000Z'
      }),
      'utf8'
    );

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:not_active',
      task_id: taskId,
      run_id: 'run-legacy-handoff-failed',
      run_manifest_path: childPaths.manifestPath,
      launch_started_at: null
    });
  });

  it('queues a failed run on refresh and lets the retry owner resume it without requiring a newer issue timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-failed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-failed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-failed',
        task_id: 'task-1303-failed',
        status: 'failed',
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
      task_id: 'task-1303-failed',
      mapping_source: 'provider_id_fallback',
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-failed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          updated_at: '2026-03-19T04:20:00.000Z'
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      task_id: 'task-1303-failed',
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:10.000Z',
      retry_error: null
    });

    await vi.advanceTimersByTimeAsync(10_001);
    await flushAsyncWork();
    await waitForMockCalls(launcher.resume, 1, 1024);

    expect(launcher.resume.mock.calls[0]?.[0]).toEqual({
      runId: 'run-failed',
      actor: 'control-host',
      reason: 'provider-retry',
      launchToken: expect.any(String)
    });
    expect(state.claims[0]).toMatchObject({
      state: 'resuming',
      reason: 'provider_issue_retry_resume_launched',
      task_id: 'task-1303-failed',
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: expect.any(String),
      retry_queued: false,
      retry_attempt: 1,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('queues a second failed-run retry at double the first backoff delay', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-failed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-failed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-failed',
        task_id: 'task-1303-failed',
        status: 'failed',
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
      task_id: 'task-1303-failed',
      mapping_source: 'provider_id_fallback',
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-failed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      retry_queued: false,
      retry_attempt: 1,
      retry_due_at: null,
      retry_error: null
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          updated_at: '2026-03-19T04:20:00.000Z'
        })
      })
    });

    await service.refresh();

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      task_id: 'task-1303-failed',
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 2,
      retry_due_at: '2026-03-19T04:30:20.000Z',
      retry_error: null
    });
  });

  it('retries queued-retry deadline repair after refresh persist failure instead of keeping only in-memory retry_due_at', async () => {
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
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-completed',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: 'not-a-timestamp',
      retry_error: null
    });

    let persistCallCount = 0;
    const persist = vi.fn(async () => {
      persistCallCount += 1;
      if (persistCallCount === 2) {
        throw new Error('completed refresh persist failed');
      }
    });
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          updated_at: '2026-03-19T04:20:00.000Z'
        })
      })
    });

    await expect(service.refresh()).resolves.toBeUndefined();

    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: 'not-a-timestamp'
    });

    await expect(service.refresh()).resolves.toBeUndefined();

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      task_id: 'task-1303-completed',
      retry_queued: true,
      retry_attempt: 1
    });
    expect(Number.isFinite(Date.parse(state.claims[0]?.retry_due_at ?? ''))).toBe(true);
  });
});
