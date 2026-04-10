import { createHash } from 'node:crypto';
import http from 'node:http';
import { access, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import type { Socket } from 'node:net';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createProviderIssueHandoffService,
  discoverProviderIssueRuns
} from '../src/cli/control/providerIssueHandoff.js';
import { PROVIDER_LINEAR_AUDIT_ENV_VAR } from '../src/cli/control/providerLinearWorkflowAudit.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import { logger } from '../src/logger.js';
import {
  PROVIDER_LINEAR_WORKER_AUDIT_FILENAME,
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME
} from '../src/cli/providerLinearWorkerRunner.js';
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
  vi.unstubAllEnvs();
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
  const sockets = new Set<Socket>();
  const destroyTrackedSockets = () => {
    sockets.forEach((socket) => socket.destroy());
  };
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      actions.push(JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind control endpoint test server.');
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    actions,
    close: async () => {
      if (!server.listening) {
        destroyTrackedSockets();
        return;
      }
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections?.();
        server.closeAllConnections?.();
        destroyTrackedSockets();
      });
    }
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
    viewer_id: 'viewer-1',
    assignee_id: 'viewer-1',
    assignee_name: 'Codex',
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

function createLinearTokenFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function cloneProviderIntakeState(state: ProviderIntakeState): ProviderIntakeState {
  return normalizeProviderIntakeState(JSON.parse(JSON.stringify(state)) as ProviderIntakeState);
}

