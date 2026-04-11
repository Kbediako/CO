import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

const { readdirSpy } = vi.hoisted(() => ({
  readdirSpy: vi.fn<typeof import('node:fs/promises').readdir>()
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  readdirSpy.mockImplementation(actual.readdir);
  return {
    ...actual,
    readdir: readdirSpy
  };
});

const cleanupRoots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  const actualFs = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  readdirSpy.mockImplementation(actualFs.readdir);
  readdirSpy.mockClear();
  const { rm } = await import('node:fs/promises');
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function flushAsyncWork(turns = 8): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
  }
}

async function waitForCondition(
  predicate: () => boolean,
  turns = 256,
  stepMs = 0
): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    if (predicate()) {
      return;
    }
    await vi.advanceTimersByTimeAsync(stepMs);
    await flushAsyncWork();
  }
  throw new Error(`Condition not met after ${turns} timer turns.`);
}

function getLatestScheduledTimeoutCallback(
  setTimeoutSpy: { mock: { calls: unknown[][] } }
): () => void | Promise<void> {
  for (let index = setTimeoutSpy.mock.calls.length - 1; index >= 0; index -= 1) {
    const [callback] = setTimeoutSpy.mock.calls[index] ?? [];
    if (typeof callback !== 'function') {
      continue;
    }
    return callback as () => void | Promise<void>;
  }
  throw new Error('No scheduled timeout callback found.');
}

