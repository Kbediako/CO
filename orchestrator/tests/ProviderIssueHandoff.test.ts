import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createProviderIssueHandoffService
} from '../src/cli/control/providerIssueHandoff.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';
import type { ProviderIntakeState } from '../src/cli/control/providerIntakeState.js';

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
  const paths = resolveRunPaths(env, 'control-host');
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
    updated_at: '2026-03-19T04:00:00.000Z',
    recent_activity: [],
    ...overrides
  };
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
    expect(launcher.start).toHaveBeenCalledWith({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:00:00.000Z',
      launchToken: expect.any(String)
    });
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
          state: 'resuming',
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

    expect(result.kind).toBe('resume');
    expect(launcher.resume).toHaveBeenCalledWith({
      runId: 'run-child',
      actor: 'control-host',
      reason: 'provider-accepted-issue',
      launchToken: expect.any(String)
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'resuming',
      run_id: 'run-child',
      run_manifest_path: childPaths.manifestPath,
      task_id: 'task-1303-child',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
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
      kind: 'resume',
      reason: 'provider_issue_resume_launched'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(launcher.resume).toHaveBeenCalledWith({
      runId: 'run-failed',
      actor: 'control-host',
      reason: 'provider-accepted-issue',
      launchToken: expect.any(String)
    });
    expect(state.claims[0]).toMatchObject({
      state: 'resuming',
      reason: 'provider_issue_resume_launched',
      run_id: 'run-failed',
      run_manifest_path: failedPaths.manifestPath,
      task_id: 'task-1303-failed',
      launch_source: 'control-host',
      launch_token: expect.any(String)
    });
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
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-active',
      run_manifest_path: activePaths.manifestPath,
      task_id: 'task-1303-active'
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
});