function createPersistSnapshotSpy(state: ProviderIntakeState) {
  let persistedState = cloneProviderIntakeState(state);
  const persist = vi.fn(async () => {
    persistedState = cloneProviderIntakeState(state);
  });
  return {
    persist,
    getPersistedState: () => persistedState
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

const QUEUED_RETRY_SETTLE_TURNS = 1_024;

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
  it('ignores child-stream and child-lane manifests without dropping provider workers that carry parent lineage', async () => {
    const { root, paths } = await createHostPaths();
    const providerRunDir = join(root, '.runs', 'linear-lin-issue-1', 'cli', 'provider-run-1');
    const providerChildDir = join(root, '.runs', 'linear-lin-issue-1-docs-review', 'cli', 'docs-run-1');
    const providerChildLaneDir = join(root, '.runs', 'linear-lin-issue-1-impl-a', 'cli', 'child-run-1');
    await mkdir(providerRunDir, { recursive: true });
    await mkdir(providerChildDir, { recursive: true });
    await mkdir(providerChildLaneDir, { recursive: true });
    await writeFile(join(providerRunDir, 'manifest.json'), JSON.stringify({
      run_id: 'provider-run-1',
      task_id: 'linear-lin-issue-1',
      pipeline_id: 'provider-linear-worker',
      parent_run_id: 'control-host-run-1',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      updated_at: '2026-03-27T01:00:00.000Z'
    }), 'utf8');
    await writeFile(join(providerChildDir, 'manifest.json'), JSON.stringify({
      run_id: 'docs-run-1',
      task_id: 'linear-lin-issue-1-docs-review',
      pipeline_id: 'docs-review',
      parent_run_id: 'provider-run-1',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      updated_at: '2026-03-27T01:01:00.000Z'
    }), 'utf8');
    await writeFile(join(providerChildLaneDir, 'manifest.json'), JSON.stringify({
      run_id: 'child-run-1',
      task_id: 'linear-lin-issue-1-impl-a',
      pipeline_id: 'provider-linear-child-lane',
      parent_run_id: 'provider-run-1',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      updated_at: '2026-03-27T01:02:00.000Z'
    }), 'utf8');

    await expect(
      discoverProviderIssueRuns(paths.runDir, { provider: 'linear', issueId: 'lin-issue-1' })
    ).resolves.toEqual([
      expect.objectContaining({
        runId: 'provider-run-1',
        taskId: 'linear-lin-issue-1',
        pipelineId: 'provider-linear-worker'
      })
    ]);
  });

  it('ignores stale proof worker_host values when discovering prior provider runs', async () => {
    const { root, paths } = await createHostPaths();
    const providerRunDir = join(root, '.runs', 'linear-lin-issue-1', 'cli', 'provider-run-1');
    await mkdir(providerRunDir, { recursive: true });
    await writeFile(join(providerRunDir, 'manifest.json'), JSON.stringify({
      run_id: 'provider-run-1',
      task_id: 'linear-lin-issue-1',
      pipeline_id: 'provider-linear-worker',
      parent_run_id: 'control-host-run-1',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      started_at: '2026-03-27T01:05:00.000Z',
      updated_at: '2026-03-27T01:06:00.000Z'
    }), 'utf8');
    await writeFile(
      join(providerRunDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-27T01:00:00.000Z',
        updated_at: '2026-03-27T01:04:00.000Z',
        worker_host: 'worker-host-01'
      }),
      'utf8'
    );

    await expect(
      discoverProviderIssueRuns(paths.runDir, { provider: 'linear', issueId: 'lin-issue-1' })
    ).resolves.toEqual([
      expect.objectContaining({
        runId: 'provider-run-1',
        workerHost: null
      })
    ]);
  });

  it('preserves resident-session seeds when the manifest updated_at advances after a succeeded terminal proof', async () => {
    const { root, paths } = await createHostPaths();
    const providerRunDir = join(root, '.runs', 'linear-lin-issue-1', 'cli', 'provider-run-1');
    await mkdir(providerRunDir, { recursive: true });
    await writeFile(join(providerRunDir, 'manifest.json'), JSON.stringify({
      run_id: 'provider-run-1',
      task_id: 'linear-lin-issue-1',
      pipeline_id: 'provider-linear-worker',
      parent_run_id: 'control-host-run-1',
      issue_provider: 'linear',
      issue_id: 'lin-issue-1',
      status: 'succeeded',
      started_at: '2026-03-27T01:00:00.000Z',
      updated_at: '2026-03-27T01:05:00.000Z'
    }), 'utf8');
    await writeFile(join(providerRunDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), JSON.stringify({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      attempt_started_at: '2026-03-27T01:00:01.000Z',
      owner_phase: 'ended',
      owner_status: 'succeeded',
      end_reason: 'max_turns_reached_issue_still_active',
      thread_id: 'thread-1',
      turn_count: 20,
      resident_session: {
        logical_session_id: 'linear:lin-issue-1:resident-session',
        logical_turn_count: 20,
        restart_count: 1,
        continuity_state: 'guarded_resume_active',
        source_run_id: 'provider-run-0',
        source_updated_at: '2026-03-27T00:55:00.000Z',
        source_end_reason: 'max_turns_reached_issue_still_active',
        source_thread_id: 'thread-0'
      },
      updated_at: '2026-03-27T01:04:59.000Z'
    }), 'utf8');

    await expect(
      discoverProviderIssueRuns(paths.runDir, { provider: 'linear', issueId: 'lin-issue-1' })
    ).resolves.toEqual([
      expect.objectContaining({
        runId: 'provider-run-1',
        residentSessionSeed: {
          source_run_id: 'provider-run-1',
          source_updated_at: '2026-03-27T01:04:59.000Z',
          source_end_reason: 'max_turns_reached_issue_still_active',
          source_thread_id: 'thread-1',
          logical_turn_count: 20,
          restart_count: 2
        }
      })
    ]);
  });

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

  it('selects an available configured worker_host and passes it to the launcher start path', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:occupied-issue',
      issue_id: 'occupied-issue',
      issue_identifier: 'CO-occupied',
      issue_title: 'Occupied issue',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-occupied-issue',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_handoff_owned',
      accepted_at: '2026-03-19T04:00:00.000Z',
      updated_at: '2026-03-19T04:01:00.000Z',
      last_delivery_id: null,
      last_event: null,
      last_action: null,
      last_webhook_timestamp: null,
      run_id: 'run-occupied',
      run_manifest_path: '/repo/.runs/linear-occupied-issue/cli/run-occupied/manifest.json',
      worker_host: 'worker-host-01',
      launch_source: 'control-host',
      launch_token: 'launch-occupied',
      launch_started_at: '2026-03-19T04:01:00.000Z',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null,
      review_promotion: null,
      merge_closeout: null
    });
    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const providerWorkflowConfigStore = {
      bootstrap: vi.fn(),
      refresh: vi.fn(),
      snapshot: () => ({
        status: 'ready' as const,
        pipeline_id: 'provider-linear-worker',
        source_path: '/repo/codex.orchestrator.json',
        snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        last_reload_attempt_at: null,
        last_success_at: null,
        last_error_at: null,
        last_error: null,
        terminal_cleanup: null,
        worker_hosts: [
          {
            name: 'worker-host-01',
            transport: 'ssh' as const,
            ssh_destination: 'codex@worker-host-01',
            ssh_options: [],
            max_concurrent_agents: 1,
            node_path: null
          },
          {
            name: 'worker-host-02',
            transport: 'ssh' as const,
            ssh_destination: 'codex@worker-host-02',
            ssh_options: [],
            max_concurrent_agents: 2,
            node_path: null
          }
        ]
      }),
      getLaunchConfigPath: vi.fn(),
      recordTerminalCleanupResult: vi.fn()
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      providerWorkflowConfigStore
    });

    await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-2',
        identifier: 'CO-3'
      }),
      deliveryId: 'delivery-2',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_000_001
    });

    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-2',
      issueIdentifier: 'CO-3',
      workerHost: 'worker-host-02'
    }));
    expect(providerWorkflowConfigStore.refresh).toHaveBeenCalledTimes(1);
    expect(state.claims.find((claim) => claim.issue_id === 'lin-issue-2')).toMatchObject({
      worker_host: 'worker-host-02',
      state: 'starting'
    });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(getPersistedState().claims.find((claim) => claim.issue_id === 'lin-issue-2')).toMatchObject({
      worker_host: 'worker-host-02',
      state: 'starting'
    });
  });

  it('fails closed with a queued retry when configured worker_hosts are at capacity', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:occupied-issue',
      issue_id: 'occupied-issue',
      issue_identifier: 'CO-occupied',
      issue_title: 'Occupied issue',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-occupied-issue',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_handoff_owned',
      accepted_at: '2026-03-19T04:00:00.000Z',
      updated_at: '2026-03-19T04:01:00.000Z',
      last_delivery_id: null,
      last_event: null,
      last_action: null,
      last_webhook_timestamp: null,
      run_id: 'run-occupied',
      run_manifest_path: '/repo/.runs/linear-occupied-issue/cli/run-occupied/manifest.json',
      worker_host: 'worker-host-01',
      launch_source: 'control-host',
      launch_token: 'launch-occupied',
      launch_started_at: '2026-03-19T04:01:00.000Z',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null,
      review_promotion: null,
      merge_closeout: null
    });
    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const providerWorkflowConfigStore = {
      bootstrap: vi.fn(),
      refresh: vi.fn(),
      snapshot: () => ({
        status: 'ready' as const,
        pipeline_id: 'provider-linear-worker',
        source_path: '/repo/codex.orchestrator.json',
        snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        last_reload_attempt_at: null,
        last_success_at: null,
        last_error_at: null,
        last_error: null,
        terminal_cleanup: null,
        worker_hosts: [
          {
            name: 'worker-host-01',
            transport: 'ssh' as const,
            ssh_destination: 'codex@worker-host-01',
            ssh_options: [],
            max_concurrent_agents: 1,
            node_path: null
          }
        ]
      }),
      getLaunchConfigPath: vi.fn(),
      recordTerminalCleanupResult: vi.fn()
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      providerWorkflowConfigStore
    });

    await expect(
      service.handleAcceptedTrackedIssue({
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-2',
          identifier: 'CO-3'
        }),
        deliveryId: 'delivery-2',
        event: 'Issue',
        action: 'update',
        webhookTimestamp: 1_742_360_000_001
      })
    ).rejects.toThrow(/at capacity/);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(providerWorkflowConfigStore.refresh).toHaveBeenCalledTimes(1);
    expect(state.claims.find((claim) => claim.issue_id === 'lin-issue-2')).toMatchObject({
      state: 'handoff_failed',
      retry_queued: true,
      reason: expect.stringContaining('at capacity')
    });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(getPersistedState().claims.find((claim) => claim.issue_id === 'lin-issue-2')).toMatchObject({
      state: 'handoff_failed',
      retry_queued: true,
      reason: expect.stringContaining('at capacity')
    });
  });

  it('does not double-count a discovered active run that already matches a starting worker_host claim', async () => {
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
        issue_id: 'occupied-issue',
        issue_identifier: 'CO-occupied',
        issue_updated_at: '2026-03-19T04:00:00.000Z',
        updated_at: '2026-03-19T04:01:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(occupiedPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-19T04:00:00.000Z',
        worker_host: 'worker-host-01'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:occupied-issue',
      issue_id: 'occupied-issue',
      issue_identifier: 'CO-occupied',
      issue_title: 'Occupied issue',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:00:00.000Z',
      task_id: 'linear-occupied-issue',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: '2026-03-19T04:00:00.000Z',
      updated_at: '2026-03-19T04:01:00.000Z',
      last_delivery_id: null,
      last_event: null,
      last_action: null,
      last_webhook_timestamp: null,
      run_id: null,
      run_manifest_path: null,
      worker_host: 'worker-host-01',
      launch_source: 'control-host',
      launch_token: 'launch-occupied',
      launch_started_at: '2026-03-19T04:00:00.000Z',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null,
      review_promotion: null,
      merge_closeout: null
    });
    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const providerWorkflowConfigStore = {
      bootstrap: vi.fn(),
      refresh: vi.fn(),
      snapshot: () => ({
        status: 'ready' as const,
        pipeline_id: 'provider-linear-worker',
        source_path: '/repo/codex.orchestrator.json',
        snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        last_reload_attempt_at: null,
        last_success_at: null,
        last_error_at: null,
        last_error: null,
        terminal_cleanup: null,
        worker_hosts: [
          {
            name: 'worker-host-01',
            transport: 'ssh' as const,
            ssh_destination: 'codex@worker-host-01',
            ssh_options: [],
            max_concurrent_agents: 2,
            node_path: null
          }
        ]
      }),
      getLaunchConfigPath: vi.fn(),
      recordTerminalCleanupResult: vi.fn()
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      providerWorkflowConfigStore
    });

    await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-2',
        identifier: 'CO-3'
      }),
      deliveryId: 'delivery-2',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_000_001
    });

    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-2',
      issueIdentifier: 'CO-3',
      workerHost: 'worker-host-01'
    }));
    expect(providerWorkflowConfigStore.refresh).toHaveBeenCalledTimes(1);
    expect(state.claims.find((claim) => claim.issue_id === 'lin-issue-2')).toMatchObject({
      worker_host: 'worker-host-01',
      state: 'starting'
    });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(getPersistedState().claims.find((claim) => claim.issue_id === 'lin-issue-2')).toMatchObject({
      worker_host: 'worker-host-01',
      state: 'starting'
    });
  });

  it('refreshes tracked issue metadata while rehydrating an active run', async () => {
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
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(activePaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-19T04:20:00.000Z',
        worker_host: 'worker-host-02'
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
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:10:00.000Z',
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
      retry_queued: true,
      retry_attempt: null,
      retry_due_at: '2026-03-19T04:30:10.000Z',
      retry_error: 'stale continuation queue'
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
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:25:00.000Z'
        })
      })
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      run_id: 'run-active',
      run_manifest_path: activePaths.manifestPath,
      task_id: 'task-1303-active',
      worker_host: 'worker-host-02',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite known tracked issue metadata during active-run rehydrate when the live updated_at is unknown', async () => {
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
        issue_updated_at: '2026-03-19T04:20:00.000Z',
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
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:10:00.000Z',
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
      },
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'In Progress',
          state_type: 'started',
          updated_at: null
        })
      })
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:10:00.000Z',
      run_id: 'run-active',
      run_manifest_path: activePaths.manifestPath,
      task_id: 'task-1303-active'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('clears a stale claim worker_host when active-run rehydrate finds a fresh local proof', async () => {
    const { root, paths } = await createHostPaths();
    const activeEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active-local'
    };
    const activePaths = resolveRunPaths(activeEnv, 'run-active-local');
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active-local',
        task_id: 'task-1303-active-local',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        started_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(activePaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-19T04:30:30.000Z',
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
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-active-local',
      mapping_source: 'provider_id_fallback',
      state: 'resuming',
      reason: 'provider_issue_retry_resume_launched',
      accepted_at: launchedAt,
      updated_at: launchedAt,
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: 'run-active-local',
      run_manifest_path: activePaths.manifestPath,
      worker_host: 'worker-host-02'
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
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:25:00.000Z'
        })
      })
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      run_id: 'run-active-local',
      run_manifest_path: activePaths.manifestPath,
      task_id: 'task-1303-active-local',
      worker_host: null
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('keeps the persisted claim worker_host when discovered proof is older than launch_started_at', async () => {
    const { root, paths } = await createHostPaths();
    const activeEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active-stale-proof'
    };
    const activePaths = resolveRunPaths(activeEnv, 'run-active-stale-proof');
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active-stale-proof',
        task_id: 'task-1303-active-stale-proof',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        started_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(activePaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-19T04:25:00.000Z',
        updated_at: '2026-03-19T04:26:00.000Z',
        worker_host: 'worker-host-stale'
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
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-active-stale-proof',
      mapping_source: 'provider_id_fallback',
      state: 'resuming',
      reason: 'provider_issue_retry_resume_launched',
      accepted_at: launchedAt,
      updated_at: launchedAt,
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: 'run-active-stale-proof',
      run_manifest_path: activePaths.manifestPath,
      worker_host: 'worker-host-current',
      launch_started_at: '2026-03-19T04:30:30.000Z'
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
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:25:00.000Z'
        })
      })
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      run_id: 'run-active-stale-proof',
      run_manifest_path: activePaths.manifestPath,
      task_id: 'task-1303-active-stale-proof',
      worker_host: 'worker-host-current'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('keeps active-run rehydrate best-effort when tracked issue metadata refresh throws', async () => {
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
        issue_updated_at: '2026-03-19T04:20:00.000Z',
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
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:10:00.000Z',
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
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      resolveTrackedIssue: async () => {
        throw new Error('transient linear failure');
      }
    });

    await expect(service.rehydrate()).resolves.toBeUndefined();

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:10:00.000Z',
      run_id: 'run-active',
      run_manifest_path: activePaths.manifestPath,
      task_id: 'task-1303-active'
    });
    expect(warnSpy).toHaveBeenCalledWith(
      'Provider issue active-run metadata refresh failed for linear:lin-issue-1: transient linear failure'
    );
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

  it('ignores a fresh poll candidate when the issue is assigned to someone else', async () => {
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
      trackedIssues: [
        createTrackedIssue({
          assignee_id: 'viewer-2',
          assignee_name: 'Other Owner'
        })
      ]
    });

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      provider_key: 'linear:lin-issue-1',
      state: 'ignored',
      reason: 'provider_issue_assignee_changed',
      issue_assignee_id: 'viewer-2',
      issue_assignee_name: 'Other Owner',
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

  it('preserves newer polling state when claim persistence rolls back after a concurrent polling update', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:00:00.000Z'));

    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    let persistCallCount = 0;
    const persist = vi.fn(async () => {
      persistCallCount += 1;
      if (persistCallCount === 2) {
        state.polling = {
          checking: true,
          stuck: true,
          restart_required: true,
          reason: 'provider_refresh_lifecycle_stuck',
          updated_at: '2026-03-19T04:00:10.000Z'
        };
        state.updated_at = '2026-03-19T04:00:10.000Z';
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
    expect(state.polling).toMatchObject({
      checking: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      updated_at: '2026-03-19T04:00:10.000Z'
    });
    expect(state.updated_at).toBe('2026-03-19T04:00:10.000Z');

    await expect(
      service.poll?.({
        trackedIssues: [createTrackedIssue()]
      })
    ).resolves.toBeUndefined();

    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(state.polling).toMatchObject({
      checking: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      updated_at: '2026-03-19T04:00:10.000Z'
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

  it('requests bounded fresh discovery after claim reconcile and conservatively blocks capped states under a partial snapshot', async () => {
    const { root, paths } = await createHostPaths();
    const occupiedPaths = resolveRunPaths(
      {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'task-partial-state'
      },
      'run-partial-state'
    );
    await mkdir(occupiedPaths.runDir, { recursive: true });
    await writeFile(
      occupiedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-partial-state',
        task_id: 'task-partial-state',
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
    const refetchTrackedIssues = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-issue-fresh',
          identifier: 'CO-2',
          priority: 1
        })
      ]
    }));

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
      trackedIssues: [],
      refetchTrackedIssues,
      deferFreshDiscovery: true
    });

    expect(refetchTrackedIssues).toHaveBeenCalledTimes(1);
    expect(refetchTrackedIssues).toHaveBeenCalledWith({
      mode: 'fresh_discovery',
      eligibleTargetCount: 1,
      eligibleStateSlotCounts: {},
      excludedIssueIds: ['lin-issue-occupied']
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('skips bounded fresh discovery when occupied work already consumes the global slot budget', async () => {
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
    const refetchTrackedIssues = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssues: [
        createTrackedIssue({
          id: 'lin-issue-fresh',
          identifier: 'CO-2',
          priority: 1
        })
      ]
    }));

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
      trackedIssues: [],
      refetchTrackedIssues,
      deferFreshDiscovery: true
    });

    expect(refetchTrackedIssues).not.toHaveBeenCalled();
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

  it('blocks direct webhook admission when real in-progress manifests already put the host over cap', async () => {
    const { root, paths } = await createHostPaths();
    const occupiedOneEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-occupied-1'
    };
    const occupiedOnePaths = resolveRunPaths(occupiedOneEnv, 'run-occupied-1');
    await mkdir(occupiedOnePaths.runDir, { recursive: true });
    await writeFile(
      occupiedOnePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-occupied-1',
        task_id: 'task-occupied-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-occupied-1',
        issue_identifier: 'CO-1',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    const occupiedTwoEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-occupied-2'
    };
    const occupiedTwoPaths = resolveRunPaths(occupiedTwoEnv, 'run-occupied-2');
    await mkdir(occupiedTwoPaths.runDir, { recursive: true });
    await writeFile(
      occupiedTwoPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-occupied-2',
        task_id: 'task-occupied-2',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-occupied-2',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:21:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push(
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-occupied-1',
        issue_id: 'lin-issue-occupied-1',
        issue_identifier: 'CO-1',
        issue_title: 'Already running one',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        task_id: 'task-occupied-1',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: 'delivery-occupied-1',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_050_000,
        run_id: 'run-occupied-1',
        run_manifest_path: occupiedOnePaths.manifestPath,
        launch_source: null,
        launch_token: null
      },
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-occupied-2',
        issue_id: 'lin-issue-occupied-2',
        issue_identifier: 'CO-2',
        issue_title: 'Already running two',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:21:00.000Z',
        task_id: 'task-occupied-2',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-03-19T04:21:05.000Z',
        updated_at: '2026-03-19T04:21:10.000Z',
        last_delivery_id: 'delivery-occupied-2',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_110_000,
        run_id: 'run-occupied-2',
        run_manifest_path: occupiedTwoPaths.manifestPath,
        launch_source: null,
        launch_token: null
      }
    );

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-fresh',
        identifier: 'CO-3',
        updated_at: '2026-03-19T04:32:00.000Z'
      }),
      deliveryId: 'delivery-fresh-blocked',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_320_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_start_blocked:max_concurrency',
      claim: {
        provider_key: 'linear:lin-issue-fresh',
        state: 'accepted',
        reason: 'provider_issue_start_blocked:max_concurrency',
        task_id: 'linear-lin-issue-fresh',
        run_id: null,
        run_manifest_path: null
      }
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-occupied-1')).toMatchObject({
      state: 'running',
      run_id: 'run-occupied-1',
      run_manifest_path: occupiedOnePaths.manifestPath
    });
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-occupied-2')).toMatchObject({
      state: 'running',
      run_id: 'run-occupied-2',
      run_manifest_path: occupiedTwoPaths.manifestPath
    });
    expect(getPersistedState().claims.find((claim) => claim.provider_key === 'linear:lin-issue-fresh')).toMatchObject({
      state: 'accepted',
      reason: 'provider_issue_start_blocked:max_concurrency',
      task_id: 'linear-lin-issue-fresh'
    });
  });

  it('counts active provider workers from a different start pipeline against host-global admission capacity', async () => {
    const { root, paths } = await createHostPaths();
    const foreignEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-foreign-pipeline'
    };
    const foreignPaths = resolveRunPaths(foreignEnv, 'run-foreign-pipeline');
    await mkdir(foreignPaths.runDir, { recursive: true });
    await writeFile(
      foreignPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-foreign-pipeline',
        task_id: 'task-foreign-pipeline',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-foreign',
        issue_identifier: 'CO-1',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
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

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-fresh',
        identifier: 'CO-2',
        updated_at: '2026-03-19T04:32:00.000Z'
      }),
      deliveryId: 'delivery-foreign-pipeline-blocked',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_320_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_start_blocked:max_concurrency',
      claim: {
        provider_key: 'linear:lin-issue-fresh',
        state: 'accepted',
        reason: 'provider_issue_start_blocked:max_concurrency',
        task_id: 'linear-lin-issue-fresh',
        run_id: null,
        run_manifest_path: null
      }
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('treats terminal claim state for a foreign active run as unknown when enforcing per-state admission caps', async () => {
    const { root, paths } = await createHostPaths();
    const foreignEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-foreign-pipeline'
    };
    const foreignPaths = resolveRunPaths(foreignEnv, 'run-foreign-pipeline');
    await mkdir(foreignPaths.runDir, { recursive: true });
    await writeFile(
      foreignPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-foreign-pipeline',
        task_id: 'task-foreign-pipeline',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-foreign',
        issue_identifier: 'CO-1',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-foreign',
      issue_id: 'lin-issue-foreign',
      issue_identifier: 'CO-1',
      issue_title: 'Stale terminal claim',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-foreign-pipeline',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_run_already_completed',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-foreign-terminal',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-foreign-pipeline',
      run_manifest_path: foreignPaths.manifestPath,
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
          max_concurrent_agents: 2,
          max_concurrent_agents_by_state: {
            'in progress': 1
          }
        }
      })
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-fresh',
        identifier: 'CO-2',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-19T04:32:00.000Z'
      }),
      deliveryId: 'delivery-foreign-state-cap-blocked',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_320_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_start_blocked:max_concurrency',
      claim: {
        provider_key: 'linear:lin-issue-fresh',
        state: 'accepted',
        reason: 'provider_issue_start_blocked:max_concurrency'
      }
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('serializes concurrent direct webhook admissions so only one launch can consume the remaining slot', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    let resolveFirstStart: ((value: { runId: string; manifestPath: string }) => void) | null = null;
    const launcher = {
      start: vi.fn(async ({ issueId }: { issueId: string }) => {
        if (issueId === 'lin-issue-first') {
          return await new Promise<{ runId: string; manifestPath: string }>((resolve) => {
            resolveFirstStart = resolve;
          });
        }
        return {
          runId: 'run-second',
          manifestPath: '/tmp/provider-run/second.json'
        };
      }),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    const firstPromise = service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-first',
        identifier: 'CO-1',
        updated_at: '2026-03-19T04:32:00.000Z'
      }),
      deliveryId: 'delivery-first',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_320_000
    });

    await vi.waitFor(() => {
      expect(launcher.start).toHaveBeenCalledTimes(1);
    });

    const secondPromise = service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-second',
        identifier: 'CO-2',
        updated_at: '2026-03-19T04:32:01.000Z'
      }),
      deliveryId: 'delivery-second',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_321_000
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(launcher.start).toHaveBeenCalledTimes(1);

    if (!resolveFirstStart) {
      throw new Error('Expected the first launch to be pending.');
    }
    resolveFirstStart({
      runId: 'run-first',
      manifestPath: '/tmp/provider-run/first.json'
    });

    const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);

    expect(firstResult).toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched',
      claim: {
        provider_key: 'linear:lin-issue-first',
        state: 'starting',
        run_id: 'run-first',
        run_manifest_path: '/tmp/provider-run/first.json'
      }
    });
    expect(secondResult).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_start_blocked:max_concurrency',
      claim: {
        provider_key: 'linear:lin-issue-second',
        state: 'accepted',
        reason: 'provider_issue_start_blocked:max_concurrency'
      }
    });
    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('skips unreadable manifests when direct webhook admission computes host capacity', async () => {
    const { root, paths } = await createHostPaths();
    const brokenEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-bad-manifest'
    };
    const brokenPaths = resolveRunPaths(brokenEnv, 'run-bad-manifest');
    await mkdir(brokenPaths.runDir, { recursive: true });
    await writeFile(brokenPaths.manifestPath, '{"run_id":"run-bad-manifest"', 'utf8');

    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-fresh',
        manifestPath: '/tmp/provider-run/fresh.json'
      })),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state: createProviderIntakeState(),
      persist: vi.fn(async () => undefined),
      launcher,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-fresh',
        identifier: 'CO-3',
        updated_at: '2026-03-19T04:32:00.000Z'
      }),
      deliveryId: 'delivery-fresh-after-bad-manifest',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_320_000
    });

    expect(result).toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched',
      claim: {
        provider_key: 'linear:lin-issue-fresh',
        state: 'starting',
        run_id: 'run-fresh',
        run_manifest_path: '/tmp/provider-run/fresh.json'
      }
    });
    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `[provider-issue-run-discovery] skipping unreadable manifest ${brokenPaths.manifestPath}:`
      )
    );
  });

  it('does not treat a stale running claim without a live run as occupied capacity for direct webhook admission', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-stale',
      issue_id: 'lin-issue-stale',
      issue_identifier: 'CO-1',
      issue_title: 'Stale running claim',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:10:00.000Z',
      task_id: 'task-stale',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:10:05.000Z',
      updated_at: '2026-03-19T04:10:10.000Z',
      last_delivery_id: 'delivery-stale',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_010_000,
      run_id: 'run-stale',
      run_manifest_path: '/tmp/provider-run/run-stale.json',
      launch_source: null,
      launch_token: null
    });

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
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      })
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-fresh',
        identifier: 'CO-2',
        updated_at: '2026-03-19T04:32:00.000Z'
      }),
      deliveryId: 'delivery-fresh',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_320_000
    });

    expect(result).toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched',
      claim: {
        provider_key: 'linear:lin-issue-fresh',
        state: 'starting',
        reason: 'provider_issue_start_launched',
        run_id: 'run-lin-issue-fresh',
        run_manifest_path: '/tmp/provider-run/lin-issue-fresh.json'
      }
    });
    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(launcher.start.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      issueId: 'lin-issue-fresh'
    }));
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('does not double-count a run-id-only in-flight claim when the same live run is discovered', async () => {
    const { root, paths } = await createHostPaths();
    const activeEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-active'
    };
    const activePaths = resolveRunPaths(activeEnv, 'run-active');
    await mkdir(activePaths.runDir, { recursive: true });
    await writeFile(
      activePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'task-active',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-active',
        issue_identifier: 'CO-1',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-active',
      issue_id: 'lin-issue-active',
      issue_identifier: 'CO-1',
      issue_title: 'Existing active issue',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-active',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-active',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-active',
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token-active'
    });

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
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 2
        }
      })
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        id: 'lin-issue-fresh',
        identifier: 'CO-2',
        updated_at: '2026-03-19T04:32:00.000Z'
      }),
      deliveryId: 'delivery-fresh',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_320_000
    });

    expect(result).toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched',
      claim: {
        provider_key: 'linear:lin-issue-fresh',
        state: 'starting',
        reason: 'provider_issue_start_launched',
        run_id: 'run-lin-issue-fresh',
        run_manifest_path: '/tmp/provider-run/lin-issue-fresh.json'
      }
    });
    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(launcher.start.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      issueId: 'lin-issue-fresh'
    }));
    expect(launcher.resume).not.toHaveBeenCalled();
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
      () => state.claims[0]?.retry_error === 'retry poll failed: dispatch_source_credentials_missing',
      QUEUED_RETRY_SETTLE_TURNS
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
      () => state.claims[0]?.retry_error === 'retry poll failed: dispatch_source_credentials_missing',
      QUEUED_RETRY_SETTLE_TURNS
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

  it('ignores accepted Ready issues when any blocker is still non-terminal', async () => {
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
        state: 'Ready',
        state_type: 'unstarted',
        blocked_by: [
          {
            id: 'lin-blocker-1',
            identifier: 'CO-9',
            state: 'In Progress'
          }
        ]
      }),
      deliveryId: 'delivery-ready-blocked',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_012_000
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
      issue_state: 'Ready',
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

  it('ignores custom started states that are outside the explicit active-state allowlist', async () => {
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

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_state_not_active'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'ignored',
      reason: 'provider_issue_state_not_active',
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
    'keeps an active claim lifecycle-owned when a direct webhook moves the issue to %s for the same assignee',
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
      await writeFile(
        join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
        JSON.stringify({
          attempt_started_at: '2026-03-19T04:20:00.000Z',
          worker_host: 'worker-host-07'
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
          reason: 'provider_issue_rehydrated_active_run'
        });
        await vi.waitFor(() => {
          expect(endpoint.actions).toEqual([]);
          expect(otherEndpoint.actions).toEqual([]);
        });
      } finally {
        await endpoint.close();
        await otherEndpoint.close();
      }

      expect(state.claims[0]).toMatchObject({
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        issue_state: reviewState,
        issue_state_type: 'started',
        issue_assignee_id: 'viewer-1',
        issue_assignee_name: 'Codex',
        run_id: 'run-webhook-review-release',
        run_manifest_path: childPaths.manifestPath,
        worker_host: 'worker-host-07'
      });
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
    }
  );

  it('clears stale merge_closeout residue when an owned active run receives newer active issue truth', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-138-active-run-webhook-stale-merge-closeout'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-138-active-run-webhook-stale-merge-closeout');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-138-active-run-webhook-stale-merge-closeout',
        task_id: 'task-138-active-run-webhook-stale-merge-closeout',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_updated_at: '2026-03-19T04:30:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-138',
      issue_title: 'Stale merge closeout',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:35:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-138-active-run-webhook-stale-merge-closeout',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-138-active-run-webhook-stale-merge-closeout',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-138-active-run-webhook-stale-merge-closeout',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'action_required',
        reason: 'merge_state_behind',
        summary: 'Attached PR #357 is behind origin/main and cannot merge yet.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/357',
          owner: 'asabeko',
          repo: 'CO',
          number: 357
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BEHIND',
          ready_to_merge: false,
          gate_reasons: ['mergeStateStatus=BEHIND'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
        identifier: 'CO-138',
        title: 'Stale merge closeout',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-19T04:40:00.000Z',
        assignee_id: null,
        assignee_name: null
      }),
      deliveryId: 'delivery-138-active-run-webhook-stale-merge-closeout-newer',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_100_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_run_already_active',
      claim: {
        state: 'running',
        reason: 'provider_issue_run_already_active',
        issue_updated_at: '2026-03-19T04:40:00.000Z'
      }
    });
    expect(result.claim?.merge_closeout ?? null).toBeNull();
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_run_already_active',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z'
    });
    expect(state.claims[0]?.merge_closeout ?? null).toBeNull();
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_run_already_active',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z'
    });
    expect(getPersistedState().claims[0]?.merge_closeout ?? null).toBeNull();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });



  it('keeps merge_closeout authoritative when an owned active run webhook stays in Merging for the same assignee', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-138-active-run-webhook-current-merge-closeout-owned'
    };
    const childPaths = resolveRunPaths(
      childEnv,
      'run-138-active-run-webhook-current-merge-closeout-owned'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-138-active-run-webhook-current-merge-closeout-owned',
        task_id: 'task-138-active-run-webhook-current-merge-closeout-owned',
        pipeline_id: 'diagnostics',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-138',
      issue_title: 'Current merge closeout',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-138-active-run-webhook-current-merge-closeout-owned',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_run_already_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-138-active-run-webhook-current-merge-closeout-owned',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_049_000,
      run_id: 'run-138-active-run-webhook-current-merge-closeout-owned',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'webhook-current-merge-closeout-owned-token',
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'action_required',
        reason: 'merge_state_behind',
        summary: 'Attached PR #357 is behind origin/main and cannot merge yet.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/357',
          owner: 'asabeko',
          repo: 'CO',
          number: 357
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BEHIND',
          ready_to_merge: false,
          gate_reasons: ['mergeStateStatus=BEHIND'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
        identifier: 'CO-138',
        title: 'Current merge closeout',
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-03-19T04:30:30.000Z',
        assignee_id: 'viewer-1',
        assignee_name: 'Codex'
      }),
      deliveryId: 'delivery-138-active-run-webhook-current-merge-closeout-owned',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_100_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_merge_closeout_action_required',
      claim: {
        state: 'handoff_failed',
        reason: 'provider_issue_merge_closeout_action_required',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z'
      }
    });
    expect(result.claim?.merge_closeout).toMatchObject({
      status: 'action_required',
      reason: 'merge_state_behind',
      snapshot: {
        merge_state_status: 'BEHIND'
      }
    });
    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z'
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'action_required',
      reason: 'merge_state_behind',
      snapshot: {
        merge_state_status: 'BEHIND'
      }
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z'
    });
    expect(getPersistedState().claims[0]?.merge_closeout).toMatchObject({
      status: 'action_required',
      reason: 'merge_state_behind',
      snapshot: {
        merge_state_status: 'BEHIND'
      }
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });
  it.each(['Human Review', 'In Review'])(
    'releases an active run when a direct webhook moves the issue to %s for a different assignee',
    async (reviewState) => {
      const { root, paths } = await createHostPaths();
      const childEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'task-webhook-review-assignee-release'
      };
      const childPaths = resolveRunPaths(childEnv, 'run-webhook-review-assignee-release');
      await mkdir(childPaths.runDir, { recursive: true });
      await writeFile(
        childPaths.manifestPath,
        JSON.stringify({
          run_id: 'run-webhook-review-assignee-release',
          task_id: 'task-webhook-review-assignee-release',
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
        issue_assignee_id: 'viewer-1',
        issue_assignee_name: 'Codex',
        task_id: 'task-webhook-review-assignee-release',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_run_already_active',
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: 'delivery-in-progress',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_049_000,
        run_id: 'run-webhook-review-assignee-release',
        run_manifest_path: childPaths.manifestPath,
        launch_source: 'control-host',
        launch_token: 'webhook-review-assignee-release-token'
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
            updated_at: '2026-03-19T04:30:00.000Z',
            assignee_id: 'viewer-2',
            assignee_name: 'Other Owner'
          }),
          deliveryId: `delivery-${reviewState.toLowerCase().replace(/\s+/gu, '-')}-assignee-release`,
          event: 'Issue',
          action: 'update',
          webhookTimestamp: 1_742_360_050_500
        });

        expect(result).toMatchObject({
          kind: 'ignored',
          reason: 'provider_issue_released:assignee_changed'
        });
        await vi.waitFor(() => {
          expect(endpoint.actions).toEqual([
            expect.objectContaining({
              action: 'cancel',
              reason: 'provider_issue_released:assignee_changed'
            })
          ]);
        });
      } finally {
        await endpoint.close();
      }

      expect(state.claims[0]).toMatchObject({
        state: 'released',
        reason: 'provider_issue_released:assignee_changed',
        issue_state: reviewState,
        issue_state_type: 'started',
        issue_assignee_id: 'viewer-2',
        issue_assignee_name: 'Other Owner',
        run_id: 'run-webhook-review-assignee-release',
        run_manifest_path: childPaths.manifestPath
      });
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
    }
  );

  it.each(['Human Review', 'In Review'])(
    'keeps an active claim lifecycle-owned when a direct webhook moves the issue to %s with assignee_id null',
    async (reviewState) => {
      const { root, paths } = await createHostPaths();
      const childEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'task-webhook-review-unassigned-owned'
      };
      const childPaths = resolveRunPaths(childEnv, 'run-webhook-review-unassigned-owned');
      await mkdir(childPaths.runDir, { recursive: true });
      await writeFile(
        childPaths.manifestPath,
        JSON.stringify({
          run_id: 'run-webhook-review-unassigned-owned',
          task_id: 'task-webhook-review-unassigned-owned',
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
        issue_assignee_id: 'viewer-1',
        issue_assignee_name: 'Codex',
        task_id: 'task-webhook-review-unassigned-owned',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_run_already_active',
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: 'delivery-in-progress',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_049_000,
        run_id: 'run-webhook-review-unassigned-owned',
        run_manifest_path: childPaths.manifestPath,
        launch_source: 'control-host',
        launch_token: 'webhook-review-unassigned-owned-token'
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
            updated_at: '2026-03-19T04:30:00.000Z',
            assignee_id: null,
            assignee_name: null
          }),
          deliveryId: `delivery-${reviewState.toLowerCase().replace(/\s+/gu, '-')}-unassigned-owned`,
          event: 'Issue',
          action: 'update',
          webhookTimestamp: 1_742_360_050_500
        });

        expect(result).toMatchObject({
          kind: 'ignored',
          reason: 'provider_issue_rehydrated_active_run'
        });
        await vi.waitFor(() => {
          expect(endpoint.actions).toEqual([]);
        });
      } finally {
        await endpoint.close();
      }

      expect(state.claims[0]).toMatchObject({
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        issue_state: reviewState,
        issue_state_type: 'started',
        issue_assignee_id: null,
        issue_assignee_name: null,
        run_id: 'run-webhook-review-unassigned-owned',
        run_manifest_path: childPaths.manifestPath
      });
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
    }
  );

  it('keeps an active claim lifecycle-owned when a direct webhook moves the issue to Merging with assignee_id null', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-webhook-merging-unassigned-owned'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-webhook-merging-unassigned-owned');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-webhook-merging-unassigned-owned',
        task_id: 'task-webhook-merging-unassigned-owned',
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
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-19T04:20:00.000Z',
        worker_host: 'worker-host-07'
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
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-webhook-merging-unassigned-owned',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_run_already_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-in-progress',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_049_000,
      run_id: 'run-webhook-merging-unassigned-owned',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'webhook-merging-unassigned-owned-token',
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:00.000Z',
        status: 'action_required',
        reason: 'merge_state_behind',
        summary: 'Attached PR #357 is behind origin/main and cannot merge yet.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/357',
          owner: 'asabeko',
          repo: 'CO',
          number: 357
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BEHIND',
          ready_to_merge: false,
          gate_reasons: ['mergeStateStatus=BEHIND'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-03-19T04:30:00.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
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
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:00.000Z',
          assignee_id: null,
          assignee_name: null
        }),
        deliveryId: 'delivery-merging-unassigned-owned',
        event: 'Issue',
        action: 'update',
        webhookTimestamp: 1_742_360_050_500
      });

      expect(result).toMatchObject({
        kind: 'ignored',
        reason: 'provider_issue_merge_closeout_action_required',
        claim: {
          state: 'handoff_failed',
          reason: 'provider_issue_merge_closeout_action_required',
          issue_state: 'Merging',
          issue_state_type: 'started'
        }
      });
      await vi.waitFor(() => {
        expect(endpoint.actions).toEqual([]);
      });
    } finally {
      await endpoint.close();
    }

    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_assignee_id: null,
      issue_assignee_name: null,
      run_id: 'run-webhook-merging-unassigned-owned',
      run_manifest_path: childPaths.manifestPath,
      worker_host: 'worker-host-07'
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'action_required',
      reason: 'merge_state_behind',
      snapshot: {
        merge_state_status: 'BEHIND'
      }
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

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
        reason: 'provider_issue_handoff_owned'
      });
      await vi.waitFor(() => {
        expect(otherEndpoint.actions).toEqual([]);
      });
    } finally {
      await otherEndpoint.close();
    }

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_handoff_owned',
      issue_state: 'Human Review',
      issue_state_type: 'started',
      run_id: 'run-webhook-review-foreign-pipeline',
      run_manifest_path: otherPaths.manifestPath
    });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('ignores issues when the provider state name is missing even if Linear marks them started', async () => {
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

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_state_not_active'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'ignored',
      reason: 'provider_issue_state_not_active',
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

  it('clears stale merge_closeout metadata when a fresh accepted-issue launch starts a new run', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null,
      merge_closeout: {
        recorded_at: '2026-03-19T04:20:00.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        status: 'action_required',
        reason: 'pr_closed_unmerged',
        summary: 'Attached PR #357 is closed without merging; reopen it or attach a replacement PR.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
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
          updated_at: '2026-03-19T04:20:00.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    });
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-child-fresh-launch',
        manifestPath: '/tmp/provider-run/fresh-launch-manifest.json'
      })),
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
        updated_at: '2026-03-19T04:40:00.000Z'
      }),
      deliveryId: 'delivery-fresh-launch-after-closeout',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_200_000
    });

    expect(result).toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_start_launched',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      run_id: 'run-child-fresh-launch',
      run_manifest_path: '/tmp/provider-run/fresh-launch-manifest.json'
    });
    expect(state.claims[0]?.merge_closeout ?? null).toBeNull();
    expect(result.claim?.merge_closeout ?? null).toBeNull();
    expect(launcher.resume).not.toHaveBeenCalled();
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
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:19:00.000Z',
      task_id: 'stale-task-active',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_run_already_active',
      accepted_at: '2026-03-19T04:18:05.000Z',
      updated_at: '2026-03-19T04:18:10.000Z',
      last_delivery_id: 'delivery-stale-active',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_100_000,
      run_id: 'stale-run-active',
      run_manifest_path: '/tmp/provider-run/stale-run-active.json',
      launch_source: 'control-host',
      launch_token: 'stale-run-active-token',
      retry_queued: true,
      retry_attempt: null,
      retry_due_at: '2026-03-19T04:30:10.000Z',
      retry_error: 'stale continuation queue'
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
      task_id: 'task-1303-active',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
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

    // Webhook-first targeted reconcile may queue an additional follow-up callback,
    // but explicit restart rehydrate still needs at least one retryable wake-up.
    expect(scheduledCallbacks.length).toBeGreaterThanOrEqual(1);
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

    const scheduledCallbacksBeforeRehydrate = scheduledCallbacks.length;
    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_rehydrated_queued_run',
      run_id: 'run-child',
      run_manifest_path: childPaths.manifestPath,
      task_id: 'task-1303-child'
    });
    // Webhook-first targeted reconcile may queue an additional follow-up callback,
    // but explicit restart rehydrate still needs at least one retryable wake-up.
    expect(scheduledCallbacks.length).toBeGreaterThanOrEqual(
      scheduledCallbacksBeforeRehydrate + 1
    );
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

  it('skips manifest parse errors instead of blocking rehydrate', async () => {
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
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

    const service = createProviderIssueHandoffService({
      paths,
      state: createProviderIntakeState(),
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      }
    });

    await expect(service.rehydrate()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `[provider-issue-run-discovery] skipping unreadable manifest ${childPaths.manifestPath}:`
      )
    );
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
    await waitForMockCalls(launcher.start, 1, 1_024);
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

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);

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
    expect(getPersistedState().claims[0]?.issue_blocked_by).toEqual([
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
      state: getPersistedState(),
      persist: vi.fn(async () => undefined),
      launcher: restartedLauncher,
      startPipelineId: 'diagnostics'
    });

    await vi.advanceTimersByTimeAsync(1_001);
    await flushAsyncWork();
    await waitForCondition(
      () =>
        getPersistedState().claims[0]?.state === 'released' &&
        getPersistedState().claims[0]?.reason === 'provider_issue_released:todo_blocked_by_non_terminal'
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

    await service.rehydrate();
    await waitForMockCalls(setTimeoutSpy);

    const scheduledTimeoutCount = setTimeoutSpy.mock.calls.length;
    const [, delayMs] = setTimeoutSpy.mock.calls[scheduledTimeoutCount - 1] ?? [];
    expect(delayMs).toBeGreaterThanOrEqual(999);
    expect(delayMs).toBeLessThanOrEqual(1_000);
    vi.setSystemTime(new Date('2026-03-19T04:30:01.001Z'));
    const startCallsBeforeRetry = launcher.start.mock.calls.length;
    getLatestScheduledTimeoutCallback(setTimeoutSpy)();
    await flushAsyncWork();
    await waitForMockCalls(launcher.start, startCallsBeforeRetry + 1, QUEUED_RETRY_SETTLE_TURNS);

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

  it('waits for the active refresh lifecycle lock before dispatching queued retry timers', async () => {
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

    let persistCallCount = 0;
    let activePersistCalls = 0;
    let maxActivePersistCalls = 0;
    let releaseBlockedPersist: (() => void) | null = null;
    const persist = vi.fn(async () => {
      persistCallCount += 1;
      activePersistCalls += 1;
      maxActivePersistCalls = Math.max(maxActivePersistCalls, activePersistCalls);
      try {
        if (persistCallCount === 2) {
          await new Promise<void>((resolve) => {
            releaseBlockedPersist = resolve;
          });
        }
      } finally {
        activePersistCalls -= 1;
      }
    });
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-rehydrated',
        manifestPath: '/tmp/provider-run/rehydrated-manifest.json'
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

    await service.rehydrate();
    await waitForMockCalls(setTimeoutSpy);

    const refreshPromise = service.refresh();
    await waitForCondition(() => persist.mock.calls.length >= 2 && activePersistCalls === 1);

    const blockedPersistCalls = persist.mock.calls.length;
    vi.setSystemTime(new Date('2026-03-19T04:30:01.001Z'));
    getLatestScheduledTimeoutCallback(setTimeoutSpy)();
    await flushAsyncWork();

    expect(launcher.start).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledTimes(blockedPersistCalls);
    expect(maxActivePersistCalls).toBe(1);

    if (!releaseBlockedPersist) {
      throw new Error('Expected refresh persist to be blocked.');
    }
    releaseBlockedPersist();
    await refreshPromise;
    await waitForMockCalls(launcher.start, 1, QUEUED_RETRY_SETTLE_TURNS);

    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(maxActivePersistCalls).toBe(1);
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
      startPipelineId: 'diagnostics'
    });
    const timerCountAfterConstruction = setTimeoutSpy.mock.calls.length;
    expect(timerCountAfterConstruction).toBeGreaterThanOrEqual(1);

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy, timerCountAfterConstruction);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();

    const scheduledTimeoutCount = setTimeoutSpy.mock.calls.length;
    expect(scheduledTimeoutCount).toBe(timerCountAfterConstruction);
    const [, delayMs] = setTimeoutSpy.mock.calls[scheduledTimeoutCount - 1] ?? [];
    expect(delayMs).toBeGreaterThanOrEqual(999);
    expect(delayMs).toBeLessThanOrEqual(1_000);
    const persistCallsBeforeRetry = persist.mock.calls.length;
    getLatestScheduledTimeoutCallback(setTimeoutSpy)();
    await flushAsyncWork();
    await waitForMockCalls(persist, persistCallsBeforeRetry + 1, 1_024);
    await waitForCondition(
      () =>
        state.claims[0]?.state === 'released' &&
        state.claims[0]?.reason === 'provider_issue_released:todo_blocked_by_non_terminal',
      1_024
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
    const timerCountAfterConstruction = setTimeoutSpy.mock.calls.length;
    expect(timerCountAfterConstruction).toBeGreaterThanOrEqual(1);

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy, timerCountAfterConstruction);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();

    const scheduledTimeoutCount = setTimeoutSpy.mock.calls.length;
    expect(scheduledTimeoutCount).toBe(timerCountAfterConstruction);
    const [, delayMs] = setTimeoutSpy.mock.calls[scheduledTimeoutCount - 1] ?? [];
    expect(delayMs).toBeGreaterThanOrEqual(999);
    expect(delayMs).toBeLessThanOrEqual(1_000);
    vi.setSystemTime(new Date('2026-03-19T04:30:01.001Z'));
    getLatestScheduledTimeoutCallback(setTimeoutSpy)();
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

  it('continues snapshot-only queued retries when persisted viewer identity still matches the assignee', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));
    vi.stubEnv('CO_LINEAR_API_TOKEN', 'linear-token-1');

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
      issue_viewer_id: 'viewer-1',
      issue_viewer_auth_fingerprint: createLinearTokenFingerprint('linear-token-1'),
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
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
    vi.setSystemTime(new Date('2026-03-19T04:30:01.001Z'));
    getLatestScheduledTimeoutCallback(setTimeoutSpy)();
    await flushAsyncWork();
    await waitForMockCalls(launcher.start, 1, 1024);

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2'
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_post_worker_exit_start_launched',
      issue_viewer_id: 'viewer-1',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      run_id: 'run-continuation',
      run_manifest_path: '/tmp/provider-run/continuation-manifest.json',
      retry_queued: false
    });
  });

  it('keeps snapshot-only queued retries conservative when the current viewer auth fingerprint no longer matches', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));
    vi.stubEnv('CO_LINEAR_API_TOKEN', 'linear-token-2');

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
      issue_viewer_id: 'viewer-1',
      issue_viewer_auth_fingerprint: createLinearTokenFingerprint('linear-token-1'),
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
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
      start: vi.fn(async () => null),
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
    await vi.advanceTimersByTimeAsync(1_001);
    await flushAsyncWork();
    await waitForCondition(
      () =>
        state.claims[0]?.state === 'released' &&
        state.claims[0]?.reason === 'provider_issue_released:assignee_changed',
      1_024
    );

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:assignee_changed',
      issue_viewer_id: null,
      issue_viewer_auth_fingerprint: null,
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex'
    });
  });

  it('releases snapshot-only queued retries when persisted viewer identity shows the issue is assigned elsewhere', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));
    vi.stubEnv('CO_LINEAR_API_TOKEN', 'linear-token-1');

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
      issue_viewer_id: 'viewer-1',
      issue_viewer_auth_fingerprint: createLinearTokenFingerprint('linear-token-1'),
      issue_assignee_id: 'viewer-2',
      issue_assignee_name: 'Other Owner',
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
      start: vi.fn(async () => null),
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
    const timerCountAfterConstruction = setTimeoutSpy.mock.calls.length;
    expect(timerCountAfterConstruction).toBeGreaterThanOrEqual(1);
    const retryTimerCallback = setTimeoutSpy.mock.calls[timerCountAfterConstruction - 1]?.[0];
    expect(typeof retryTimerCallback).toBe('function');

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy, timerCountAfterConstruction);
    expect(setTimeoutSpy.mock.calls.length).toBe(timerCountAfterConstruction);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    vi.setSystemTime(new Date('2026-03-19T04:30:01.001Z'));
    (retryTimerCallback as () => void)();
    await flushAsyncWork();
    await waitForCondition(
      () =>
        state.claims[0]?.state === 'released' &&
        state.claims[0]?.reason === 'provider_issue_released:assignee_changed',
      1_024
    );

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:assignee_changed',
      issue_viewer_id: 'viewer-1',
      issue_assignee_id: 'viewer-2',
      issue_assignee_name: 'Other Owner',
      retry_queued: null,
      retry_due_at: null
    });
  });

  it('keeps legacy snapshot-only queued retries conservative when persisted viewer identity is absent', async () => {
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
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
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
      start: vi.fn(async () => null),
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
    const timerCountAfterConstruction = setTimeoutSpy.mock.calls.length;
    expect(timerCountAfterConstruction).toBeGreaterThanOrEqual(1);
    const retryTimerCallback = setTimeoutSpy.mock.calls[timerCountAfterConstruction - 1]?.[0];
    expect(typeof retryTimerCallback).toBe('function');

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy, timerCountAfterConstruction);
    expect(setTimeoutSpy.mock.calls.length).toBe(timerCountAfterConstruction);
    vi.setSystemTime(new Date('2026-03-19T04:30:01.001Z'));
    (retryTimerCallback as () => void)();
    await flushAsyncWork();
    await waitForCondition(
      () =>
        state.claims[0]?.state === 'released' &&
        state.claims[0]?.reason === 'provider_issue_released:assignee_changed',
      1_024
    );

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:assignee_changed',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex'
    });
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

  it('preserves a fresher terminal merge_closeout record when an older accepted replay is ignored as already completed', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed-terminal-merge-closeout'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed-terminal-merge-closeout');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed-terminal-merge-closeout',
        task_id: 'task-1303-completed-terminal-merge-closeout',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-completed-terminal-merge-closeout',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_run_already_completed',
      accepted_at: '2026-03-19T04:00:10.000Z',
      updated_at: '2026-03-19T04:00:15.000Z',
      last_delivery_id: 'delivery-terminal-merge-closeout-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_000_000,
      run_id: 'run-completed-terminal-merge-closeout',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'merged',
        reason: 'merged_and_shared_root_reconciled_transition_deferred',
        summary:
          'Attached PR #357 was already merged and the shared root is reconciled; local merge closeout is authoritative while the Linear Done transition is deferred by shared-budget cooldown.',
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
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: '2026-03-19T04:30:30.000Z',
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: {
          status: 'reconciled',
          attempted_at: '2026-03-19T04:30:20.000Z',
          before_status: '## main...origin/main',
          after_status: '## main...origin/main',
          reason: 'shared_root_reconciled'
        },
        linear_transition: {
          status: 'failed',
          attempted_at: '2026-03-19T04:30:25.000Z',
          previous_state: 'Merging',
          target_state: 'Done',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-19T04:30:30.000Z',
          error: 'linear_rate_limited: Linear shared budget cooldown is active.'
        }
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-19T04:35:00.000Z'
      }),
      deliveryId: 'delivery-completed-terminal-merge-closeout-replay',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_100_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_stale'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'stale',
      reason: 'provider_issue_stale',
      run_id: 'run-completed-terminal-merge-closeout',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_shared_root_reconciled_transition_deferred',
      issue_updated_at: '2026-03-19T04:30:30.000Z'
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'stale',
      reason: 'provider_issue_stale'
    });
    expect(getPersistedState().claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_shared_root_reconciled_transition_deferred',
      issue_updated_at: '2026-03-19T04:30:30.000Z'
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
    'keeps %s issues lifecycle-owned on refresh for the same assignee without cleaning their provider workspace',
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
        issue_assignee_id: 'viewer-1',
        issue_assignee_name: 'Codex',
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
          expect(endpoint.actions).toEqual([]);
        });
      } finally {
        await endpoint.close();
      }

      expect(state.claims[0]).toMatchObject({
        state: 'handoff_failed',
        reason: 'provider_issue_handoff_owned',
        issue_state: reviewState,
        issue_state_type: 'started',
        issue_assignee_id: 'viewer-1',
        issue_assignee_name: 'Codex',
        run_id: 'run-human-review',
        run_manifest_path: childPaths.manifestPath
      });
      await expect(access(workspacePath)).resolves.toBeUndefined();
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
    }
  );

  it.each(['Human Review', 'In Review'])(
    'does not relaunch released %s issues when refresh resolves them back to the same assignee-owned handoff state',
    async (reviewState) => {
      const { root, paths } = await createHostPaths();
      const childEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'task-1303-review-released'
      };
      const childPaths = resolveRunPaths(childEnv, 'run-review-released');
      await mkdir(childPaths.runDir, { recursive: true });
      await writeFile(
        childPaths.manifestPath,
        JSON.stringify(
          {
            run_id: 'run-review-released',
            task_id: 'task-1303-review-released',
            status: 'completed',
            issue_provider: 'linear',
            issue_id: 'lin-issue-1',
            issue_identifier: 'CO-2',
            issue_updated_at: '2026-03-19T04:20:00.000Z',
            workspace_path: join(root, '.workspaces', 'task-1303-review-released'),
            updated_at: '2026-03-19T04:30:00.000Z'
          },
          'utf8'
        )
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
      const workspacePath = resolveProviderWorkspacePath(root, 'task-1303-review-released');
      await mkdir(workspacePath, { recursive: true });
      await writeFile(join(workspacePath, '.git'), 'gitdir: /tmp/provider-worktree\n', 'utf8');

      const state = createProviderIntakeState();
      state.claims.push({
        provider: 'linear',
        provider_key: 'linear:lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_title: 'Autonomous intake handoff',
        issue_state: 'Triage',
        issue_state_type: 'unstarted',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        issue_assignee_id: 'viewer-1',
        issue_assignee_name: 'Codex',
        task_id: 'task-1303-review-released',
        mapping_source: 'provider_id_fallback',
        state: 'released',
        reason: 'provider_issue_released:not_active',
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: 'delivery-review-released',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_050_000,
        run_id: 'run-review-released',
        run_manifest_path: childPaths.manifestPath,
        launch_source: 'control-host',
        launch_token: 'review-released-launch-token'
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
          expect(endpoint.actions).toEqual([]);
        });
      } finally {
        await endpoint.close();
      }

      expect(state.claims[0]).toMatchObject({
        state: 'released',
        reason: 'provider_issue_handoff_owned',
        issue_state: reviewState,
        issue_state_type: 'started',
        issue_assignee_id: 'viewer-1',
        issue_assignee_name: 'Codex',
        run_id: 'run-review-released',
        run_manifest_path: childPaths.manifestPath
      });
      await expect(access(workspacePath)).resolves.toBeUndefined();
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
    }
  );

  it.each(['Human Review', 'In Review'])(
    'keeps an active running claim on refresh when %s metadata is older than the persisted active run',
    async (reviewState) => {
      const { root, paths } = await createHostPaths();
      const childEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'task-refresh-owned-active'
      };
      const childPaths = resolveRunPaths(childEnv, 'run-refresh-owned-active');
      await mkdir(childPaths.runDir, { recursive: true });
      await writeFile(
        childPaths.manifestPath,
        JSON.stringify({
          run_id: 'run-refresh-owned-active',
          task_id: 'task-refresh-owned-active',
          status: 'in_progress',
          issue_provider: 'linear',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_updated_at: '2026-03-19T04:30:30.000Z',
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
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        issue_assignee_id: 'viewer-1',
        issue_assignee_name: 'Codex',
        task_id: 'task-refresh-owned-active',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: 'delivery-refresh-owned-active',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_049_000,
        run_id: 'run-refresh-owned-active',
        run_manifest_path: childPaths.manifestPath,
        launch_source: 'control-host',
        launch_token: 'refresh-owned-active-token',
        retry_queued: true,
        retry_attempt: 2,
        retry_due_at: '2026-03-19T04:30:10.000Z',
        retry_error: 'stale continuation queue'
      });

      const persist = vi.fn(async () => undefined);
      const launcher = {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      };
      const resolveTrackedIssue = vi.fn(async () => ({
        kind: 'ready' as const,
        trackedIssue: createTrackedIssue({
          state: reviewState,
          state_type: 'started',
          updated_at: '2026-03-19T04:30:00.000Z'
        })
      }));

      const service = createProviderIssueHandoffService({
        paths,
        state,
        persist,
        launcher,
        resolveTrackedIssue
      });

      await service.refresh();

      expect(resolveTrackedIssue).toHaveBeenCalledTimes(1);
      expect(resolveTrackedIssue).toHaveBeenCalledWith({
        provider: 'linear',
        issueId: 'lin-issue-1'
      });
      expect(state.claims[0]).toMatchObject({
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        issue_assignee_id: 'viewer-1',
        issue_assignee_name: 'Codex',
        run_id: 'run-refresh-owned-active',
        run_manifest_path: childPaths.manifestPath,
        retry_queued: false,
        retry_attempt: 2,
        retry_due_at: null,
        retry_error: null
      });
      expect(persist).toHaveBeenCalledTimes(1);
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
    }
  );

  it('does not treat omitted merge_closeout as a transition when refreshing an unchanged active claim', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-refresh-owned-active-merge-closeout'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-refresh-owned-active-merge-closeout');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-refresh-owned-active-merge-closeout',
        task_id: 'task-refresh-owned-active-merge-closeout',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
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
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-refresh-owned-active-merge-closeout',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-refresh-owned-active-merge-closeout',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_049_000,
      run_id: 'run-refresh-owned-active-merge-closeout',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'refresh-owned-active-merge-closeout-token',
      merge_closeout: {
        version: 1,
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        source_setup: null,
        arming: {
          status: 'armed',
          summary: 'ready',
          decision_at: '2026-03-19T04:30:10.000Z',
          snapshot: {
            ready_to_merge: true,
            merge_state_status: 'CLEAN',
            review_decision: 'APPROVED',
            required_checks_pending: [],
            required_checks_failed: [],
            unresolved_threads: 0,
            action_required_reasons: []
          }
        },
        merge_attempt: {
          status: 'attempted',
          attempted_at: '2026-03-19T04:30:15.000Z',
          method: 'gh_pr_merge',
          head_oid: 'abc123',
          command: ['gh', 'pr', 'merge', '357', '--merge', '--delete-branch=false'],
          exit_code: 0,
          stdout: 'merged',
          stderr: ''
        },
        merge_result: {
          status: 'merged',
          observed_at: '2026-03-19T04:30:20.000Z',
          merged_at: '2026-03-19T04:30:18.000Z',
          head_oid: 'abc123',
          state: 'MERGED'
        },
        shared_root: {
          status: 'reconciled',
          attempted_at: '2026-03-19T04:30:25.000Z',
          before_status: '## main...origin/main',
          after_status: '## main...origin/main',
          reason: 'shared_root_reconciled'
        },
        linear_transition: {
          status: 'transitioned',
          attempted_at: '2026-03-19T04:30:30.000Z',
          previous_state: 'Merging',
          target_state: 'Done',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-03-19T04:30:30.000Z',
          error: null
        },
        status: 'merged',
        reason: 'merged_and_transitioned_done',
        summary: 'PR #357 merged and issue transitioned to Done.'
      }
    });

    const persist = vi.fn(async () => undefined);
    const publishRuntime = vi.fn();
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        state: 'Human Review',
        state_type: 'started',
        updated_at: '2026-03-19T04:30:00.000Z'
      })
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      publishRuntime,
      resolveTrackedIssue
    });

    await service.refresh();

    expect(resolveTrackedIssue).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(publishRuntime).not.toHaveBeenCalled();
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done',
      linear_transition: {
        status: 'transitioned',
        target_state: 'Done'
      }
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('clears stale merge_closeout residue on refresh when an active run now has newer active issue truth', async () => {
    vi.useFakeTimers();
    try {
      const { root, paths } = await createHostPaths();
      const childEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'task-138-active-run-refresh-stale-merge-closeout'
      };
      const childPaths = resolveRunPaths(childEnv, 'run-138-active-run-refresh-stale-merge-closeout');
      await mkdir(childPaths.runDir, { recursive: true });
      await writeFile(
        childPaths.manifestPath,
        JSON.stringify({
          run_id: 'run-138-active-run-refresh-stale-merge-closeout',
          task_id: 'task-138-active-run-refresh-stale-merge-closeout',
          status: 'in_progress',
          issue_provider: 'linear',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-138',
          issue_updated_at: '2026-03-19T04:30:00.000Z',
          updated_at: '2026-03-19T04:31:00.000Z'
        }),
        'utf8'
      );

      const state = createProviderIntakeState();
      state.claims.push({
        provider: 'linear',
        provider_key: 'linear:lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_title: 'Stale merge closeout',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:35:00.000Z',
        issue_assignee_id: null,
        issue_assignee_name: null,
        task_id: 'task-138-active-run-refresh-stale-merge-closeout',
        mapping_source: 'provider_id_fallback',
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: 'delivery-138-active-run-refresh-stale-merge-closeout',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_050_000,
        run_id: 'run-138-active-run-refresh-stale-merge-closeout',
        run_manifest_path: childPaths.manifestPath,
        launch_source: null,
        launch_token: null,
        merge_closeout: {
          recorded_at: '2026-03-19T04:30:30.000Z',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-138',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-19T04:30:30.000Z',
          status: 'action_required',
          reason: 'merge_state_behind',
          summary: 'Attached PR #357 is behind origin/main and cannot merge yet.',
          attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
          pr: {
            url: 'https://github.com/asabeko/CO/pull/357',
            owner: 'asabeko',
            repo: 'CO',
            number: 357
          },
          snapshot: {
            state: 'OPEN',
            review_decision: 'APPROVED',
            merge_state_status: 'BEHIND',
            ready_to_merge: false,
            gate_reasons: ['mergeStateStatus=BEHIND'],
            action_required_reasons: [],
            unresolved_thread_count: 0,
            checks_pending: 0,
            checks_failed: 0,
            required_checks_pending: 0,
            required_checks_failed: 0,
            updated_at: '2026-03-19T04:30:30.000Z',
            merged_at: null,
            head_oid: 'abc123'
          },
          merge_attempt: null,
          shared_root: null,
          linear_transition: null
        }
      });

      const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
            identifier: 'CO-138',
            title: 'Stale merge closeout',
            state: 'In Progress',
            state_type: 'started',
            updated_at: '2026-03-19T04:40:00.000Z',
            assignee_id: null,
            assignee_name: null
          })
        })
      });

      await service.refresh();

      expect(state.claims[0]).toMatchObject({
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:40:00.000Z'
      });
      expect(state.claims[0]?.merge_closeout ?? null).toBeNull();
      expect(getPersistedState().claims[0]).toMatchObject({
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:40:00.000Z'
      });
      expect(getPersistedState().claims[0]?.merge_closeout ?? null).toBeNull();
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it('keeps an active claim lifecycle-owned on refresh when the live Merging issue has assignee_id null', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-refresh-merging-unassigned-owned'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-refresh-merging-unassigned-owned');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-refresh-merging-unassigned-owned',
        task_id: 'task-refresh-merging-unassigned-owned',
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
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-refresh-merging-unassigned-owned',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-refresh-merging-unassigned-owned',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_049_000,
      run_id: 'run-refresh-merging-unassigned-owned',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'refresh-merging-unassigned-owned-token'
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const resolveTrackedIssue = vi.fn(async () => ({
      kind: 'ready' as const,
      trackedIssue: createTrackedIssue({
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-03-19T04:30:00.000Z',
        assignee_id: null,
        assignee_name: null
      })
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      resolveTrackedIssue
    });

    try {
      await service.refresh();
      await vi.waitFor(() => {
        expect(endpoint.actions).toEqual([]);
      });
    } finally {
      await endpoint.close();
    }

    expect(resolveTrackedIssue).toHaveBeenCalledTimes(1);
    expect(resolveTrackedIssue).toHaveBeenCalledWith({
      provider: 'linear',
      issueId: 'lin-issue-1'
    });
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_assignee_id: null,
      issue_assignee_name: null,
      run_id: 'run-refresh-merging-unassigned-owned',
      run_manifest_path: childPaths.manifestPath
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('releases an active claim on refresh when viewer_id is missing and the live issue is assigned elsewhere', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-refresh-missing-viewer-assignee-release'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-refresh-missing-viewer-assignee-release');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-refresh-missing-viewer-assignee-release',
        task_id: 'task-refresh-missing-viewer-assignee-release',
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
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-refresh-missing-viewer-assignee-release',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-refresh-missing-viewer-assignee-release',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_049_000,
      run_id: 'run-refresh-missing-viewer-assignee-release',
      run_manifest_path: childPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'refresh-missing-viewer-assignee-release-token'
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
          state: 'Merging',
          state_type: 'started',
          viewer_id: null,
          assignee_id: 'viewer-2',
          assignee_name: 'Other Owner'
        })
      })
    });

    try {
      await service.refresh();
      await vi.waitFor(() => {
        expect(endpoint.actions).toEqual([
          expect.objectContaining({
            action: 'cancel',
            reason: 'provider_issue_released:assignee_changed'
          })
        ]);
      });
    } finally {
      await endpoint.close();
    }

    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:assignee_changed',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_assignee_id: 'viewer-2',
      issue_assignee_name: 'Other Owner',
      run_id: 'run-refresh-missing-viewer-assignee-release',
      run_manifest_path: childPaths.manifestPath
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it.each(['Human Review', 'In Review'])(
    'does not consume the poll slot budget for released %s handoff-owned claims',
    async (reviewState) => {
      const { paths } = await createHostPaths();
      const state = createProviderIntakeState();
      state.claims.push({
        provider: 'linear',
        provider_key: 'linear:lin-issue-review',
        issue_id: 'lin-issue-review',
        issue_identifier: 'CO-1',
        issue_title: 'Review-owned release',
        issue_state: 'Triage',
        issue_state_type: 'unstarted',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        issue_assignee_id: 'viewer-1',
        issue_assignee_name: 'Codex',
        task_id: 'task-review-owned',
        mapping_source: 'provider_id_fallback',
        state: 'released',
        reason: 'provider_issue_released:not_active',
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: null,
        last_event: null,
        last_action: null,
        last_webhook_timestamp: null,
        run_id: 'run-review-owned',
        run_manifest_path: '/tmp/provider-run/review-owned.json',
        launch_source: 'control-host',
        launch_token: 'review-owned-launch-token'
      });

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
        })
      });

      await service.poll?.({
        trackedIssues: [
          createTrackedIssue({
            id: 'lin-issue-review',
            identifier: 'CO-1',
            state: reviewState,
            state_type: 'started',
            updated_at: '2026-03-19T04:21:00.000Z'
          }),
          createTrackedIssue({
            id: 'lin-issue-fresh',
            identifier: 'CO-2',
            state: 'In Progress',
            state_type: 'started',
            updated_at: '2026-03-19T04:22:00.000Z'
          })
        ]
      });

      expect(launcher.start).toHaveBeenCalledTimes(1);
      expect(launcher.start.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          issueId: 'lin-issue-fresh'
        })
      );
      expect(launcher.resume).not.toHaveBeenCalled();
      expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-review')).toMatchObject({
        state: 'released',
        reason: 'provider_issue_handoff_owned',
        issue_state: reviewState,
        issue_state_type: 'started'
      });
      expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-fresh')).toMatchObject({
        state: 'starting',
        reason: 'provider_issue_start_launched',
        run_id: 'run-lin-issue-fresh',
        run_manifest_path: '/tmp/provider-run/lin-issue-fresh.json'
      });
    }
  );

  it.each(['Human Review', 'In Review'])(
    'releases %s issues on refresh when the assignee moves away without cleaning their provider workspace',
    async (reviewState) => {
      const { root, paths } = await createHostPaths();
      const childEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: 'task-1303-human-review-assignee-release'
      };
      const childPaths = resolveRunPaths(childEnv, 'run-human-review-assignee-release');
      await mkdir(childPaths.runDir, { recursive: true });
      await writeFile(
        childPaths.manifestPath,
        JSON.stringify({
          run_id: 'run-human-review-assignee-release',
          task_id: 'task-1303-human-review-assignee-release',
          status: 'queued',
          issue_provider: 'linear',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_updated_at: '2026-03-19T04:20:00.000Z',
          workspace_path: join(root, '.workspaces', 'task-1303-human-review-assignee-release'),
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
      const workspacePath = resolveProviderWorkspacePath(root, 'task-1303-human-review-assignee-release');
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
        issue_assignee_id: 'viewer-1',
        issue_assignee_name: 'Codex',
        task_id: 'task-1303-human-review-assignee-release',
        mapping_source: 'provider_id_fallback',
        state: 'starting',
        reason: 'provider_issue_start_launched',
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: 'delivery-human-review',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_050_000,
        run_id: 'run-human-review-assignee-release',
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
            state_type: 'started',
            assignee_id: 'viewer-2',
            assignee_name: 'Other Owner'
          })
        })
      });

      try {
        await service.refresh();
        await vi.waitFor(() => {
          expect(endpoint.actions).toEqual([
            expect.objectContaining({
              action: 'cancel',
              reason: 'provider_issue_released:assignee_changed'
            })
          ]);
        });
      } finally {
        await endpoint.close();
      }

      expect(state.claims[0]).toMatchObject({
        state: 'released',
        reason: 'provider_issue_released:assignee_changed',
        issue_state: reviewState,
        issue_state_type: 'started',
        issue_assignee_id: 'viewer-2',
        issue_assignee_name: 'Other Owner',
        run_id: 'run-human-review-assignee-release',
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

  it('keeps non-retryable merge closeout outcomes as handoff_failed during rehydrate', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'task-1303-rehydrate-merge-closeout-action-required';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-rehydrate-merge-closeout-action-required');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-rehydrate-merge-closeout-action-required',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:40:00.000Z',
      updated_at: '2026-03-19T04:40:00.000Z',
      last_delivery_id: 'delivery-rehydrate-merge-closeout-action-required',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'rehydrate-merge-closeout-action-required-token',
      retry_queued: true,
      retry_attempt: 2,
      retry_due_at: '2026-03-19T04:50:00.000Z',
      retry_error: 'stale continuation queue',
      merge_closeout: {
        recorded_at: '2026-03-19T04:39:00.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:39:00.000Z',
        status: 'action_required',
        reason: 'pr_closed_unmerged',
        summary: 'Attached PR #357 is closed without merging; reopen it or attach a replacement PR.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
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
          updated_at: '2026-03-19T04:39:00.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
      reason: 'provider_issue_merge_closeout_action_required',
      task_id: taskId,
      run_id: 'run-rehydrate-merge-closeout-action-required',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('does not resurrect a stale review-promotion failure once merge closeout already exists during rehydrate', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'task-1303-rehydrate-stale-review-promotion-failure';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(
      childEnv,
      'run-rehydrate-stale-review-promotion-failure'
    );
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-rehydrate-stale-review-promotion-failure',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_updated_at: '2026-04-09T03:30:00.000Z',
        updated_at: '2026-04-09T03:31:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_title: 'Review handoff promotion',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-09T03:31:00.000Z',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      accepted_at: '2026-04-09T03:15:00.000Z',
      updated_at: '2026-04-09T03:31:05.000Z',
      last_delivery_id: 'delivery-rehydrate-stale-review-promotion-failure',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_169_860_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null,
      review_promotion: {
        recorded_at: '2026-04-09T03:15:00.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_state: 'In Review',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-09T03:15:00.000Z',
        status: 'action_required',
        reason: 'review=REVIEW_REQUIRED',
        summary: 'Review-handoff promotion is blocked by: review=REVIEW_REQUIRED.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
        ignored_historical_pr_urls: [],
        conflicting_attached_pr_urls: [],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/416',
          owner: 'asabeko',
          repo: 'CO',
          number: 416
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'REVIEW_REQUIRED',
          merge_state_status: 'CLEAN',
          ready_to_merge: false,
          gate_reasons: ['review=REVIEW_REQUIRED'],
          action_required_reasons: ['review=REVIEW_REQUIRED'],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-04-09T03:14:30.000Z',
          merged_at: null,
          head_oid: 'def456'
        },
        linear_transition: null
      },
      merge_closeout: {
        recorded_at: '2026-04-09T03:31:00.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-09T03:31:00.000Z',
        status: 'merged',
        reason: 'merged_and_transitioned_done',
        summary: 'Merged attached PR #416 and transitioned the Linear issue to Done.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
        ignored_historical_pr_urls: [],
        conflicting_attached_pr_urls: [],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/416',
          owner: 'asabeko',
          repo: 'CO',
          number: 416
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
          updated_at: '2026-04-09T03:31:00.000Z',
          merged_at: '2026-04-09T03:30:30.000Z',
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: {
          status: 'reconciled',
          attempted_at: '2026-04-09T03:30:45.000Z',
          before_status: '## main...origin/main',
          after_status: '## main...origin/main',
          reason: 'shared_root_reconciled'
        },
        linear_transition: {
          status: 'transitioned',
          attempted_at: '2026-04-09T03:31:00.000Z',
          previous_state: 'Merging',
          target_state: 'Done',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-04-09T03:31:00.000Z',
          error: null
        }
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
      run_id: 'run-rehydrate-stale-review-promotion-failure',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done'
    });
    expect(state.claims[0]?.review_promotion).toMatchObject({
      status: 'action_required',
      reason: 'review=REVIEW_REQUIRED'
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run'
    });
  });

  it('rehydrates a completed run by promoting a fresh review handoff before falling back to completed state', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-rehydrate-review-promotion');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-rehydrate-review-promotion',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_updated_at: '2026-04-09T03:04:00.000Z',
        updated_at: '2026-04-09T03:05:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_title: 'Review handoff promotion',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:00:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-04-09T03:00:05.000Z',
      updated_at: '2026-04-09T03:00:10.000Z',
      last_delivery_id: 'delivery-rehydrate-review-promotion',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_168_300_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null
    });

    const expectedAuditPath = join(
      dirname(childPaths.manifestPath),
      PROVIDER_LINEAR_WORKER_AUDIT_FILENAME
    );
    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runReviewHandoffPromotion = vi.fn(async () => ({
      recorded_at: '2026-04-09T03:05:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:05:00.000Z',
      status: 'promoted' as const,
      reason: 'promoted_to_merging',
      summary: 'Promoted attached PR #416 from review handoff into Merging.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
      ignored_historical_pr_urls: [],
      conflicting_attached_pr_urls: [],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/416',
        owner: 'asabeko',
        repo: 'CO',
        number: 416
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
        updated_at: '2026-04-09T03:04:30.000Z',
        merged_at: null,
        head_oid: 'abc123'
      },
      linear_transition: {
        status: 'transitioned',
        attempted_at: '2026-04-09T03:05:00.000Z',
        previous_state: 'In Review',
        target_state: 'Merging',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-09T03:05:00.000Z',
        error: null
      }
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runReviewHandoffPromotion,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          identifier: 'CO-116',
          title: 'Review handoff promotion',
          state: 'In Review',
          state_type: 'started',
          updated_at: '2026-04-09T03:04:00.000Z'
        })
      })
    });

    await service.rehydrate();

    expect(runReviewHandoffPromotion).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-116',
      issueState: 'In Review',
      repoRoot: paths.repoRoot,
      env: expect.objectContaining({
        [PROVIDER_LINEAR_AUDIT_ENV_VAR]: expectedAuditPath
      })
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_review_promotion_promoted',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:05:00.000Z',
      task_id: taskId,
      run_id: 'run-rehydrate-review-promotion',
      run_manifest_path: childPaths.manifestPath,
      review_promotion: {
        status: 'promoted',
        reason: 'promoted_to_merging'
      },
      merge_closeout: null
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_review_promotion_promoted',
      issue_state: 'Merging',
      run_id: 'run-rehydrate-review-promotion'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('rehydrates a promoted review handoff into deterministic merge closeout instead of treating it as generic completed work', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-rehydrate-promoted-merging');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-rehydrate-promoted-merging',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_updated_at: '2026-04-09T03:05:00.000Z',
        updated_at: '2026-04-09T03:05:30.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
        updated_at: '2026-04-09T03:05:30.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_title: 'Review handoff promotion',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:05:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_review_promotion_promoted',
      accepted_at: '2026-04-09T03:00:05.000Z',
      updated_at: '2026-04-09T03:05:10.000Z',
      last_delivery_id: 'delivery-rehydrate-promoted-merging',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_168_300_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null,
      review_promotion: {
        recorded_at: '2026-04-09T03:05:00.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-09T03:05:00.000Z',
        status: 'promoted',
        reason: 'promoted_to_merging',
        summary: 'Promoted attached PR #416 from review handoff into Merging.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
        ignored_historical_pr_urls: [],
        conflicting_attached_pr_urls: [],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/416',
          owner: 'asabeko',
          repo: 'CO',
          number: 416
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
          updated_at: '2026-04-09T03:04:30.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        linear_transition: {
          status: 'transitioned',
          attempted_at: '2026-04-09T03:05:00.000Z',
          previous_state: 'In Review',
          target_state: 'Merging',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-09T03:05:00.000Z',
          error: null
        }
      },
      merge_closeout: null
    });

    const expectedAuditPath = join(
      dirname(childPaths.manifestPath),
      PROVIDER_LINEAR_WORKER_AUDIT_FILENAME
    );
    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-04-09T03:05:45.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:05:45.000Z',
      status: 'watching' as const,
      reason: 'required_checks_pending',
      summary: 'Waiting for required checks before merge.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
      ignored_historical_pr_urls: [],
      conflicting_attached_pr_urls: [],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/416',
        owner: 'asabeko',
        repo: 'CO',
        number: 416
      },
      snapshot: {
        state: 'OPEN',
        review_decision: 'APPROVED',
        merge_state_status: 'BLOCKED',
        ready_to_merge: false,
        gate_reasons: ['required_checks_pending'],
        action_required_reasons: [],
        unresolved_thread_count: 0,
        checks_pending: 1,
        checks_failed: 0,
        required_checks_pending: 1,
        required_checks_failed: 0,
        updated_at: '2026-04-09T03:05:45.000Z',
        merged_at: null,
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          identifier: 'CO-116',
          title: 'Review handoff promotion',
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-04-09T03:05:45.000Z'
        })
      })
    });

    await service.rehydrate();

    expect(runMergeCloseout).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-116',
      issueState: 'Merging',
      repoRoot: paths.repoRoot,
      env: expect.objectContaining({
        [PROVIDER_LINEAR_AUDIT_ENV_VAR]: expectedAuditPath
      })
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_watching',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:05:45.000Z',
      task_id: taskId,
      run_id: 'run-rehydrate-promoted-merging',
      run_manifest_path: childPaths.manifestPath,
      merge_closeout: {
        status: 'watching',
        reason: 'required_checks_pending'
      }
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_watching',
      issue_state: 'Merging'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('preserves a promoted Merging handoff on rehydrate when fresh tracked-issue metadata is unavailable', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'run-rehydrate-promoted-merging-without-refresh');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-rehydrate-promoted-merging-without-refresh',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_updated_at: '2026-04-09T03:05:00.000Z',
        updated_at: '2026-04-09T03:05:30.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
        updated_at: '2026-04-09T03:05:30.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_title: 'Review handoff promotion',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:05:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_review_promotion_promoted',
      accepted_at: '2026-04-09T03:00:05.000Z',
      updated_at: '2026-04-09T03:05:10.000Z',
      last_delivery_id: 'delivery-rehydrate-promoted-merging-without-refresh',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_168_300_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null,
      review_promotion: {
        recorded_at: '2026-04-09T03:05:00.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-09T03:05:00.000Z',
        status: 'promoted',
        reason: 'promoted_to_merging',
        summary: 'Promoted attached PR #416 from review handoff into Merging.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
        ignored_historical_pr_urls: [],
        conflicting_attached_pr_urls: [],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/416',
          owner: 'asabeko',
          repo: 'CO',
          number: 416
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
          updated_at: '2026-04-09T03:04:30.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        linear_transition: {
          status: 'transitioned',
          attempted_at: '2026-04-09T03:05:00.000Z',
          previous_state: 'In Review',
          target_state: 'Merging',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-04-09T03:05:00.000Z',
          error: null
        }
      },
      merge_closeout: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_review_promotion_promoted',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:05:00.000Z',
      task_id: taskId,
      run_id: 'run-rehydrate-promoted-merging-without-refresh',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null,
      review_promotion: {
        status: 'promoted',
        reason: 'promoted_to_merging'
      },
      merge_closeout: null
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_review_promotion_promoted',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

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

  it('keeps a queued post-worker-exit retry lifecycle-owned through review without relaunching coding work', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-review-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-review-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-review-completed',
        task_id: 'task-1303-review-completed',
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
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-1303-review-completed',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-review-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-review-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:01.000Z',
      retry_error: null
    });

    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-unexpected',
        manifestPath: '/tmp/provider-run/unexpected-manifest.json'
      })),
      resume: vi.fn(async () => undefined)
    };
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Human Review',
          state_type: 'started',
          updated_at: '2026-03-19T04:20:00.000Z'
        })
      })
    });

    await waitForMockCalls(setTimeoutSpy);
    const scheduledTimeoutCount = setTimeoutSpy.mock.calls.length;
    expect(scheduledTimeoutCount).toBe(1);
    const [, delayMs] = setTimeoutSpy.mock.calls[scheduledTimeoutCount - 1] ?? [];
    expect(delayMs).toBeGreaterThanOrEqual(999);
    expect(delayMs).toBeLessThanOrEqual(1_000);
    vi.setSystemTime(new Date('2026-03-19T04:30:01.001Z'));
    const persistCallsBeforeRetry = persist.mock.calls.length;
    getLatestScheduledTimeoutCallback(setTimeoutSpy)();
    await flushAsyncWork();
    await waitForMockCalls(persist, persistCallsBeforeRetry + 1, 1_024);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_handoff_owned',
      issue_state: 'Human Review',
      issue_state_type: 'started',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-1303-review-completed',
      run_id: 'run-review-completed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_error: null
    });
    expect(Date.parse(state.claims[0]?.retry_due_at ?? '')).toBeGreaterThan(
      Date.parse('2026-03-19T04:30:01.000Z')
    );
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
          updated_at: '2026-03-19T04:20:00.000Z'
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);
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

    const scheduledTimeoutCount = setTimeoutSpy.mock.calls.length;
    expect(scheduledTimeoutCount).toBeGreaterThanOrEqual(1);
    const [, delayMs] = setTimeoutSpy.mock.calls[scheduledTimeoutCount - 1] ?? [];
    expect(delayMs).toBeGreaterThanOrEqual(999);
    expect(delayMs).toBeLessThanOrEqual(1_000);
    const startCallsBeforeRetry = launcher.start.mock.calls.length;
    getLatestScheduledTimeoutCallback(setTimeoutSpy)();
    await flushAsyncWork();
    await waitForMockCalls(launcher.start, startCallsBeforeRetry + 1, 1_024);

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
    const scheduledTimeoutCount = setTimeoutSpy.mock.calls.length;
    expect(scheduledTimeoutCount).toBeGreaterThanOrEqual(1);
    const [, delayMs] = setTimeoutSpy.mock.calls[scheduledTimeoutCount - 1] ?? [];
    expect(delayMs).toBeGreaterThanOrEqual(999);
    expect(delayMs).toBeLessThanOrEqual(1_000);
    await waitForCondition(
      () =>
        state.claims[0]?.retry_queued === true &&
        state.claims[0]?.retry_due_at === '2026-03-19T04:30:01.000Z'
    );
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
      expect(scheduledTimeoutCount).toBeGreaterThanOrEqual(1);
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

  it('keeps terminal workspace cleanup non-fatal when the attached-pr close hook fails', async () => {
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

    const cleanupResult = {
      attemptedAt: '2026-03-27T00:00:00.000Z',
      status: 'failed' as const,
      summary: 'Terminal cleanup closed 0 of 1 matching attached PR(s) for branch feature/co-5.',
      error: 'gh pr close exited 1 stderr="close failed"',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      workspacePath,
      branch: 'feature/co-5',
      attachedPrUrls: ['https://github.com/example/co/pull/123'],
      matchingOpenPrUrls: ['https://github.com/example/co/pull/123'],
      closedPrUrls: []
    };
    const recordTerminalCleanupResult = vi.fn();
    const runTerminalCleanup = vi.fn(async () => cleanupResult);
    const providerWorkflowConfigStore = {
      bootstrap: vi.fn(async () => ({
        status: 'ready' as const,
        pipeline_id: 'provider-linear-worker',
        source_path: '/repo/codex.orchestrator.json',
        snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        last_reload_attempt_at: '2026-03-27T00:00:00.000Z',
        last_success_at: '2026-03-27T00:00:00.000Z',
        last_error_at: null,
        last_error: null,
        terminal_cleanup: {
          enabled: true,
          close_attached_pr: {
            enabled: true,
            comment_template:
              'Closing because the Linear issue for branch {{branch}} entered a terminal state without merge.'
          },
          last_result: null
        }
      })),
      refresh: vi.fn(async () => ({
        status: 'ready' as const,
        pipeline_id: 'provider-linear-worker',
        source_path: '/repo/codex.orchestrator.json',
        snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        last_reload_attempt_at: '2026-03-27T00:00:00.000Z',
        last_success_at: '2026-03-27T00:00:00.000Z',
        last_error_at: null,
        last_error: null,
        terminal_cleanup: {
          enabled: true,
          close_attached_pr: {
            enabled: true,
            comment_template:
              'Closing because the Linear issue for branch {{branch}} entered a terminal state without merge.'
          },
          last_result: null
        }
      })),
      snapshot: () => ({
        status: 'ready' as const,
        pipeline_id: 'provider-linear-worker',
        source_path: '/repo/codex.orchestrator.json',
        snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        last_reload_attempt_at: '2026-03-27T00:00:00.000Z',
        last_success_at: '2026-03-27T00:00:00.000Z',
        last_error_at: null,
        last_error: null,
        terminal_cleanup: {
          enabled: true,
          close_attached_pr: {
            enabled: true,
            comment_template:
              'Closing because the Linear issue for branch {{branch}} entered a terminal state without merge.'
          },
          last_result: null
        }
      }),
      getLaunchConfigPath: vi.fn(async () => '/repo/.runs/local-mcp/cli/control-host/provider-workflow.json'),
      recordTerminalCleanupResult
    };

    const persist = vi.fn(async () => undefined);
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      providerWorkflowConfigStore,
      runTerminalCleanup,
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
    expect(runTerminalCleanup).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-2',
        workspacePath
      })
    );
    expect(recordTerminalCleanupResult).toHaveBeenCalledWith(cleanupResult);
  });

  it('cleans terminal released provider workspaces during refresh startup replay even when the assignee changed', async () => {
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
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
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
          state_type: 'completed',
          assignee_id: 'viewer-2',
          assignee_name: 'Other Owner'
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

  it('preserves released assignee metadata when an equal-timestamp replay arrives with a different assignee', async () => {
    const { paths } = await createHostPaths();
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
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
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
        assignee_id: 'viewer-2',
        assignee_name: 'Other Owner'
      }),
      deliveryId: 'delivery-released-assignee-replay',
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
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex'
    });
    expect(state.claims[0]).toMatchObject({
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('relaunches a released assignee-changed claim on a same-timestamp webhook when Merging with assignee_id null', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      issue_assignee_id: 'viewer-2',
      issue_assignee_name: 'Other Owner',
      task_id: 'task-1303-released-assignee-changed-webhook',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:assignee_changed',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-released-assignee-changed-webhook',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-released-assignee-changed-webhook',
      run_manifest_path: '/tmp/provider-run/released-assignee-changed-webhook-manifest.json',
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
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-03-19T04:20:00.000Z',
        assignee_id: null,
        assignee_name: null
      }),
      deliveryId: 'delivery-released-assignee-changed-webhook-reopen',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_050_100
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
      issueUpdatedAt: '2026-03-19T04:20:00.000Z',
      launchToken: expect.any(String)
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_start_launched',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'linear-lin-issue-1',
      run_id: 'run-reopened',
      run_manifest_path: '/tmp/provider-run/reopened-manifest.json',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
  });

  it('keeps a released assignee-changed claim released on a same-timestamp webhook when viewer_id is missing and the issue is still assigned elsewhere', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      issue_assignee_id: 'viewer-2',
      issue_assignee_name: 'Other Owner',
      task_id: 'task-1303-released-assignee-changed-webhook-missing-viewer',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:assignee_changed',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-released-assignee-changed-webhook-missing-viewer',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-released-assignee-changed-webhook-missing-viewer',
      run_manifest_path: '/tmp/provider-run/released-assignee-changed-webhook-missing-viewer-manifest.json',
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
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-03-19T04:20:00.000Z',
        viewer_id: null,
        assignee_id: 'viewer-2',
        assignee_name: 'Other Owner'
      }),
      deliveryId: 'delivery-released-assignee-changed-webhook-missing-viewer-replay',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_050_100
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_released:assignee_changed'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'released',
      reason: 'provider_issue_released:assignee_changed',
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      issue_assignee_id: 'viewer-2',
      issue_assignee_name: 'Other Owner'
    });
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

  it('reopens a pending-reopen released claim on refresh when updated_at is unknown', async () => {
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
      issue_updated_at: null,
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-refresh-pending-reopen-unknown',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released_pending_reopen:provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-refresh-pending-reopen-unknown',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-refresh-pending-reopen-unknown',
      run_manifest_path: '/tmp/provider-run/released-pending-reopen-unknown-manifest.json',
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
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: null,
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: null,
      launchToken: expect.any(String)
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_refresh_start_launched',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: null,
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'linear-lin-issue-1',
      run_id: 'run-reopened',
      run_manifest_path: '/tmp/provider-run/reopened-manifest.json',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
    expect(launcher.resume).not.toHaveBeenCalled();
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

  it('relaunches a released claim during refresh when the live issue becomes active with a newer update', async () => {
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
      issue_state: 'In Review',
      issue_state_type: 'started',
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
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-1',
          identifier: 'CO-2',
          state: 'Rework',
          state_type: 'started',
          updated_at: '2026-03-19T04:40:00.000Z'
        })
      })
    });

    await service.refresh();

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
      reason: 'provider_issue_refresh_start_launched',
      issue_state: 'Rework',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-reopened',
      run_manifest_path: '/tmp/provider-run/reopened-manifest.json',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
  });

  it('prefers the discovered previous run worker_host over a stale claim when refresh relaunches a released claim', async () => {
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
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-19T04:20:00.000Z',
        worker_host: 'worker-host-02'
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
      issue_state: 'In Review',
      issue_state_type: 'started',
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
      worker_host: 'worker-host-01',
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
    const providerWorkflowConfigStore = {
      bootstrap: vi.fn(),
      refresh: vi.fn(),
      snapshot: () => ({
        status: 'ready' as const,
        pipeline_id: 'provider-linear-worker',
        source_path: '/repo/codex.orchestrator.json',
        snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        last_reload_attempt_at: null,
        last_success_at: null,
        last_error_at: null,
        last_error: null,
        terminal_cleanup: null,
        worker_hosts: [
          {
            name: 'worker-host-01',
            transport: 'ssh' as const,
            ssh_destination: 'codex@worker-host-01',
            ssh_options: [],
            max_concurrent_agents: 1,
            node_path: null
          },
          {
            name: 'worker-host-02',
            transport: 'ssh' as const,
            ssh_destination: 'codex@worker-host-02',
            ssh_options: [],
            max_concurrent_agents: 1,
            node_path: null
          }
        ]
      }),
      getLaunchConfigPath: vi.fn(),
      recordTerminalCleanupResult: vi.fn()
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      providerWorkflowConfigStore,
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-1',
          identifier: 'CO-2',
          state: 'Rework',
          state_type: 'started',
          updated_at: '2026-03-19T04:40:00.000Z'
        })
      })
    });

    await service.refresh();

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:40:00.000Z',
      workerHost: 'worker-host-02',
      launchToken: expect.any(String)
    }));
    expect(providerWorkflowConfigStore.refresh).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_refresh_start_launched',
      issue_state: 'Rework',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-reopened',
      run_manifest_path: '/tmp/provider-run/reopened-manifest.json',
      worker_host: 'worker-host-02',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
  });

  it('counts discovered active runs toward worker_host occupancy when refresh relaunches a released claim', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed-stale-host'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed-stale-host');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed-stale-host',
        task_id: 'task-1303-completed-stale-host',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        started_at: '2026-03-19T04:25:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-19T04:20:00.000Z',
        worker_host: 'worker-host-02'
      }),
      'utf8'
    );

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
        issue_identifier: 'CO-9',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(occupiedPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-19T04:25:00.000Z',
        worker_host: 'worker-host-01'
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
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-completed-stale-host',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-released-completed-stale-host',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed-stale-host',
      run_manifest_path: childPaths.manifestPath,
      worker_host: 'worker-host-01',
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
    const providerWorkflowConfigStore = {
      bootstrap: vi.fn(),
      refresh: vi.fn(),
      snapshot: () => ({
        status: 'ready' as const,
        pipeline_id: 'provider-linear-worker',
        source_path: '/repo/codex.orchestrator.json',
        snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        last_reload_attempt_at: null,
        last_success_at: null,
        last_error_at: null,
        last_error: null,
        terminal_cleanup: null,
        worker_hosts: [
          {
            name: 'worker-host-01',
            transport: 'ssh' as const,
            ssh_destination: 'codex@worker-host-01',
            ssh_options: [],
            max_concurrent_agents: 1,
            node_path: null
          },
          {
            name: 'worker-host-02',
            transport: 'ssh' as const,
            ssh_destination: 'codex@worker-host-02',
            ssh_options: [],
            max_concurrent_agents: 1,
            node_path: null
          }
        ]
      }),
      getLaunchConfigPath: vi.fn(),
      recordTerminalCleanupResult: vi.fn()
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      providerWorkflowConfigStore,
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async ({ issueId }) => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          id: issueId,
          identifier: issueId === 'lin-issue-1' ? 'CO-2' : 'CO-9',
          state: issueId === 'lin-issue-1' ? 'Rework' : 'In Progress',
          state_type: 'started',
          updated_at: issueId === 'lin-issue-1' ? '2026-03-19T04:40:00.000Z' : '2026-03-19T04:25:00.000Z'
        })
      })
    });

    await service.refresh();

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:40:00.000Z',
      workerHost: 'worker-host-02',
      launchToken: expect.any(String)
    }));
    expect(providerWorkflowConfigStore.refresh).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_refresh_start_launched',
      issue_state: 'Rework',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-reopened',
      run_manifest_path: '/tmp/provider-run/reopened-manifest.json',
      worker_host: 'worker-host-02',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
  });

  it('falls back to the persisted claim worker_host when the discovered previous run has no fresh host context', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-completed-stale-host'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-completed-stale-host');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-completed-stale-host',
        task_id: 'task-1303-completed-stale-host',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        started_at: '2026-03-19T04:25:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-19T04:20:00.000Z',
        worker_host: 'worker-host-02'
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
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      task_id: 'task-1303-completed-stale-host',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:not_active',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-released-completed-stale-host',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-completed-stale-host',
      run_manifest_path: childPaths.manifestPath,
      worker_host: 'worker-host-01',
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
    const providerWorkflowConfigStore = {
      bootstrap: vi.fn(),
      refresh: vi.fn(),
      snapshot: () => ({
        status: 'ready' as const,
        pipeline_id: 'provider-linear-worker',
        source_path: '/repo/codex.orchestrator.json',
        snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        last_reload_attempt_at: null,
        last_success_at: null,
        last_error_at: null,
        last_error: null,
        terminal_cleanup: null,
        worker_hosts: [
          {
            name: 'worker-host-01',
            transport: 'ssh' as const,
            ssh_destination: 'codex@worker-host-01',
            ssh_options: [],
            max_concurrent_agents: 1,
            node_path: null
          },
          {
            name: 'worker-host-02',
            transport: 'ssh' as const,
            ssh_destination: 'codex@worker-host-02',
            ssh_options: [],
            max_concurrent_agents: 1,
            node_path: null
          }
        ]
      }),
      getLaunchConfigPath: vi.fn(),
      recordTerminalCleanupResult: vi.fn()
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      providerWorkflowConfigStore,
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          id: 'lin-issue-1',
          identifier: 'CO-2',
          state: 'Rework',
          state_type: 'started',
          updated_at: '2026-03-19T04:40:00.000Z'
        })
      })
    });

    await service.refresh();

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:40:00.000Z',
      workerHost: 'worker-host-01',
      launchToken: expect.any(String)
    }));
    expect(providerWorkflowConfigStore.refresh).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_refresh_start_launched',
      issue_state: 'Rework',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-reopened',
      run_manifest_path: '/tmp/provider-run/reopened-manifest.json',
      worker_host: 'worker-host-01',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
  });

  it('relaunches a released assignee-changed claim on refresh when Merging with assignee_id null stays at the same timestamp', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      issue_assignee_id: 'viewer-2',
      issue_assignee_name: 'Other Owner',
      task_id: 'task-1303-released-assignee-changed',
      mapping_source: 'provider_id_fallback',
      state: 'released',
      reason: 'provider_issue_released:assignee_changed',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-released-assignee-changed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-released-assignee-changed',
      run_manifest_path: '/tmp/provider-run/released-assignee-changed-manifest.json',
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
      startPipelineId: 'diagnostics',
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:20:00.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
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
      reason: 'provider_issue_refresh_start_launched',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:20:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
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
      workerHost: null,
      launchToken: expect.any(String)
    });
    expect(state.claims[0]).toMatchObject({
      state: 'resuming',
      reason: 'provider_issue_retry_resume_launched',
      task_id: 'task-1303-failed',
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      worker_host: null,
      launch_source: 'control-host',
      launch_token: expect.any(String),
      retry_queued: false,
      retry_attempt: 1,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('blocks queued retry resume when real in-progress manifests already consume provider capacity', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
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
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
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
        issue_identifier: 'CO-9',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(failedPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-19T04:29:59.000Z',
        worker_host: 'worker-host-03'
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
      run_manifest_path: failedPaths.manifestPath,
      worker_host: 'worker-host-02',
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      }),
      resolveTrackedIssue: async ({ issueId }) => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          id: issueId,
          identifier: issueId === 'lin-issue-1' ? 'CO-2' : 'CO-9',
          updated_at: issueId === 'lin-issue-1' ? '2026-03-19T04:20:00.000Z' : '2026-03-19T04:25:00.000Z'
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);
    expect(state.claims[0]).toMatchObject({
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      task_id: 'task-1303-failed',
      run_id: 'run-failed',
      run_manifest_path: failedPaths.manifestPath,
      worker_host: 'worker-host-03',
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:10.000Z',
      retry_error: null
    });
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-occupied',
      issue_id: 'lin-issue-occupied',
      issue_identifier: 'CO-9',
      issue_title: 'Occupied slot',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      task_id: 'task-occupied',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:25:05.000Z',
      updated_at: '2026-03-19T04:25:10.000Z',
      last_delivery_id: 'delivery-occupied',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_250_000,
      run_id: 'run-occupied',
      run_manifest_path: occupiedPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });
    vi.setSystemTime(new Date('2026-03-19T04:30:10.001Z'));
    const persistCallsBeforeRetry = persist.mock.calls.length;
    getLatestScheduledTimeoutCallback(setTimeoutSpy)();
    await flushAsyncWork();
    await waitForMockCalls(persist, persistCallsBeforeRetry + 1, 1_024);

    const blockedClaim = state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-1');
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(blockedClaim).toMatchObject({
      state: 'resumable',
      reason: 'provider_issue_retry_resume_blocked:max_concurrency',
      task_id: 'task-1303-failed',
      run_id: 'run-failed',
      run_manifest_path: failedPaths.manifestPath,
      worker_host: 'worker-host-03',
      retry_queued: true,
      retry_attempt: 1,
      retry_error: null
    });
    expect(Date.parse(blockedClaim?.retry_due_at ?? '')).toBeGreaterThan(
      Date.parse('2026-03-19T04:30:10.000Z')
    );
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-occupied')).toMatchObject({
      state: 'running',
      run_id: 'run-occupied',
      run_manifest_path: occupiedPaths.manifestPath
    });
    expect(getPersistedState().claims.find((claim) => claim.provider_key === 'linear:lin-issue-1')).toMatchObject({
      state: 'resumable',
      reason: 'provider_issue_retry_resume_blocked:max_concurrency',
      worker_host: 'worker-host-03'
    });
  });

  it('clears a stale claim worker_host before retry resume when failed-run rehydrate has fresh local proof', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-failed-local'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-failed-local');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-failed-local',
        task_id: 'task-1303-failed-local',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        attempt_started_at: '2026-03-19T04:29:59.000Z',
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
      task_id: 'task-1303-failed-local',
      mapping_source: 'provider_id_fallback',
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-failed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-failed-local',
      run_manifest_path: childPaths.manifestPath,
      worker_host: 'worker-host-02',
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
      task_id: 'task-1303-failed-local',
      run_id: 'run-failed-local',
      run_manifest_path: childPaths.manifestPath,
      worker_host: null,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:10.000Z',
      retry_error: null
    });

    await vi.advanceTimersByTimeAsync(10_001);
    await flushAsyncWork();
    await waitForMockCalls(launcher.resume, 1, 1024);

    expect(launcher.resume.mock.calls[0]?.[0]).toEqual({
      runId: 'run-failed-local',
      actor: 'control-host',
      reason: 'provider-retry',
      workerHost: null,
      launchToken: expect.any(String)
    });
    expect(state.claims[0]).toMatchObject({
      state: 'resuming',
      reason: 'provider_issue_retry_resume_launched',
      task_id: 'task-1303-failed-local',
      run_id: 'run-failed-local',
      run_manifest_path: childPaths.manifestPath,
      worker_host: null,
      launch_source: 'control-host',
      launch_token: expect.any(String),
      retry_queued: false,
      retry_attempt: 1,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('reclassifies a stale running claim as resumable and refreshes stale issue metadata after a failed worker run', async () => {
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
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:10:00.000Z',
      task_id: 'task-1303-failed',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
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

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:25:00.000Z'
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    const expectedClaim = {
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      task_id: 'task-1303-failed',
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:10.000Z',
      retry_error: null
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(persist).toHaveBeenCalled();
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
  });

  it('reclassifies a stale running claim from terminal failed proof evidence before the run manifest flips terminal', async () => {
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
        status: 'in_progress',
        summary: 'worker still running',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:29:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: 'codex_exit_1',
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
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:10:00.000Z',
      task_id: 'task-1303-failed',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
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

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:25:00.000Z'
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    const expectedClaim = {
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      task_id: 'task-1303-failed',
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:10.000Z',
      retry_error: 'codex_exit_1'
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(persist).toHaveBeenCalled();
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
  });

  it('relaunches a stale running claim when the only in-progress proof sidecar predates the manifest start', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-stale-proof-reclaim'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-stale-proof-reclaim');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-stale-proof-reclaim',
        task_id: 'task-1303-stale-proof-reclaim',
        status: 'in_progress',
        summary: 'worker resumed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        started_at: '2026-03-19T04:30:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        attempt_started_at: '2026-03-19T04:29:00.000Z',
        updated_at: '2026-03-19T04:29:00.000Z'
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
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:10:00.000Z',
      task_id: 'task-1303-stale-proof-reclaim',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-stale-proof-reclaim',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-stale-proof-reclaim',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-reclaimed',
        manifestPath: '/tmp/provider-run/run-reclaimed.json'
      })),
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
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:35:00.000Z'
        })
      })
    });

    await service.refresh();

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:35:00.000Z',
      launchToken: expect.any(String)
    }));
    const expectedClaim = {
      state: 'starting',
      reason: 'provider_issue_refresh_start_launched',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:35:00.000Z',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-reclaimed',
      run_manifest_path: '/tmp/provider-run/run-reclaimed.json',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(persist).toHaveBeenCalled();
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
  });

  it('prefers the latest direct-intake run with a concrete status when a newer in-progress proof sidecar is stale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const staleEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-stale-proof-direct-intake'
    };
    const stalePaths = resolveRunPaths(staleEnv, 'run-stale-proof-direct-intake');
    await mkdir(stalePaths.runDir, { recursive: true });
    await writeFile(
      stalePaths.manifestPath,
      JSON.stringify({
        run_id: 'run-stale-proof-direct-intake',
        task_id: 'task-1303-stale-proof-direct-intake',
        status: 'in_progress',
        summary: 'worker resumed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:30:00.000Z',
        started_at: '2026-03-19T04:30:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(stalePaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        attempt_started_at: '2026-03-19T04:29:00.000Z',
        updated_at: '2026-03-19T04:29:00.000Z'
      }),
      'utf8'
    );

    const failedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-failed-direct-intake'
    };
    const failedPaths = resolveRunPaths(failedEnv, 'run-failed-direct-intake');
    await mkdir(failedPaths.runDir, { recursive: true });
    await writeFile(
      failedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-failed-direct-intake',
        task_id: 'task-1303-failed-direct-intake',
        status: 'failed',
        summary: 'codex_exit_1',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
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
        updated_at: '2026-03-19T04:32:00.000Z'
      }),
      deliveryId: 'delivery-stale-proof-direct-intake',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_320_000
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
      run_id: 'run-failed-direct-intake',
      run_manifest_path: failedPaths.manifestPath,
      task_id: 'task-1303-failed-direct-intake',
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: expect.any(String),
      retry_error: 'codex_exit_1'
    });
    expect(Number.isFinite(Date.parse(state.claims[0]?.retry_due_at ?? ''))).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('keeps an active running claim and clears stale retry metadata when a terminal failed proof sidecar is older than the manifest', async () => {
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
        status: 'in_progress',
        summary: 'worker resumed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: 'codex_exit_1',
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
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:10:00.000Z',
      task_id: 'task-1303-failed',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-failed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: null,
      retry_due_at: '2026-03-19T04:45:00.000Z',
      retry_error: 'stale continuation queue',
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:25:00.000Z'
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    const expectedClaim = {
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      task_id: 'task-1303-failed',
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(persist).toHaveBeenCalled();
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
  });

  it('demotes a stale running claim to accepted during explicit restart rehydrate when the only in-progress proof sidecar predates the manifest start', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-stale-proof-rehydrate'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-stale-proof-rehydrate');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-stale-proof-rehydrate',
        task_id: 'task-1303-stale-proof-rehydrate',
        status: 'in_progress',
        summary: 'worker resumed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        started_at: '2026-03-19T04:30:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        attempt_started_at: '2026-03-19T04:29:00.000Z',
        updated_at: '2026-03-19T04:29:00.000Z'
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
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      task_id: 'task-1303-stale-proof-rehydrate',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-stale-proof-rehydrate',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-stale-proof-rehydrate',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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

    await service.rehydrate();

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    const expectedClaim = {
      state: 'accepted',
      reason: 'provider_issue_rehydration_pending_revalidation',
      task_id: 'task-1303-stale-proof-rehydrate',
      run_id: 'run-stale-proof-rehydrate',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: null,
      retry_error: null
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(persist).toHaveBeenCalled();
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
  });

  it('reclassifies a stale running claim from terminal successful proof evidence and resumes the later Merging handoff', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-review-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-review-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-review-completed',
        task_id: 'task-1303-review-completed',
        status: 'in_progress',
        summary: 'worker still running',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:29:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
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
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-1303-review-completed',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-review-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-review-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start).not.toHaveBeenCalled();
    const expectedCompletedClaim = {
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-review-completed',
      run_id: 'run-review-completed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:01.000Z',
      retry_error: null
    };
    expect(state.claims[0]).toMatchObject(expectedCompletedClaim);
    expect(getPersistedState().claims[0]).toMatchObject(expectedCompletedClaim);

    const scheduledTimeoutCount = setTimeoutSpy.mock.calls.length;
    expect(scheduledTimeoutCount).toBeGreaterThanOrEqual(1);
    const [, delayMs] = setTimeoutSpy.mock.calls[scheduledTimeoutCount - 1] ?? [];
    expect(delayMs).toBeGreaterThanOrEqual(999);
    expect(delayMs).toBeLessThanOrEqual(1_000);
    vi.setSystemTime(new Date('2026-03-19T04:30:01.001Z'));
    const startCallsBeforeRetry = launcher.start.mock.calls.length;
    getLatestScheduledTimeoutCallback(setTimeoutSpy)();
    await flushAsyncWork();
    await waitForMockCalls(launcher.start, startCallsBeforeRetry + 1, 1_024);

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:30:30.000Z',
      launchToken: expect.any(String)
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_post_worker_exit_start_launched',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
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

  it('blocks queued retry start when real in-progress manifests already consume provider capacity', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const completedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-review-completed'
    };
    const completedPaths = resolveRunPaths(completedEnv, 'run-review-completed');
    await mkdir(completedPaths.runDir, { recursive: true });
    await writeFile(
      completedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-review-completed',
        task_id: 'task-1303-review-completed',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(completedPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );
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
        issue_identifier: 'CO-9',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-review-completed',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-review-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-review-completed',
      run_manifest_path: completedPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 1
        }
      }),
      resolveTrackedIssue: async ({ issueId }) => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          id: issueId,
          identifier: issueId === 'lin-issue-1' ? 'CO-2' : 'CO-9',
          state: issueId === 'lin-issue-1' ? 'Merging' : 'In Progress',
          state_type: 'started',
          updated_at: issueId === 'lin-issue-1' ? '2026-03-19T04:30:30.000Z' : '2026-03-19T04:25:00.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-review-completed',
      run_id: 'run-review-completed',
      run_manifest_path: completedPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:01.000Z',
      retry_error: null
    });
    await writeFile(
      completedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-review-completed',
        task_id: 'task-1303-review-completed',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        updated_at: '2026-03-19T04:30:30.000Z'
      }),
      'utf8'
    );
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-occupied',
      issue_id: 'lin-issue-occupied',
      issue_identifier: 'CO-9',
      issue_title: 'Occupied slot',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      task_id: 'task-occupied',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:25:05.000Z',
      updated_at: '2026-03-19T04:25:10.000Z',
      last_delivery_id: 'delivery-occupied',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_250_000,
      run_id: 'run-occupied',
      run_manifest_path: occupiedPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });
    vi.setSystemTime(new Date('2026-03-19T04:30:01.001Z'));
    const persistCallsBeforeRetry = persist.mock.calls.length;
    getLatestScheduledTimeoutCallback(setTimeoutSpy)();
    await flushAsyncWork();
    await waitForMockCalls(persist, persistCallsBeforeRetry + 1, 1_024);

    const blockedClaim = state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-1');
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(blockedClaim).toMatchObject({
      state: 'accepted',
      reason: 'provider_issue_post_worker_exit_start_blocked:max_concurrency',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-review-completed',
      run_manifest_path: completedPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_error: null
    });
    expect(Date.parse(blockedClaim?.retry_due_at ?? '')).toBeGreaterThan(
      Date.parse('2026-03-19T04:30:01.000Z')
    );
    expect(state.claims.find((claim) => claim.provider_key === 'linear:lin-issue-occupied')).toMatchObject({
      state: 'running',
      run_id: 'run-occupied',
      run_manifest_path: occupiedPaths.manifestPath
    });
    expect(getPersistedState().claims.find((claim) => claim.provider_key === 'linear:lin-issue-1')).toMatchObject({
      state: 'accepted',
      reason: 'provider_issue_post_worker_exit_start_blocked:max_concurrency'
    });
  });

  it('runs deterministic merge closeout on refresh after recovering a terminal successful Merging-stage run', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-merge-closeout'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-merge-closeout');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-merge-closeout',
        task_id: 'task-1303-merge-closeout',
        status: 'in_progress',
        summary: 'worker still running',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:29:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        thread_id: 'thread-merge-drain',
        turn_count: 20,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-merge-closeout',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-merge-closeout',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-merge-closeout',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:30:30.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      status: 'merged' as const,
      reason: 'merged_and_transitioned_done',
      summary: 'Merged attached PR #357 and transitioned the Linear issue to Done.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/357',
        owner: 'asabeko',
        repo: 'CO',
        number: 357
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
        updated_at: '2026-03-19T04:30:30.000Z',
        merged_at: '2026-03-19T04:30:30.000Z',
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: {
        status: 'reconciled' as const,
        attempted_at: '2026-03-19T04:30:20.000Z',
        before_status: '## main...origin/main',
        after_status: '## main...origin/main',
        reason: 'shared_root_reconciled'
      },
      linear_transition: {
        status: 'transitioned' as const,
        attempted_at: '2026-03-19T04:30:25.000Z',
        previous_state: 'Merging',
        target_state: 'Done',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        error: null
      }
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      readFeatureToggles: () => ({
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            workspace_id: 'workspace-1',
            team_id: 'team-1',
            project_id: 'project-1',
            summary: 'scoped merge-closeout test source'
          }
        }
      }),
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(runMergeCloseout).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueState: 'Merging',
      issueStateType: 'started',
      issueUpdatedAt: '2026-03-19T04:30:30.000Z',
      previousBranchRecovery: null,
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'workspace-1',
        team_id: 'team-1',
        project_id: 'project-1'
      },
      env: expect.objectContaining({
        [PROVIDER_LINEAR_AUDIT_ENV_VAR]: join(
          dirname(childPaths.manifestPath),
          PROVIDER_LINEAR_WORKER_AUDIT_FILENAME
        )
      }),
      repoRoot: root
    }));
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    const expectedClaim = {
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-merge-closeout',
      run_id: 'run-merge-closeout',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done',
      issue_state: 'Done',
      linear_transition: {
        status: 'transitioned',
        target_state: 'Done'
      }
    });
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
    expect(getPersistedState().claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done'
    });
  });

  it('runs deterministic merge closeout during rehydrate after recovering a terminal successful Merging-stage run', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-merge-closeout-rehydrate'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-merge-closeout-rehydrate');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-merge-closeout-rehydrate',
        task_id: 'task-1303-merge-closeout-rehydrate',
        status: 'in_progress',
        summary: 'worker still running',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:29:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        thread_id: 'thread-merge-drain',
        turn_count: 20,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-merge-closeout-rehydrate',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-merge-closeout-rehydrate',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-merge-closeout-rehydrate',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:30:30.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      status: 'merged' as const,
      reason: 'merged_and_transitioned_done',
      summary: 'Merged attached PR #357 and transitioned the Linear issue to Done.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/357',
        owner: 'asabeko',
        repo: 'CO',
        number: 357
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
        updated_at: '2026-03-19T04:30:30.000Z',
        merged_at: '2026-03-19T04:30:30.000Z',
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: {
        status: 'reconciled' as const,
        attempted_at: '2026-03-19T04:30:20.000Z',
        before_status: '## main...origin/main',
        after_status: '## main...origin/main',
        reason: 'shared_root_reconciled'
      },
      linear_transition: {
        status: 'transitioned' as const,
        attempted_at: '2026-03-19T04:30:25.000Z',
        previous_state: 'Merging',
        target_state: 'Done',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        error: null
      }
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      readFeatureToggles: () => ({
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            workspace_id: 'workspace-1',
            team_id: 'team-1',
            project_id: 'project-1',
            summary: 'scoped merge-closeout test source'
          }
        }
      }),
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.rehydrate();

    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      task_id: 'task-1303-merge-closeout-rehydrate',
      run_id: 'run-merge-closeout-rehydrate',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done'
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      task_id: 'task-1303-merge-closeout-rehydrate',
      run_id: 'run-merge-closeout-rehydrate',
      run_manifest_path: childPaths.manifestPath
    });
    expect(getPersistedState().claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done'
    });
  });

  it('preserves a recovered merged claim during rehydrate when tracked issue refresh is stale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-merge-closeout-stale-rehydrate'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-merge-closeout-stale-rehydrate');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-merge-closeout-stale-rehydrate',
        task_id: 'task-1303-merge-closeout-stale-rehydrate',
        status: 'in_progress',
        summary: 'worker still appears live',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-merge-closeout-stale-rehydrate',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:30:40.000Z',
      last_delivery_id: 'delivery-merge-closeout-stale-rehydrate',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-merge-closeout-stale-rehydrate',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'merged',
        reason: 'merged_and_shared_root_reconciled_transition_deferred',
        summary:
          'Attached PR #357 was already merged and the shared root is reconciled; local merge closeout is authoritative while the Linear Done transition is deferred by shared-budget cooldown.',
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
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: '2026-03-19T04:30:30.000Z',
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: {
          status: 'reconciled',
          attempted_at: '2026-03-19T04:30:20.000Z',
          before_status: '## main...origin/main',
          after_status: '## main...origin/main',
          reason: 'shared_root_reconciled'
        },
        linear_transition: {
          status: 'failed',
          attempted_at: '2026-03-19T04:30:25.000Z',
          previous_state: 'Merging',
          target_state: 'Done',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-19T04:30:30.000Z',
          error: 'linear_rate_limited: Linear shared budget cooldown is active.'
        }
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => {
      throw new Error('runMergeCloseout should not rerun for a stale rehydrate refresh.');
    });

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:29.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.rehydrate();

    expect(runMergeCloseout).not.toHaveBeenCalled();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z'
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_shared_root_reconciled_transition_deferred'
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z'
    });
    expect(getPersistedState().claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_shared_root_reconciled_transition_deferred'
    });
  });

  it.each([
    ['starting', 'provider_issue_start_launched'],
    ['resuming', 'provider_issue_resume_launched']
  ] as const)(
    'runs deterministic merge closeout during rehydrate for recovered %s claims',
    async (claimState, claimReason) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

      const { root, paths } = await createHostPaths();
      const childEnv = {
        repoRoot: root,
        runsRoot: join(root, '.runs'),
        outRoot: join(root, 'out'),
        taskId: `task-1303-merge-closeout-${claimState}-rehydrate`
      };
      const childPaths = resolveRunPaths(childEnv, `run-merge-closeout-${claimState}-rehydrate`);
      await mkdir(childPaths.runDir, { recursive: true });
      await writeFile(
        childPaths.manifestPath,
        JSON.stringify({
          run_id: `run-merge-closeout-${claimState}-rehydrate`,
          task_id: `task-1303-merge-closeout-${claimState}-rehydrate`,
          status: 'in_progress',
          started_at: '2026-03-19T04:20:00.000Z',
          summary: 'worker still running',
          issue_provider: 'linear',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_updated_at: '2026-03-19T04:20:00.000Z',
          updated_at: '2026-03-19T04:29:00.000Z'
        }),
        'utf8'
      );
      await writeFile(
        join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
        JSON.stringify({
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          owner_phase: 'ended',
          owner_status: 'succeeded',
          end_reason: 'max_turns_reached_issue_still_active',
          attempt_started_at: '2026-03-19T04:20:00.000Z',
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
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
        issue_assignee_id: null,
        issue_assignee_name: null,
        task_id: `task-1303-merge-closeout-${claimState}-rehydrate`,
        mapping_source: 'provider_id_fallback',
        state: claimState,
        reason: claimReason,
        accepted_at: '2026-03-19T04:20:05.000Z',
        updated_at: '2026-03-19T04:20:10.000Z',
        last_delivery_id: `delivery-merge-closeout-${claimState}-rehydrate`,
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_050_000,
        run_id: `run-merge-closeout-${claimState}-rehydrate`,
        run_manifest_path: childPaths.manifestPath,
        launch_source: 'control-host',
        launch_token: `${claimState}-launch-token`
      });

      const { persist, getPersistedState } = createPersistSnapshotSpy(state);
      const launcher = {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      };
      const runMergeCloseout = vi.fn(async () => ({
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'merged' as const,
        reason: 'merged_and_transitioned_done',
        summary: 'Merged attached PR #357 and transitioned the Linear issue to Done.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/357',
          owner: 'asabeko',
          repo: 'CO',
          number: 357
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
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: '2026-03-19T04:30:30.000Z',
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: {
          status: 'reconciled' as const,
          attempted_at: '2026-03-19T04:30:20.000Z',
          before_status: '## main...origin/main',
          after_status: '## main...origin/main',
          reason: 'shared_root_reconciled'
        },
        linear_transition: {
          status: 'transitioned' as const,
          attempted_at: '2026-03-19T04:30:25.000Z',
          previous_state: 'Merging',
          target_state: 'Done',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-03-19T04:30:30.000Z',
          error: null
        }
      }));

      const service = createProviderIssueHandoffService({
        paths,
        state,
        persist,
        launcher,
        runMergeCloseout,
        readFeatureToggles: () => ({
          dispatch_pilot: {
            enabled: true,
            source: {
              provider: 'linear',
              workspace_id: 'workspace-1',
              team_id: 'team-1',
              project_id: 'project-1',
              summary: 'scoped merge-closeout test source'
            }
          }
        }),
        resolveTrackedIssue: async () => ({
          kind: 'ready',
          trackedIssue: createTrackedIssue({
            state: 'Merging',
            state_type: 'started',
            updated_at: '2026-03-19T04:30:30.000Z',
            assignee_id: null,
            assignee_name: null
          })
        })
      });

      await service.rehydrate();

      expect(runMergeCloseout).toHaveBeenCalledTimes(1);
      expect(launcher.start).not.toHaveBeenCalled();
      expect(launcher.resume).not.toHaveBeenCalled();
      expect(state.claims[0]).toMatchObject({
        state: 'completed',
        reason: 'provider_issue_merge_closeout_merged',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        task_id: `task-1303-merge-closeout-${claimState}-rehydrate`,
        run_id: `run-merge-closeout-${claimState}-rehydrate`,
        run_manifest_path: childPaths.manifestPath
      });
      expect(state.claims[0]?.merge_closeout).toMatchObject({
        status: 'merged',
        reason: 'merged_and_transitioned_done'
      });
      expect(getPersistedState().claims[0]).toMatchObject({
        state: 'completed',
        reason: 'provider_issue_merge_closeout_merged',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        task_id: `task-1303-merge-closeout-${claimState}-rehydrate`,
        run_id: `run-merge-closeout-${claimState}-rehydrate`,
        run_manifest_path: childPaths.manifestPath
      });
      expect(getPersistedState().claims[0]?.merge_closeout).toMatchObject({
        status: 'merged',
        reason: 'merged_and_transitioned_done'
      });
    }
  );

  it('runs deterministic merge closeout during rehydrate when a fresh proof confirms a succeeded manifest', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-merge-closeout-succeeded-manifest-rehydrate'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-merge-closeout-succeeded-manifest-rehydrate');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-merge-closeout-succeeded-manifest-rehydrate',
        task_id: 'task-1303-merge-closeout-succeeded-manifest-rehydrate',
        status: 'succeeded',
        started_at: '2026-03-19T04:20:00.000Z',
        summary: 'worker completed successfully',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:29:30.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active',
        attempt_started_at: '2026-03-19T04:20:00.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-merge-closeout-succeeded-manifest-rehydrate',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-merge-closeout-succeeded-manifest-rehydrate',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-merge-closeout-succeeded-manifest-rehydrate',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:30:30.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      status: 'merged' as const,
      reason: 'merged_and_transitioned_done_after_recovery',
      summary: 'Attached PR #357 was already merged; reconciled shared root and transitioned the Linear issue to Done.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/357',
        owner: 'asabeko',
        repo: 'CO',
        number: 357
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
        updated_at: '2026-03-19T04:30:30.000Z',
        merged_at: '2026-03-19T04:30:30.000Z',
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: {
        status: 'reconciled' as const,
        attempted_at: '2026-03-19T04:30:20.000Z',
        before_status: '## main...origin/main',
        after_status: '## main...origin/main',
        reason: 'shared_root_reconciled'
      },
      linear_transition: {
        status: 'transitioned' as const,
        attempted_at: '2026-03-19T04:30:25.000Z',
        previous_state: 'Merging',
        target_state: 'Done',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        error: null
      }
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      readFeatureToggles: () => ({
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            workspace_id: 'workspace-1',
            team_id: 'team-1',
            project_id: 'project-1',
            summary: 'scoped merge-closeout test source'
          }
        }
      }),
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.rehydrate();

    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      task_id: 'task-1303-merge-closeout-succeeded-manifest-rehydrate',
      run_id: 'run-merge-closeout-succeeded-manifest-rehydrate',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done_after_recovery'
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      task_id: 'task-1303-merge-closeout-succeeded-manifest-rehydrate',
      run_id: 'run-merge-closeout-succeeded-manifest-rehydrate',
      run_manifest_path: childPaths.manifestPath
    });
    expect(getPersistedState().claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done_after_recovery'
    });
  });

  it('ignores stale merge closeout results when the live issue is no longer in Merging', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-merge-closeout-stale-live-state'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-merge-closeout-stale-live-state');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-merge-closeout-stale-live-state',
        task_id: 'task-1303-merge-closeout-stale-live-state',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-1303-merge-closeout-stale-live-state',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-merge-closeout-stale-live-state',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-merge-closeout-stale-live-state',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:30:30.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      status: 'action_required' as const,
      reason: 'issue_no_longer_merging',
      summary: 'Live Linear issue state is In Review, so deterministic merge closeout is not armed.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/357',
        owner: 'asabeko',
        repo: 'CO',
        number: 357
      },
      snapshot: null,
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'owned',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: 'viewer-1',
          assignee_name: 'Codex'
        })
      })
    });

    await service.refresh();

    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_handoff_owned',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      run_id: 'run-merge-closeout-stale-live-state',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.claims[0]?.merge_closeout ?? null).toBeNull();
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_handoff_owned'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('clears stale merge_closeout residue during completed-run rehydrate when newer tracked issue truth is active again', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-138-stale-merge-closeout-rehydrate'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-138-stale-merge-closeout-rehydrate');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-138-stale-merge-closeout-rehydrate',
        task_id: 'task-138-stale-merge-closeout-rehydrate',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-138',
      issue_title: 'Stale merge closeout',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-138-stale-merge-closeout-rehydrate',
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-138-stale-merge-closeout-rehydrate',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-138-stale-merge-closeout-rehydrate',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      review_promotion: {
        recorded_at: '2026-03-19T04:30:20.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:20.000Z',
        status: 'promoted',
        reason: 'promoted_to_merging',
        summary: 'Review handoff already advanced into Merging.',
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
          updated_at: '2026-03-19T04:30:20.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        linear_transition: null
      },
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'action_required',
        reason: 'merge_state_behind',
        summary: 'Attached PR #357 is behind origin/main and cannot merge yet.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/357',
          owner: 'asabeko',
          repo: 'CO',
          number: 357
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BEHIND',
          ready_to_merge: false,
          gate_reasons: ['mergeStateStatus=BEHIND'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
          identifier: 'CO-138',
          title: 'Stale merge closeout',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:40:00.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.rehydrate();

    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      run_id: 'run-138-stale-merge-closeout-rehydrate',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true
    });
    expect(state.claims[0]?.merge_closeout ?? null).toBeNull();
    expect(state.claims[0]?.review_promotion ?? null).toBeNull();
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      issue_state: 'In Progress',
      retry_queued: true
    });
    expect(getPersistedState().claims[0]?.merge_closeout ?? null).toBeNull();
    expect(getPersistedState().claims[0]?.review_promotion ?? null).toBeNull();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('does not run deterministic merge closeout on refresh while an owned Merging issue only has a queued run', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-merge-closeout-queued-owned'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-merge-closeout-queued-owned');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-merge-closeout-queued-owned',
        task_id: 'task-1303-merge-closeout-queued-owned',
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-1303-merge-closeout-queued-owned',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-merge-closeout-queued-owned',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-merge-closeout-queued-owned',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => {
      throw new Error('merge closeout should not run while the newest run is still queued');
    });

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'owned',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: 'viewer-1',
          assignee_name: 'Codex'
        })
      })
    });

    await service.refresh();

    expect(runMergeCloseout).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_handoff_owned',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      run_id: 'run-merge-closeout-queued-owned',
      run_manifest_path: childPaths.manifestPath
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_handoff_owned'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('stores non-retryable merge closeout outcomes as handoff_failed instead of generic completed continuation', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-merge-closeout-action-required'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-merge-closeout-action-required');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-merge-closeout-action-required',
        task_id: 'task-1303-merge-closeout-action-required',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-merge-closeout-action-required',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-merge-closeout-action-required',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-merge-closeout-action-required',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      retry_queued: true,
      retry_attempt: 2,
      retry_due_at: '2026-03-19T04:45:00.000Z',
      retry_error: 'stale continuation queue'
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:30:30.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      status: 'action_required' as const,
      reason: 'pr_closed_unmerged',
      summary: 'Attached PR #357 is closed without merging; reopen it or attach a replacement PR.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
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
        updated_at: '2026-03-19T04:30:30.000Z',
        merged_at: null,
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'action_required',
      reason: 'pr_closed_unmerged'
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('retries pending shared-root reconciliation while the issue remains in Merging', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-merge-closeout-pending-shared-root'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-merge-closeout-pending-shared-root');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-merge-closeout-pending-shared-root',
        task_id: 'task-1303-merge-closeout-pending-shared-root',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        updated_at: '2026-03-19T04:30:30.000Z'
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-merge-closeout-pending-shared-root',
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-merge-closeout-pending-shared-root',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-merge-closeout-pending-shared-root',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'action_required',
        reason: 'pending_shared_root_reconciliation',
        summary:
          'Attached PR #357 was already merged; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/357',
          owner: 'asabeko',
          repo: 'CO',
          number: 357
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
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: '2026-03-19T04:30:00.000Z',
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: {
          status: 'skipped',
          attempted_at: '2026-03-19T04:30:30.000Z',
          before_status: '## main...origin/main\\n M tasks/index.json',
          after_status: '## main...origin/main\\n M tasks/index.json',
          reason: 'shared_root_dirty'
        },
        linear_transition: null
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:35:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:35:00.000Z',
      status: 'merged' as const,
      reason: 'merged_and_transitioned_done_after_recovery',
      summary:
        'Attached PR #357 was already merged; reconciled shared root and transitioned the Linear issue to Done.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/357',
        owner: 'asabeko',
        repo: 'CO',
        number: 357
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
        updated_at: '2026-03-19T04:35:00.000Z',
        merged_at: '2026-03-19T04:30:00.000Z',
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: {
        status: 'reconciled',
        attempted_at: '2026-03-19T04:35:00.000Z',
        before_status: '## main...origin/main',
        after_status: '## main...origin/main',
        reason: 'shared_root_reconciled'
      },
      linear_transition: {
        status: 'transitioned',
        attempted_at: '2026-03-19T04:35:00.000Z',
        previous_state: 'Merging',
        target_state: 'Done',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-03-19T04:35:00.000Z',
        error: null
      }
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:35:00.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:35:00.000Z',
      run_id: 'run-merge-closeout-pending-shared-root',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done_after_recovery',
      shared_root: {
        status: 'reconciled',
        reason: 'shared_root_reconciled'
      }
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('persists ignored historical and conflicting attached PR URL truth when merge closeout remains multiple_attached_prs action required', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-merge-closeout-multiple-attached-prs'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-merge-closeout-multiple-attached-prs');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-merge-closeout-multiple-attached-prs',
        task_id: 'task-1303-merge-closeout-multiple-attached-prs',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        updated_at: '2026-03-19T04:30:30.000Z'
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-merge-closeout-multiple-attached-prs',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-merge-closeout-multiple-attached-prs',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-merge-closeout-multiple-attached-prs',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:30:30.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      status: 'action_required' as const,
      reason: 'multiple_attached_prs',
      summary:
        'Multiple attached GitHub pull requests match asabeko/co; conflicting current candidate PR URLs: https://github.com/asabeko/CO/pull/372, https://github.com/asabeko/CO/pull/373. Ignored historical merged PR URLs: https://github.com/asabeko/CO/pull/360.',
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/360',
        'https://github.com/asabeko/CO/pull/372',
        'https://github.com/asabeko/CO/pull/373'
      ],
      ignored_historical_pr_urls: ['https://github.com/asabeko/CO/pull/360'],
      conflicting_attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/372',
        'https://github.com/asabeko/CO/pull/373'
      ],
      pr: null,
      snapshot: null,
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z'
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'action_required',
      reason: 'multiple_attached_prs',
      ignored_historical_pr_urls: ['https://github.com/asabeko/CO/pull/360'],
      conflicting_attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/372',
        'https://github.com/asabeko/CO/pull/373'
      ]
    });
    expect(getPersistedState().claims[0]?.merge_closeout).toMatchObject({
      status: 'action_required',
      reason: 'multiple_attached_prs',
      ignored_historical_pr_urls: ['https://github.com/asabeko/CO/pull/360'],
      conflicting_attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/372',
        'https://github.com/asabeko/CO/pull/373'
      ]
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('clears stale merge_closeout metadata when refresh launches a fresh attempt after action-required closeout', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-merge-closeout-action-required',
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-merge-closeout-retry-launch',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null,
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'action_required',
        reason: 'pr_closed_unmerged',
        summary: 'Attached PR #357 is closed without merging; reopen it or attach a replacement PR.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
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
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-merge-closeout-retry-launch',
        manifestPath: '/tmp/provider-run/merge-closeout-retry-launch.json'
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
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:40:00.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_refresh_start_launched',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      run_id: 'run-merge-closeout-retry-launch',
      run_manifest_path: '/tmp/provider-run/merge-closeout-retry-launch.json'
    });
    expect(state.claims[0]?.merge_closeout ?? null).toBeNull();
    expect(getPersistedState().claims[0]?.merge_closeout ?? null).toBeNull();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('clears stale merge_closeout residue on refresh when a completed run now has newer active issue truth', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-138-stale-merge-closeout-refresh'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-138-stale-merge-closeout-refresh');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-138-stale-merge-closeout-refresh',
        task_id: 'task-138-stale-merge-closeout-refresh',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-138',
      issue_title: 'Stale merge closeout',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-138-stale-merge-closeout-refresh',
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-138-stale-merge-closeout-refresh',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-138-stale-merge-closeout-refresh',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      review_promotion: {
        recorded_at: '2026-03-19T04:30:20.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:20.000Z',
        status: 'promoted',
        reason: 'promoted_to_merging',
        summary: 'Review handoff already advanced into Merging.',
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
          updated_at: '2026-03-19T04:30:20.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        linear_transition: null
      },
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'action_required',
        reason: 'merge_state_behind',
        summary: 'Attached PR #357 is behind origin/main and cannot merge yet.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/357',
          owner: 'asabeko',
          repo: 'CO',
          number: 357
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BEHIND',
          ready_to_merge: false,
          gate_reasons: ['mergeStateStatus=BEHIND'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
          identifier: 'CO-138',
          title: 'Stale merge closeout',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:40:00.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      run_id: 'run-138-stale-merge-closeout-refresh',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true
    });
    expect(state.claims[0]?.merge_closeout ?? null).toBeNull();
    expect(state.claims[0]?.review_promotion ?? null).toBeNull();
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      issue_state: 'In Progress',
      retry_queued: true
    });
    expect(getPersistedState().claims[0]?.merge_closeout ?? null).toBeNull();
    expect(getPersistedState().claims[0]?.review_promotion ?? null).toBeNull();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('preserves a fresher terminal merge_closeout record on refresh when tracked issue truth is an older replay', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-138-stale-merge-closeout-refresh-stale-replay'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-138-stale-merge-closeout-refresh-stale-replay');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-138-stale-merge-closeout-refresh-stale-replay',
        task_id: 'task-138-stale-merge-closeout-refresh-stale-replay',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-138',
      issue_title: 'Stale merge closeout',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-138-stale-merge-closeout-refresh-stale-replay',
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-138-stale-merge-closeout-refresh-stale-replay',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-138-stale-merge-closeout-refresh-stale-replay',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-138',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'action_required',
        reason: 'merge_state_behind',
        summary: 'Attached PR #357 is behind origin/main and cannot merge yet.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/357',
          owner: 'asabeko',
          repo: 'CO',
          number: 357
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BEHIND',
          ready_to_merge: false,
          gate_reasons: ['mergeStateStatus=BEHIND'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
          identifier: 'CO-138',
          title: 'Stale merge closeout',
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:35:00.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z'
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'action_required',
      reason: 'merge_state_behind',
      issue_updated_at: '2026-03-19T04:30:30.000Z'
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:40:00.000Z'
    });
    expect(getPersistedState().claims[0]?.merge_closeout).toMatchObject({
      status: 'action_required',
      reason: 'merge_state_behind',
      issue_updated_at: '2026-03-19T04:30:30.000Z'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('reclassifies a completed Merging-stage worker run and queues an automatic retry when the proof shows issue_still_active exhaustion', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-merge-drain'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-merge-drain');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-merge-drain',
        task_id: 'task-1303-merge-drain',
        status: 'in_progress',
        summary: 'worker still running',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:29:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        thread_id: 'thread-merge-drain',
        turn_count: 20,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-merge-drain',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-merge-drain',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-merge-drain',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => ({
        runId: 'run-merge-drain-retry',
        manifestPath: '/tmp/provider-run/merge-drain-retry-manifest.json'
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
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start).not.toHaveBeenCalled();
    const expectedCompletedClaim = {
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-merge-drain',
      run_id: 'run-merge-drain',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:01.000Z',
      retry_error: null
    };
    expect(state.claims[0]).toMatchObject(expectedCompletedClaim);
    expect(getPersistedState().claims[0]).toMatchObject(expectedCompletedClaim);

    const scheduledTimeoutCount = setTimeoutSpy.mock.calls.length;
    expect(scheduledTimeoutCount).toBeGreaterThanOrEqual(1);
    const [, delayMs] = setTimeoutSpy.mock.calls[scheduledTimeoutCount - 1] ?? [];
    expect(delayMs).toBeGreaterThanOrEqual(999);
    expect(delayMs).toBeLessThanOrEqual(1_000);
    vi.setSystemTime(new Date('2026-03-19T04:30:01.001Z'));
    const startCallsBeforeRetry = launcher.start.mock.calls.length;
    getLatestScheduledTimeoutCallback(setTimeoutSpy)();
    await flushAsyncWork();
    await waitForMockCalls(launcher.start, startCallsBeforeRetry + 1, 1_024);

    expect(launcher.resume).not.toHaveBeenCalled();
    expect(launcher.start.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:30:30.000Z',
      residentSessionSeed: {
        source_run_id: 'run-merge-drain',
        source_updated_at: '2026-03-19T04:30:00.000Z',
        source_end_reason: 'max_turns_reached_issue_still_active',
        source_thread_id: 'thread-merge-drain',
        logical_turn_count: 20,
        restart_count: 1
      },
      launchToken: expect.any(String)
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'starting',
      reason: 'provider_issue_post_worker_exit_start_launched',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'linear-lin-issue-1',
      run_id: 'run-merge-drain-retry',
      run_manifest_path: '/tmp/provider-run/merge-drain-retry-manifest.json',
      launch_source: 'control-host',
      launch_token: expect.any(String),
      retry_queued: false,
      retry_attempt: 1,
      retry_due_at: null,
      retry_error: null
    });
  });

  it('does not run deterministic merge closeout for a live Merging active run without terminal proof', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-live-merge-worker'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-live-merge-worker');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-live-merge-worker',
        task_id: 'task-1303-live-merge-worker',
        status: 'in_progress',
        summary: 'worker resumed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
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
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-1303-live-merge-worker',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-live-merge-worker',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-live-merge-worker',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:30:30.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      status: 'watching' as const,
      reason: 'probe_pr_not_merged',
      summary: 'Attached PR #357 is not merged yet, so merged recovery cannot retire the rehydrated Merging claim.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/357',
        owner: 'asabeko',
        repo: 'CO',
        number: 357
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
        updated_at: '2026-03-19T04:30:30.000Z',
        merged_at: null,
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    }));
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(runMergeCloseout).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueState: 'Merging',
      env: expect.objectContaining({
        [PROVIDER_LINEAR_AUDIT_ENV_VAR]: join(childPaths.runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME)
      }),
      mode: 'probe-merged-recovery',
      repoRoot: root
    }));
    const expectedClaim = {
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-live-merge-worker',
      run_id: 'run-live-merge-worker',
      run_manifest_path: childPaths.manifestPath
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
    expect(state.claims[0]?.merge_closeout ?? null).toBeNull();
    expect(getPersistedState().claims[0]?.merge_closeout ?? null).toBeNull();
  });

  it('does not run deterministic merge closeout for a stale Merging snapshot older than the claim', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-stale-merge-snapshot'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-stale-merge-snapshot');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-stale-merge-snapshot',
        task_id: 'task-1303-stale-merge-snapshot',
        status: 'in_progress',
        summary: 'worker resumed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-stale-merge-snapshot',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-stale-merge-snapshot',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-stale-merge-snapshot',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => {
      throw new Error('runMergeCloseout should not be called for a stale tracked issue snapshot.');
    });
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:29.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(runMergeCloseout).not.toHaveBeenCalled();
    const expectedClaim = {
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-stale-merge-snapshot',
      run_id: 'run-stale-merge-snapshot',
      run_manifest_path: childPaths.manifestPath
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
  });

  it('retires a rehydrated active Merging claim when probe-only merge closeout proves the PR is already merged under cooldown suppression', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active-merge-recovery'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-active-merge-recovery');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active-merge-recovery',
        task_id: 'task-1303-active-merge-recovery',
        status: 'in_progress',
        summary: 'worker still appears live',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-active-merge-recovery',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-active-merge-recovery',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-active-merge-recovery',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:30:30.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      status: 'merged' as const,
      reason: 'merged_and_shared_root_reconciled_transition_deferred',
      summary:
        'Attached PR #357 was already merged and the shared root is reconciled; local merge closeout is authoritative while the Linear Done transition is deferred by shared-budget cooldown.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/357',
        owner: 'asabeko',
        repo: 'CO',
        number: 357
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
        updated_at: '2026-03-19T04:30:30.000Z',
        merged_at: '2026-03-19T04:30:30.000Z',
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: {
        status: 'reconciled' as const,
        attempted_at: '2026-03-19T04:30:20.000Z',
        before_status: '## main...origin/main',
        after_status: '## main...origin/main',
        reason: 'shared_root_reconciled'
      },
      linear_transition: {
        status: 'failed' as const,
        attempted_at: '2026-03-19T04:30:25.000Z',
        previous_state: 'Merging',
        target_state: 'Done',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        error: 'linear_rate_limited: Linear shared budget cooldown is active.'
      }
    }));
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(runMergeCloseout).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueState: 'Merging',
      env: expect.objectContaining({
        [PROVIDER_LINEAR_AUDIT_ENV_VAR]: join(childPaths.runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME)
      }),
      mode: 'probe-merged-recovery',
      repoRoot: root
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      task_id: 'task-1303-active-merge-recovery',
      run_id: 'run-active-merge-recovery',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_shared_root_reconciled_transition_deferred',
      linear_transition: {
        status: 'failed',
        target_state: 'Done'
      }
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged'
    });
  });

  it('persists issue metadata from the merged probe closeout when active-run recovery reaches Done', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active-merge-recovery-done'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-active-merge-recovery-done');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active-merge-recovery-done',
        task_id: 'task-1303-active-merge-recovery-done',
        status: 'in_progress',
        summary: 'worker still appears live',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-active-merge-recovery-done',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-active-merge-recovery-done',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-active-merge-recovery-done',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:30:30.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      status: 'merged' as const,
      reason: 'merged_and_transitioned_done_after_recovery',
      summary: 'Attached PR #357 was already merged; reconciled shared root and transitioned the Linear issue to Done.',
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
        updated_at: '2026-03-19T04:30:30.000Z',
        merged_at: '2026-03-19T04:30:30.000Z',
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: {
        status: 'reconciled' as const,
        attempted_at: '2026-03-19T04:30:20.000Z',
        before_status: '## main...origin/main',
        after_status: '## main...origin/main',
        reason: 'shared_root_reconciled'
      },
      linear_transition: {
        status: 'transitioned' as const,
        attempted_at: '2026-03-19T04:30:25.000Z',
        previous_state: 'Merging',
        target_state: 'Done',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        error: null
      }
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      task_id: 'task-1303-active-merge-recovery-done',
      run_id: 'run-active-merge-recovery-done',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done_after_recovery',
      issue_state: 'Done',
      issue_state_type: 'completed'
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-03-19T04:30:30.000Z'
    });
  });

  it('reprobes a newer recovered merged claim before preserving its terminal closeout', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active-merge-preserved'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-active-merge-preserved');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active-merge-preserved',
        task_id: 'task-1303-active-merge-preserved',
        status: 'in_progress',
        summary: 'worker still appears live',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-active-merge-preserved',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:30:40.000Z',
      last_delivery_id: 'delivery-active-merge-preserved',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-active-merge-preserved',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'merged',
        reason: 'merged_and_shared_root_reconciled_transition_deferred',
        summary:
          'Attached PR #357 was already merged and the shared root is reconciled; local merge closeout is authoritative while the Linear Done transition is deferred by shared-budget cooldown.',
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
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: '2026-03-19T04:30:30.000Z',
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: {
          status: 'reconciled',
          attempted_at: '2026-03-19T04:30:20.000Z',
          before_status: '## main...origin/main',
          after_status: '## main...origin/main',
          reason: 'shared_root_reconciled'
        },
        linear_transition: {
          status: 'failed',
          attempted_at: '2026-03-19T04:30:25.000Z',
          previous_state: 'Merging',
          target_state: 'Done',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-19T04:30:30.000Z',
          error: 'linear_rate_limited: Linear shared budget cooldown is active.'
        }
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi
      .fn()
      .mockResolvedValueOnce({
        ...state.claims[0]!.merge_closeout!,
        issue_updated_at: '2026-03-19T04:31:00.000Z',
        linear_transition: {
          ...state.claims[0]!.merge_closeout!.linear_transition!,
          issue_updated_at: '2026-03-19T04:31:00.000Z'
        }
      })
      .mockResolvedValueOnce({
        ...state.claims[0]!.merge_closeout!,
        issue_updated_at: '2026-03-19T04:31:30.000Z',
        linear_transition: {
          ...state.claims[0]!.merge_closeout!.linear_transition!,
          issue_updated_at: '2026-03-19T04:31:30.000Z'
        }
      });

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:31:00.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:31:00.000Z'
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Merging',
      issue_state_type: 'started'
    });

    const rehydratedState = normalizeProviderIntakeState(
      JSON.parse(JSON.stringify(getPersistedState()))
    );
    const { persist: rehydratedPersist, getPersistedState: getRehydratedPersistedState } =
      createPersistSnapshotSpy(rehydratedState);
    const restartedService = createProviderIssueHandoffService({
      paths,
      state: rehydratedState,
      persist: rehydratedPersist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:31:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await restartedService.rehydrate();
    await restartedService.refresh();

    expect(runMergeCloseout).toHaveBeenCalledTimes(2);
    expect(rehydratedState.claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:31:30.000Z'
    });
    expect(getRehydratedPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:31:30.000Z'
    });
  });

  it('reactivates a recovered claim when a newer tracked Merging issue invalidates the stored terminal closeout', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-reopened-after-merge-closeout'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-reopened-after-merge-closeout');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-reopened-after-merge-closeout',
        task_id: 'task-1303-reopened-after-merge-closeout',
        status: 'in_progress',
        summary: 'worker still appears live',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-reopened-after-merge-closeout',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:30:40.000Z',
      last_delivery_id: 'delivery-reopened-after-merge-closeout',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-reopened-after-merge-closeout',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'merged',
        reason: 'merged_and_shared_root_reconciled_transition_deferred',
        summary:
          'Attached PR #357 was already merged and the shared root is reconciled; local merge closeout is authoritative while the Linear Done transition is deferred by shared-budget cooldown.',
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
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: '2026-03-19T04:30:30.000Z',
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: {
          status: 'reconciled',
          attempted_at: '2026-03-19T04:30:20.000Z',
          before_status: '## main...origin/main',
          after_status: '## main...origin/main',
          reason: 'shared_root_reconciled'
        },
        linear_transition: {
          status: 'failed',
          attempted_at: '2026-03-19T04:30:25.000Z',
          previous_state: 'Merging',
          target_state: 'Done',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-19T04:30:30.000Z',
          error: 'linear_rate_limited: Linear shared budget cooldown is active.'
        }
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      ...state.claims[0]!.merge_closeout!,
      issue_updated_at: '2026-03-19T04:31:00.000Z',
      status: 'watching' as const,
      reason: 'probe_pr_not_merged',
      summary: 'Attached PR #357 is not merged yet, so merged recovery cannot retire the rehydrated Merging claim.',
      snapshot: {
        ...state.claims[0]!.merge_closeout!.snapshot!,
        state: 'OPEN',
        ready_to_merge: true,
        gate_reasons: [],
        updated_at: '2026-03-19T04:31:00.000Z',
        merged_at: null
      },
      shared_root: null,
      linear_transition: null
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:31:00.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:31:00.000Z',
      task_id: 'task-1303-reopened-after-merge-closeout',
      run_id: 'run-reopened-after-merge-closeout',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.claims[0]?.merge_closeout ?? null).toBeNull();
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:31:00.000Z'
    });
    expect(getPersistedState().claims[0]?.merge_closeout ?? null).toBeNull();
  });

  it('reactivates a recovered stale terminal merge-closeout claim when probe closeout is non-merged and the live run has no terminal proof', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-stale-terminal-closeout-no-proof'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-stale-terminal-closeout-no-proof');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-stale-terminal-closeout-no-proof',
        task_id: 'task-1303-stale-terminal-closeout-no-proof',
        status: 'in_progress',
        summary: 'worker still appears live',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-stale-terminal-closeout-no-proof',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:30:40.000Z',
      last_delivery_id: 'delivery-stale-terminal-closeout-no-proof',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-stale-terminal-closeout-no-proof',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'merged',
        reason: 'merged_and_shared_root_reconciled_transition_deferred',
        summary:
          'Attached PR #357 was already merged and the shared root is reconciled; local merge closeout is authoritative while the Linear Done transition is deferred by shared-budget cooldown.',
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
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: '2026-03-19T04:30:30.000Z',
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: {
          status: 'reconciled',
          attempted_at: '2026-03-19T04:30:20.000Z',
          before_status: '## main...origin/main',
          after_status: '## main...origin/main',
          reason: 'shared_root_reconciled'
        },
        linear_transition: {
          status: 'failed',
          attempted_at: '2026-03-19T04:30:25.000Z',
          previous_state: 'Merging',
          target_state: 'Done',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-19T04:30:30.000Z',
          error: 'linear_rate_limited: Linear shared budget cooldown is active.'
        }
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:31:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:31:00.000Z',
      status: 'action_required' as const,
      reason: 'no_attached_pr',
      summary: 'No attached GitHub pull request is visible yet for this Merging issue.',
      attached_pr_urls: [],
      ignored_historical_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
      conflicting_attached_pr_urls: [],
      pr: null,
      snapshot: null,
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:31:00.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:31:00.000Z',
      task_id: 'task-1303-stale-terminal-closeout-no-proof',
      run_id: 'run-stale-terminal-closeout-no-proof',
      run_manifest_path: childPaths.manifestPath
    });
    expect(state.claims[0]?.merge_closeout ?? null).toBeNull();
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:31:00.000Z'
    });
    expect(getPersistedState().claims[0]?.merge_closeout ?? null).toBeNull();
  });

  it('keeps a rehydrated active Merging claim running when probe closeout is non-merged and the live run has no terminal proof', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-active-merge-failure'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-active-merge-failure');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active-merge-failure',
        task_id: 'task-1303-active-merge-failure',
        status: 'in_progress',
        summary: 'worker still appears live',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-active-merge-failure',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-active-merge-failure',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-active-merge-failure',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi
      .fn()
      .mockResolvedValueOnce({
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'transition_failed' as const,
        reason: 'linear_done_transition_failed',
        summary: 'The pull request merged, but the Linear issue could not transition to Done.',
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
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: '2026-03-19T04:30:30.000Z',
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: {
          status: 'reconciled' as const,
          attempted_at: '2026-03-19T04:30:20.000Z',
          before_status: '## main...origin/main',
          after_status: '## main...origin/main',
          reason: 'shared_root_reconciled'
        },
        linear_transition: {
          status: 'failed' as const,
          attempted_at: '2026-03-19T04:30:25.000Z',
          previous_state: 'Merging',
          target_state: 'Done',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-19T04:30:30.000Z',
          error: 'linear_auth_failed: token expired'
        }
      })
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(runMergeCloseout).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueState: 'Merging',
      env: expect.objectContaining({
        [PROVIDER_LINEAR_AUDIT_ENV_VAR]: join(childPaths.runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME)
      }),
      mode: 'probe-merged-recovery',
      repoRoot: root
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z'
    });
    expect(state.claims[0]?.merge_closeout ?? null).toBeNull();
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z'
    });
    expect(getPersistedState().claims[0]?.merge_closeout ?? null).toBeNull();
  });

  it('does not treat a stale successful proof sidecar as terminal for a live Merging run', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-stale-proof-live-merge'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-stale-proof-live-merge');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-stale-proof-live-merge',
        task_id: 'task-1303-stale-proof-live-merge',
        status: 'in_progress',
        summary: 'worker resumed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
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
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-1303-stale-proof-live-merge',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-stale-proof-live-merge',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-stale-proof-live-merge',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:30:30.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      status: 'watching' as const,
      reason: 'probe_pr_not_merged',
      summary: 'Attached PR #357 is not merged yet, so merged recovery cannot retire the rehydrated Merging claim.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/357',
        owner: 'asabeko',
        repo: 'CO',
        number: 357
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
        updated_at: '2026-03-19T04:30:30.000Z',
        merged_at: null,
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    }));
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(runMergeCloseout).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueState: 'Merging',
      env: expect.objectContaining({
        [PROVIDER_LINEAR_AUDIT_ENV_VAR]: join(childPaths.runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME)
      }),
      mode: 'probe-merged-recovery',
      repoRoot: root
    }));
    const expectedClaim = {
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-stale-proof-live-merge',
      run_id: 'run-stale-proof-live-merge',
      run_manifest_path: childPaths.manifestPath
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
  });

  it('does not treat a stale proof without attempt_started_at as terminal for a live Merging run', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-proof-missing-attempt-started-at'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-proof-missing-attempt-started-at');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-proof-missing-attempt-started-at',
        task_id: 'task-1303-proof-missing-attempt-started-at',
        status: 'in_progress',
        started_at: '2026-03-19T04:29:45.000Z',
        summary: 'worker resumed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
        updated_at: '2026-03-19T04:29:50.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
        updated_at: '2026-03-19T04:29:40.000Z'
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-proof-missing-attempt-started-at',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-proof-missing-attempt-started-at',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-proof-missing-attempt-started-at',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:30:30.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      status: 'watching' as const,
      reason: 'probe_pr_not_merged',
      summary: 'Attached PR #357 is not merged yet, so merged recovery cannot retire the rehydrated Merging claim.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/357',
        owner: 'asabeko',
        repo: 'CO',
        number: 357
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
        updated_at: '2026-03-19T04:30:30.000Z',
        merged_at: null,
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    }));
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    expect(runMergeCloseout).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueState: 'Merging',
      env: expect.objectContaining({
        [PROVIDER_LINEAR_AUDIT_ENV_VAR]: join(childPaths.runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME)
      }),
      mode: 'probe-merged-recovery',
      repoRoot: root
    }));
    const expectedClaim = {
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-proof-missing-attempt-started-at',
      run_id: 'run-proof-missing-attempt-started-at',
      run_manifest_path: childPaths.manifestPath
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
  });

  it('routes a recovered Merging run with authoritative terminal proof through deterministic merge closeout via updated_at fallback', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-review-completed'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-review-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-review-completed',
        task_id: 'task-1303-review-completed',
        status: 'in_progress',
        started_at: '2026-03-19T04:29:45.000Z',
        summary: 'worker resumed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:25:00.000Z',
        updated_at: '2026-03-19T04:29:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
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
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'task-1303-review-completed',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-review-completed',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-review-completed',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-03-19T04:30:30.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      status: 'watching' as const,
      reason: 'checks_pending',
      summary: 'Waiting for required checks before merge.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/357',
        owner: 'asabeko',
        repo: 'CO',
        number: 357
      },
      snapshot: {
        state: 'OPEN',
        review_decision: 'APPROVED',
        merge_state_status: 'BLOCKED',
        ready_to_merge: false,
        gate_reasons: ['required_checks_pending=1'],
        action_required_reasons: [],
        unresolved_thread_count: 0,
        checks_pending: 1,
        checks_failed: 0,
        required_checks_pending: 1,
        required_checks_failed: 0,
        updated_at: '2026-03-19T04:30:30.000Z',
        merged_at: null,
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    }));
    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:30.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(runMergeCloseout).toHaveBeenCalledTimes(1);
    const expectedClaim = {
      state: 'completed',
      reason: 'provider_issue_merge_closeout_watching',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      task_id: 'task-1303-review-completed',
      run_id: 'run-review-completed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: null,
      retry_error: null
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'watching',
      reason: 'checks_pending'
    });
    expect(persist).toHaveBeenCalled();
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
    expect(getPersistedState().claims[0]?.merge_closeout).toMatchObject({
      status: 'watching',
      reason: 'checks_pending'
    });
  });

  it('preserves a merge-closeout watching claim during refresh when the poll snapshot is stale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-stale-refresh-watching'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-stale-refresh-watching');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-stale-refresh-watching',
        task_id: 'task-1303-stale-refresh-watching',
        status: 'in_progress',
        summary: 'worker resumed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-stale-refresh-watching',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_merge_closeout_watching',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-stale-refresh-watching',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-stale-refresh-watching',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'watching',
        reason: 'checks_pending',
        summary: 'Waiting for required checks before merge.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/357'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/357',
          owner: 'asabeko',
          repo: 'CO',
          number: 357
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BLOCKED',
          ready_to_merge: false,
          gate_reasons: ['required_checks_pending=1'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 1,
          checks_failed: 0,
          required_checks_pending: 1,
          required_checks_failed: 0,
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: null,
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => {
      throw new Error('runMergeCloseout should not be called for a stale refresh snapshot.');
    });
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:29.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(runMergeCloseout).not.toHaveBeenCalled();
    const expectedClaim = {
      state: 'completed',
      reason: 'provider_issue_merge_closeout_watching',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-stale-refresh-watching',
      run_id: 'run-stale-refresh-watching',
      run_manifest_path: childPaths.manifestPath
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'watching',
      reason: 'checks_pending'
    });
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
    expect(getPersistedState().claims[0]?.merge_closeout).toMatchObject({
      status: 'watching',
      reason: 'checks_pending'
    });
  });

  it('preserves a recovered merged claim during refresh when the poll snapshot is stale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-stale-refresh-merged'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-stale-refresh-merged');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-stale-refresh-merged',
        task_id: 'task-1303-stale-refresh-merged',
        status: 'in_progress',
        summary: 'worker resumed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
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
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-stale-refresh-merged',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      accepted_at: '2026-03-19T04:20:05.000Z',
      updated_at: '2026-03-19T04:20:10.000Z',
      last_delivery_id: 'delivery-stale-refresh-merged',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_050_000,
      run_id: 'run-stale-refresh-merged',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      merge_closeout: {
        recorded_at: '2026-03-19T04:30:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-19T04:30:30.000Z',
        status: 'merged',
        reason: 'merged_and_shared_root_reconciled_transition_deferred',
        summary:
          'Attached PR #357 was already merged and the shared root is reconciled; local merge closeout is authoritative while the Linear Done transition is deferred by shared-budget cooldown.',
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
          updated_at: '2026-03-19T04:30:30.000Z',
          merged_at: '2026-03-19T04:30:30.000Z',
          head_oid: 'abc123'
        },
        merge_attempt: null,
        shared_root: {
          status: 'reconciled',
          attempted_at: '2026-03-19T04:30:20.000Z',
          before_status: '## main...origin/main',
          after_status: '## main...origin/main',
          reason: 'shared_root_reconciled'
        },
        linear_transition: {
          status: 'failed',
          attempted_at: '2026-03-19T04:30:25.000Z',
          previous_state: 'Merging',
          target_state: 'Done',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-19T04:30:30.000Z',
          error: 'linear_rate_limited: Linear shared budget cooldown is active.'
        }
      }
    });

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runMergeCloseout = vi.fn(async () => {
      throw new Error('runMergeCloseout should not be called for a stale refresh snapshot.');
    });
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runMergeCloseout,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          state: 'Merging',
          state_type: 'started',
          updated_at: '2026-03-19T04:30:29.000Z',
          assignee_id: null,
          assignee_name: null
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(runMergeCloseout).not.toHaveBeenCalled();
    const expectedClaim = {
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:30.000Z',
      issue_assignee_id: null,
      issue_assignee_name: null,
      task_id: 'task-1303-stale-refresh-merged',
      run_id: 'run-stale-refresh-merged',
      run_manifest_path: childPaths.manifestPath
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(state.claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_shared_root_reconciled_transition_deferred'
    });
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
    expect(getPersistedState().claims[0]?.merge_closeout).toMatchObject({
      status: 'merged',
      reason: 'merged_and_shared_root_reconciled_transition_deferred'
    });
  });

  it('does not leak a stale failed proof summary onto a manifest-backed failed run', async () => {
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
        updated_at: '2026-03-19T04:31:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: 'codex_exit_1',
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
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
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

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:25:00.000Z'
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    const expectedClaim = {
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      task_id: 'task-1303-failed',
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:10.000Z',
      retry_error: null
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(persist).toHaveBeenCalled();
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
  });

  it('does not let a newer successful proof sidecar rewrite a manifest-backed failed run', async () => {
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
        summary: 'manifest_exit_1',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:20:00.000Z',
        updated_at: '2026-03-19T04:29:00.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify({
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
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
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
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

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:25:00.000Z'
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    const expectedClaim = {
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      task_id: 'task-1303-failed',
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:10.000Z',
      retry_error: 'manifest_exit_1'
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(persist).toHaveBeenCalled();
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
  });

  it('ignores malformed provider worker proof sidecars and still rehydrates from manifest evidence', async () => {
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
    await writeFile(join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), '{not-json', 'utf8');

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      issue_title: 'Autonomous intake handoff',
      issue_state: 'Ready',
      issue_state_type: 'unstarted',
      issue_updated_at: '2026-03-19T04:10:00.000Z',
      task_id: 'task-1303-failed',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
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

    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
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
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-19T04:25:00.000Z'
        })
      })
    });

    await service.refresh();
    await waitForMockCalls(setTimeoutSpy);

    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
    const expectedClaim = {
      state: 'resumable',
      reason: 'provider_issue_rehydrated_resumable_run',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:25:00.000Z',
      task_id: 'task-1303-failed',
      run_id: 'run-failed',
      run_manifest_path: childPaths.manifestPath,
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-19T04:30:10.000Z'
    };
    expect(state.claims[0]).toMatchObject(expectedClaim);
    expect(persist).toHaveBeenCalled();
    expect(getPersistedState().claims[0]).toMatchObject(expectedClaim);
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

  it('defers direct-webhook review-handoff promotion while run discovery is still pending', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_title: 'Review handoff promotion',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:00:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_start_launched',
      accepted_at: '2026-04-09T03:00:05.000Z',
      updated_at: '2026-04-09T03:00:10.000Z',
      last_delivery_id: 'delivery-running',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_168_000_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token-running'
    });
    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runReviewHandoffPromotion = vi.fn(async () => ({
      recorded_at: '2026-04-09T03:05:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:05:00.000Z',
      status: 'promoted' as const,
      reason: 'promoted_to_merging',
      summary: 'Promoted attached PR #416 from review handoff into Merging.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
      ignored_historical_pr_urls: [],
      conflicting_attached_pr_urls: [],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/416',
        owner: 'asabeko',
        repo: 'CO',
        number: 416
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
        updated_at: '2026-04-09T03:04:30.000Z',
        merged_at: null,
        head_oid: 'abc123'
      },
      linear_transition: {
        status: 'transitioned',
        attempted_at: '2026-04-09T03:05:00.000Z',
        previous_state: 'In Review',
        target_state: 'Merging',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-09T03:05:00.000Z',
        error: null
      }
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runReviewHandoffPromotion,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        identifier: 'CO-116',
        title: 'Review handoff promotion',
        state: 'In Review',
        state_type: 'started',
        updated_at: '2026-04-09T03:04:00.000Z'
      }),
      deliveryId: 'delivery-review-promotion-success',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_744_168_300_000
    });

    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_handoff_owned',
      claim: {
        state: 'running',
        reason: 'provider_issue_handoff_owned',
        review_promotion: null
      }
    });
    expect(runReviewHandoffPromotion).not.toHaveBeenCalled();
    expect(getPersistedState().claims[0]?.review_promotion).toBeNull();
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('records a successful review-handoff promotion during direct webhook ownership retention after terminal run discovery', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'review-promotion-completed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'review-promotion-completed',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_updated_at: '2026-04-09T03:04:00.000Z',
        updated_at: '2026-04-09T03:05:00.000Z'
      }),
      'utf8'
    );
    const expectedAuditPath = join(
      dirname(childPaths.manifestPath),
      PROVIDER_LINEAR_WORKER_AUDIT_FILENAME
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_title: 'Review handoff promotion',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:00:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-04-09T03:00:05.000Z',
      updated_at: '2026-04-09T03:00:10.000Z',
      last_delivery_id: 'delivery-running',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_168_000_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null
    });
    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runReviewHandoffPromotion = vi.fn(async () => ({
      recorded_at: '2026-04-09T03:05:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:05:00.000Z',
      status: 'promoted' as const,
      reason: 'promoted_to_merging',
      summary: 'Promoted attached PR #416 from review handoff into Merging.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
      ignored_historical_pr_urls: [],
      conflicting_attached_pr_urls: [],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/416',
        owner: 'asabeko',
        repo: 'CO',
        number: 416
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
        updated_at: '2026-04-09T03:04:30.000Z',
        merged_at: null,
        head_oid: 'abc123'
      },
      linear_transition: {
        status: 'transitioned',
        attempted_at: '2026-04-09T03:05:00.000Z',
        previous_state: 'In Review',
        target_state: 'Merging',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-09T03:05:00.000Z',
        error: null
      }
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runReviewHandoffPromotion,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        identifier: 'CO-116',
        title: 'Review handoff promotion',
        state: 'In Review',
        state_type: 'started',
        updated_at: '2026-04-09T03:04:00.000Z'
      }),
      deliveryId: 'delivery-review-promotion-success',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_744_168_300_000
    });

    expect(runReviewHandoffPromotion).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-116',
      issueState: 'In Review',
      repoRoot: paths.repoRoot,
      sourceSetup: null,
      env: expect.objectContaining({
        [PROVIDER_LINEAR_AUDIT_ENV_VAR]: expectedAuditPath
      })
    }));
    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_review_promotion_promoted',
      claim: {
        state: 'completed',
        reason: 'provider_issue_review_promotion_promoted',
        issue_state: 'Merging',
        review_promotion: {
          status: 'promoted',
          reason: 'promoted_to_merging'
        },
        merge_closeout: null
      }
    });
    expect(getPersistedState().claims[0]?.review_promotion).toMatchObject({
      status: 'promoted',
      reason: 'promoted_to_merging'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('redirects a stale direct-webhook review handoff into merge closeout when live state already reached Merging', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'review-promotion-live-merging');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'review-promotion-live-merging',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_updated_at: '2026-04-09T03:04:00.000Z',
        updated_at: '2026-04-09T03:05:00.000Z'
      }),
      'utf8'
    );
    const expectedAuditPath = join(
      dirname(childPaths.manifestPath),
      PROVIDER_LINEAR_WORKER_AUDIT_FILENAME
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_title: 'Review handoff promotion',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:00:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-04-09T03:00:05.000Z',
      updated_at: '2026-04-09T03:00:10.000Z',
      last_delivery_id: 'delivery-review-promotion-live-merging',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_168_300_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null
    });
    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runReviewHandoffPromotion = vi.fn(async () => ({
      recorded_at: '2026-04-09T03:05:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:05:00.000Z',
      status: 'action_required' as const,
      reason: 'issue_no_longer_review_handoff',
      summary: 'Live Linear issue state is Merging, so review-handoff promotion is not armed.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
      ignored_historical_pr_urls: [],
      conflicting_attached_pr_urls: [],
      pr: null,
      snapshot: null,
      linear_transition: null
    }));
    const runMergeCloseout = vi.fn(async () => ({
      recorded_at: '2026-04-09T03:05:15.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:05:00.000Z',
      status: 'watching' as const,
      reason: 'required_checks_pending',
      summary: 'Waiting for required checks before merge.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
      ignored_historical_pr_urls: [],
      conflicting_attached_pr_urls: [],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/416',
        owner: 'asabeko',
        repo: 'CO',
        number: 416
      },
      snapshot: {
        state: 'OPEN',
        review_decision: 'APPROVED',
        merge_state_status: 'BLOCKED',
        ready_to_merge: false,
        gate_reasons: ['required_checks_pending'],
        action_required_reasons: [],
        unresolved_thread_count: 0,
        checks_pending: 1,
        checks_failed: 0,
        required_checks_pending: 1,
        required_checks_failed: 0,
        updated_at: '2026-04-09T03:05:15.000Z',
        merged_at: null,
        head_oid: 'abc123'
      },
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runReviewHandoffPromotion,
      runMergeCloseout,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        identifier: 'CO-116',
        title: 'Review handoff promotion',
        state: 'In Review',
        state_type: 'started',
        updated_at: '2026-04-09T03:04:00.000Z'
      }),
      deliveryId: 'delivery-review-promotion-live-merging',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_744_168_300_000
    });

    expect(runReviewHandoffPromotion).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-116',
      issueState: 'In Review',
      repoRoot: paths.repoRoot,
      env: expect.objectContaining({
        [PROVIDER_LINEAR_AUDIT_ENV_VAR]: expectedAuditPath
      })
    }));
    expect(runMergeCloseout).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-116',
      issueState: 'Merging',
      repoRoot: paths.repoRoot,
      env: expect.objectContaining({
        [PROVIDER_LINEAR_AUDIT_ENV_VAR]: expectedAuditPath
      })
    }));
    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_merge_closeout_watching',
      claim: {
        state: 'completed',
        reason: 'provider_issue_merge_closeout_watching',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-09T03:05:00.000Z',
        review_promotion: null,
        merge_closeout: {
          status: 'watching',
          reason: 'required_checks_pending'
        }
      }
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'completed',
      reason: 'provider_issue_merge_closeout_watching',
      issue_state: 'Merging',
      review_promotion: null
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('recomputes a stale direct-webhook review handoff into refresh-pending accepted state when live state moved back to active work', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-09T03:05:00.000Z'));
    vi.stubEnv('CO_LINEAR_API_TOKEN', 'linear-token-1');

    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'review-promotion-live-active');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'review-promotion-live-active',
        task_id: taskId,
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_updated_at: '2026-04-09T03:04:00.000Z',
        updated_at: '2026-04-09T03:05:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_title: 'Review handoff promotion',
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:04:00.000Z',
      issue_viewer_id: 'viewer-1',
      issue_viewer_auth_fingerprint: createLinearTokenFingerprint('linear-token-1'),
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: taskId,
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_review_promotion_action_required',
      accepted_at: '2026-04-09T03:00:05.000Z',
      updated_at: '2026-04-09T03:00:10.000Z',
      last_delivery_id: 'delivery-review-promotion-live-active',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_168_300_000,
      run_id: 'review-promotion-live-active',
      run_manifest_path: childPaths.manifestPath,
      launch_source: null,
      launch_token: null,
      review_promotion: {
        recorded_at: '2026-04-09T03:04:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_state: 'In Review',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-09T03:04:30.000Z',
        status: 'action_required',
        reason: 'review=REVIEW_REQUIRED',
        summary: 'Review-handoff promotion is blocked by: review=REVIEW_REQUIRED.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
        ignored_historical_pr_urls: [],
        conflicting_attached_pr_urls: [],
        pr: null,
        snapshot: null,
        linear_transition: null
      },
      merge_closeout: {
        recorded_at: '2026-04-09T03:04:45.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_state: 'In Review',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-09T03:04:45.000Z',
        status: 'watching',
        reason: 'required_checks_pending',
        summary: 'Waiting for required checks before merge.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
        ignored_historical_pr_urls: [],
        conflicting_attached_pr_urls: [],
        pr: null,
        snapshot: null,
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    });
    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runReviewHandoffPromotion = vi.fn(async () => ({
      recorded_at: '2026-04-09T03:05:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:05:00.000Z',
      status: 'action_required' as const,
      reason: 'issue_no_longer_review_handoff',
      summary: 'Live Linear issue state is In Progress, so review-handoff promotion is not armed.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
      ignored_historical_pr_urls: [],
      conflicting_attached_pr_urls: [],
      pr: null,
      snapshot: null,
      linear_transition: null
    }));
    const runMergeCloseout = vi.fn(async () => {
      throw new Error('runMergeCloseout should not be called when live state is no longer Merging.');
    });

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runReviewHandoffPromotion,
      runMergeCloseout,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        identifier: 'CO-116',
        title: 'Review handoff promotion',
        state: 'In Review',
        state_type: 'started',
        updated_at: '2026-04-09T03:05:00.000Z'
      }),
      deliveryId: 'delivery-review-promotion-live-active',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_744_168_300_000
    });

    expect(runReviewHandoffPromotion).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-116',
      issueState: 'In Review',
      repoRoot: paths.repoRoot
    }));
    expect(runMergeCloseout).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_rehydration_pending_revalidation',
      claim: {
        state: 'accepted',
        reason: 'provider_issue_rehydration_pending_revalidation',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-09T03:05:00.000Z',
        review_promotion: null,
        merge_closeout: null,
        retry_queued: null,
        retry_attempt: null
      }
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'accepted',
      reason: 'provider_issue_rehydration_pending_revalidation',
      issue_state: 'In Progress',
      review_promotion: null,
      merge_closeout: null
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('rehydrates direct-webhook review handoff ownership onto an active run without overwriting newer run-bound metadata', async () => {
    const { root, paths } = await createHostPaths();
    const taskId = 'linear-lin-issue-1';
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId
    };
    const childPaths = resolveRunPaths(childEnv, 'review-promotion-active-run');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'review-promotion-active-run',
        task_id: taskId,
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_updated_at: '2026-04-09T03:05:00.000Z',
        updated_at: '2026-04-09T03:05:00.000Z'
      }),
      'utf8'
    );

    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_title: 'Review handoff promotion',
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:04:00.000Z',
      issue_viewer_id: 'viewer-1',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'stale-task-id',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_review_promotion_promoted',
      accepted_at: '2026-04-09T03:00:05.000Z',
      updated_at: '2026-04-09T03:00:10.000Z',
      last_delivery_id: 'delivery-review-promotion-active-run-old',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_168_200_000,
      run_id: 'stale-run-id',
      run_manifest_path: '/tmp/provider-run/stale-manifest.json',
      launch_source: null,
      launch_token: null,
      review_promotion: {
        recorded_at: '2026-04-09T03:04:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-116',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-09T03:04:30.000Z',
        status: 'promoted',
        reason: 'promoted_to_merging',
        summary: 'Promoted attached PR #416 from review handoff into Merging.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
        ignored_historical_pr_urls: [],
        conflicting_attached_pr_urls: [],
        pr: null,
        snapshot: null,
        linear_transition: null
      }
    });
    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runReviewHandoffPromotion = vi.fn(async () => {
      throw new Error('runReviewHandoffPromotion should not be called while an active run is still present.');
    });

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runReviewHandoffPromotion,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue({
        identifier: 'CO-116',
        title: 'Review handoff promotion',
        state: 'In Review',
        state_type: 'started',
        updated_at: '2026-04-09T03:05:00.000Z'
      }),
      deliveryId: 'delivery-review-promotion-active-run',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_744_168_300_000
    });

    expect(runReviewHandoffPromotion).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      kind: 'ignored',
      reason: 'provider_issue_rehydrated_active_run',
      claim: {
        state: 'running',
        reason: 'provider_issue_rehydrated_active_run',
        task_id: taskId,
        run_id: 'review-promotion-active-run',
        run_manifest_path: childPaths.manifestPath,
        issue_updated_at: '2026-04-09T03:05:00.000Z',
        review_promotion: null
      }
    });
    expect(getPersistedState().claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      task_id: taskId,
      run_id: 'review-promotion-active-run',
      run_manifest_path: childPaths.manifestPath,
      issue_updated_at: '2026-04-09T03:05:00.000Z',
      last_delivery_id: 'delivery-review-promotion-active-run',
      review_promotion: null,
      merge_closeout: null
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('records review-handoff promotion blocker truth on refresh for owned review issues', async () => {
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_title: 'Review handoff promotion',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:10:00.000Z',
      issue_assignee_id: 'viewer-1',
      issue_assignee_name: 'Codex',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'completed',
      reason: 'provider_issue_rehydrated_completed_run',
      accepted_at: '2026-04-09T03:10:05.000Z',
      updated_at: '2026-04-09T03:10:10.000Z',
      last_delivery_id: 'delivery-review-refresh',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_744_168_600_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: null,
      launch_token: null
    });
    const { persist, getPersistedState } = createPersistSnapshotSpy(state);
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };
    const runReviewHandoffPromotion = vi.fn(async () => ({
      recorded_at: '2026-04-09T03:15:00.000Z',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-116',
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-09T03:15:00.000Z',
      status: 'action_required' as const,
      reason: 'review=REVIEW_REQUIRED',
      summary: 'Review-handoff promotion is blocked by: review=REVIEW_REQUIRED.',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
      ignored_historical_pr_urls: [],
      conflicting_attached_pr_urls: [],
      pr: {
        url: 'https://github.com/asabeko/CO/pull/416',
        owner: 'asabeko',
        repo: 'CO',
        number: 416
      },
      snapshot: {
        state: 'OPEN',
        review_decision: 'REVIEW_REQUIRED',
        merge_state_status: 'CLEAN',
        ready_to_merge: false,
        gate_reasons: ['review=REVIEW_REQUIRED'],
        action_required_reasons: ['review=REVIEW_REQUIRED'],
        unresolved_thread_count: 0,
        checks_pending: 0,
        checks_failed: 0,
        required_checks_pending: 0,
        required_checks_failed: 0,
        updated_at: '2026-04-09T03:14:30.000Z',
        merged_at: null,
        head_oid: 'def456'
      },
      linear_transition: null
    }));

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      runReviewHandoffPromotion,
      resolveTrackedIssue: async () => ({
        kind: 'ready',
        trackedIssue: createTrackedIssue({
          identifier: 'CO-116',
          title: 'Review handoff promotion',
          state: 'In Review',
          state_type: 'started',
          updated_at: '2026-04-09T03:15:00.000Z'
        })
      })
    });

    await service.refresh();

    expect(runReviewHandoffPromotion).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      issueState: 'In Review',
      repoRoot: paths.repoRoot
    }));
    expect(state.claims[0]).toMatchObject({
      state: 'handoff_failed',
      reason: 'provider_issue_review_promotion_action_required',
      issue_state: 'In Review',
      review_promotion: {
        status: 'action_required',
        reason: 'review=REVIEW_REQUIRED'
      },
      merge_closeout: null
    });
    expect(getPersistedState().claims[0]?.review_promotion).toMatchObject({
      status: 'action_required',
      reason: 'review=REVIEW_REQUIRED'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).not.toHaveBeenCalled();
  });
});