async function createHostPaths() {
  const { mkdtemp, mkdir } = await import('node:fs/promises');
  const { resolveRunPaths } = await import('../src/cli/run/runPaths.js');

  const root = await mkdtemp(join(tmpdir(), 'provider-issue-handoff-cache-'));
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

function createProviderIntakeState() {
  return {
    schema_version: 1,
    updated_at: new Date(0).toISOString(),
    rehydrated_at: null,
    latest_provider_key: null,
    latest_reason: null,
    claims: []
  };
}

function createTrackedIssue() {
  return {
    provider: 'linear' as const,
    id: 'lin-issue-1',
    identifier: 'CO-125',
    title: 'Enforce provider max concurrency',
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
    updated_at: '2026-03-19T04:30:00.000Z',
    blocked_by: [],
    recent_activity: []
  };
}

describe('createProviderIssueHandoffService admission cache', () => {
  it('reuses one run-tree discovery snapshot per direct webhook admission phase', async () => {
    const { createProviderIssueHandoffService } = await import(
      '../src/cli/control/providerIssueHandoff.js'
    );
    const { root, paths } = await createHostPaths();
    const runsRoot = join(root, '.runs');
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state: createProviderIntakeState(),
      persist: vi.fn(async () => undefined),
      launcher
    });

    await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue(),
      deliveryId: 'delivery-cache-check',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_200_000
    });

    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(
      readdirSpy.mock.calls.filter(([path]) => path === runsRoot).length
    ).toBe(2);
  });

  it('refreshes direct webhook admission discovery after waiting for the refresh lifecycle lock', async () => {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { createProviderIssueHandoffService } = await import(
      '../src/cli/control/providerIssueHandoff.js'
    );
    const { resolveRunPaths } = await import('../src/cli/run/runPaths.js');
    const { root, paths } = await createHostPaths();
    const runsRoot = join(root, '.runs');
    const state = createProviderIntakeState();

    let persistCallCount = 0;
    let releaseBlockedPersist: (() => void) | null = null;
    const persist = vi.fn(async () => {
      persistCallCount += 1;
      if (persistCallCount !== 1) {
        return;
      }
      await new Promise<void>((resolve) => {
        releaseBlockedPersist = resolve;
      });
    });

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
      persist,
      launcher,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 2
        }
      })
    });

    const firstPromise = service.handleAcceptedTrackedIssue({
      trackedIssue: {
        ...createTrackedIssue(),
        id: 'lin-issue-first',
        identifier: 'CO-1',
        updated_at: '2026-03-19T04:32:00.000Z'
      },
      deliveryId: 'delivery-first',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_320_000
    });

    await vi.waitFor(() => {
      expect(persist).toHaveBeenCalledTimes(1);
      expect(
        state.claims.some(
          (claim) =>
            claim.provider_key === 'linear:lin-issue-first' && claim.state === 'starting'
        )
      ).toBe(true);
    });

    const baselineRunDiscoveryCalls = readdirSpy.mock.calls.filter(
      ([path]) => path === runsRoot
    ).length;

    const secondPromise = service.handleAcceptedTrackedIssue({
      trackedIssue: {
        ...createTrackedIssue(),
        id: 'lin-issue-second',
        identifier: 'CO-2',
        updated_at: '2026-03-19T04:32:01.000Z'
      },
      deliveryId: 'delivery-second',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_321_000
    });

    await vi.waitFor(() => {
      expect(
        readdirSpy.mock.calls.filter(([path]) => path === runsRoot).length
      ).toBeGreaterThanOrEqual(baselineRunDiscoveryCalls + 1);
    });

    const foreignEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-foreign-active'
    };
    const foreignPaths = resolveRunPaths(foreignEnv, 'run-foreign-active');
    await mkdir(foreignPaths.runDir, { recursive: true });
    await writeFile(
      foreignPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-foreign-active',
        task_id: 'task-foreign-active',
        pipeline_id: 'provider-linear-worker',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-foreign',
        issue_identifier: 'CO-9',
        updated_at: '2026-03-19T04:32:02.000Z'
      }),
      'utf8'
    );

    if (!releaseBlockedPersist) {
      throw new Error('Expected the first persist to be blocked.');
    }
    releaseBlockedPersist();

    const secondResult = await secondPromise;
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
    expect(
      readdirSpy.mock.calls.filter(([path]) => path === runsRoot).length
    ).toBeGreaterThanOrEqual(baselineRunDiscoveryCalls + 2);

    if (!resolveFirstStart) {
      throw new Error('Expected the first launch to be pending.');
    }
    resolveFirstStart({
      runId: 'run-first',
      manifestPath: '/tmp/provider-run/first.json'
    });

    await expect(firstPromise).resolves.toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched',
      claim: {
        provider_key: 'linear:lin-issue-first',
        state: 'starting',
        run_id: 'run-first',
        run_manifest_path: '/tmp/provider-run/first.json'
      }
    });
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('uses the lock-time failed-relaunch seed when direct webhook admission waits on the refresh lifecycle lock', async () => {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { createProviderIssueHandoffService } = await import(
      '../src/cli/control/providerIssueHandoff.js'
    );
    const { resolveRunPaths } = await import('../src/cli/run/runPaths.js');
    const { root, paths } = await createHostPaths();
    const runsRoot = join(root, '.runs');
    const state = createProviderIntakeState();

    let persistCallCount = 0;
    let releaseBlockedPersist: (() => void) | null = null;
    const persist = vi.fn(async () => {
      persistCallCount += 1;
      if (persistCallCount !== 1) {
        return;
      }
      await new Promise<void>((resolve) => {
        releaseBlockedPersist = resolve;
      });
    });

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
      persist,
      launcher,
      readFeatureToggles: () => ({
        agent: {
          max_concurrent_agents: 2
        }
      })
    });

    const firstPromise = service.handleAcceptedTrackedIssue({
      trackedIssue: {
        ...createTrackedIssue(),
        id: 'lin-issue-first',
        identifier: 'CO-1',
        updated_at: '2026-03-19T04:32:00.000Z'
      },
      deliveryId: 'delivery-first',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_320_000
    });

    await vi.waitFor(() => {
      expect(persist).toHaveBeenCalledTimes(1);
      expect(
        state.claims.some(
          (claim) =>
            claim.provider_key === 'linear:lin-issue-first' && claim.state === 'starting'
        )
      ).toBe(true);
    });

    const baselineRunDiscoveryCalls = readdirSpy.mock.calls.filter(
      ([path]) => path === runsRoot
    ).length;

    const secondPromise = service.handleAcceptedTrackedIssue({
      trackedIssue: {
        ...createTrackedIssue(),
        id: 'lin-issue-second',
        identifier: 'CO-2',
        updated_at: '2026-03-19T04:32:01.000Z'
      },
      deliveryId: 'delivery-second',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_321_000
    });

    await vi.waitFor(() => {
      expect(
        readdirSpy.mock.calls.filter(([path]) => path === runsRoot).length
      ).toBeGreaterThanOrEqual(baselineRunDiscoveryCalls + 1);
    });

    const previousRunEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-second-previous'
    };
    const previousRunPaths = resolveRunPaths(previousRunEnv, 'run-second-previous');
    await mkdir(previousRunPaths.runDir, { recursive: true });
    await writeFile(
      previousRunPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-second-previous',
        task_id: 'task-second-previous',
        pipeline_id: 'diagnostics',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-second',
        issue_identifier: 'CO-2',
        issue_updated_at: '2026-03-19T04:32:01.000Z',
        updated_at: '2026-03-19T04:32:01.000Z'
      }),
      'utf8'
    );
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-second',
      issue_id: 'lin-issue-second',
      issue_identifier: 'CO-2',
      issue_title: 'Enforce provider max concurrency',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:32:01.000Z',
      task_id: 'task-second-previous',
      mapping_source: 'provider_id_fallback',
      state: 'handoff_failed',
      reason: 'provider_issue_start_failed:transient launch failure',
      accepted_at: '2026-03-19T04:32:01.000Z',
      updated_at: '2026-03-19T04:32:01.000Z',
      last_delivery_id: 'delivery-second-previous',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_321_000,
      run_id: 'run-second-previous',
      run_manifest_path: previousRunPaths.manifestPath,
      launch_source: 'control-host',
      launch_token: 'launch-token-second-previous',
      retry_queued: null,
      retry_attempt: null,
      retry_due_at: null,
      retry_error: null
    });

    if (!releaseBlockedPersist) {
      throw new Error('Expected the first persist to be blocked.');
    }
    releaseBlockedPersist();

    await expect(secondPromise).resolves.toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched',
      claim: {
        provider_key: 'linear:lin-issue-second',
        state: 'starting',
        run_id: 'run-second',
        run_manifest_path: '/tmp/provider-run/second.json',
        retry_queued: false,
        retry_attempt: 1,
        retry_due_at: null,
        retry_error: null
      }
    });

    if (!resolveFirstStart) {
      throw new Error('Expected the first launch to be pending.');
    }
    resolveFirstStart({
      runId: 'run-first',
      manifestPath: '/tmp/provider-run/first.json'
    });

    await expect(firstPromise).resolves.toMatchObject({
      kind: 'start',
      reason: 'provider_issue_start_launched',
      claim: {
        provider_key: 'linear:lin-issue-first',
        state: 'starting',
        run_id: 'run-first',
        run_manifest_path: '/tmp/provider-run/first.json'
      }
    });
    expect(launcher.resume).not.toHaveBeenCalled();
  });

  it('starts deferred best-effort rehydrate retries with a fresh run-tree discovery snapshot', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { mkdir, writeFile } = await import('node:fs/promises');
    const { createProviderIssueHandoffService } = await import(
      '../src/cli/control/providerIssueHandoff.js'
    );
    const { resolveRunPaths } = await import('../src/cli/run/runPaths.js');
    const { root, paths } = await createHostPaths();
    const runsRoot = join(root, '.runs');
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-125',
      issue_title: 'Enforce provider max concurrency',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: '2026-03-19T04:30:00.000Z',
      updated_at: '2026-03-19T04:30:00.000Z',
      last_delivery_id: 'delivery-cache-refresh',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_200_000,
      run_id: null,
      run_manifest_path: null
    });

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'diagnostics'
    });

    await service.refresh();
    expect(
      readdirSpy.mock.calls.filter(([path]) => path === runsRoot).length
    ).toBe(1);
    await waitForCondition(() => setTimeoutSpy.mock.calls.length >= 1);
    const queuedRehydrateCallback = getLatestScheduledTimeoutCallback(setTimeoutSpy);

    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-active');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'linear-lin-issue-1',
        pipeline_id: 'diagnostics',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-125',
        updated_at: '2026-03-19T04:30:30.000Z'
      }),
      'utf8'
    );

    await Promise.resolve(queuedRehydrateCallback());
    await flushAsyncWork();
    await waitForCondition(
      () => state.claims[0]?.reason === 'provider_issue_rehydrated_active_run'
    );

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
    expect(
      readdirSpy.mock.calls.filter(([path]) => path === runsRoot).length
    ).toBeGreaterThanOrEqual(2);
  });

  it('waits for the active refresh lifecycle lock before running deferred best-effort rehydrate retries', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { createProviderIssueHandoffService } = await import(
      '../src/cli/control/providerIssueHandoff.js'
    );
    const { paths } = await createHostPaths();
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-125',
      issue_title: 'Enforce provider max concurrency',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: '2026-03-19T04:30:00.000Z',
      updated_at: '2026-03-19T04:30:00.000Z',
      last_delivery_id: 'delivery-lock-check',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_200_000,
      run_id: null,
      run_manifest_path: null,
      launch_source: 'control-host',
      launch_token: 'launch-token-lock-check'
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
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

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
    await waitForCondition(() => setTimeoutSpy.mock.calls.length >= 1);
    const queuedRetryCallback = getLatestScheduledTimeoutCallback(setTimeoutSpy);

    const refreshPromise = service.refresh();
    await waitForCondition(() => persist.mock.calls.length >= 2 && activePersistCalls === 1);

    const blockedPersistCalls = persist.mock.calls.length;
    await Promise.resolve(queuedRetryCallback());
    await flushAsyncWork();

    expect(persist).toHaveBeenCalledTimes(blockedPersistCalls);
    expect(maxActivePersistCalls).toBe(1);

    if (!releaseBlockedPersist) {
      throw new Error('Expected refresh persist to be blocked.');
    }
    releaseBlockedPersist();
    await refreshPromise;
    await waitForCondition(() => persist.mock.calls.length >= blockedPersistCalls + 1);

    expect(maxActivePersistCalls).toBe(1);
  });
});
