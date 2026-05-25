import http from 'node:http';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EffectiveDelegationConfig } from '../src/config/delegationConfig.js';
import type { RunPaths } from '../src/run/runPaths.js';
import type { ControlRequestSharedContext } from '../src/cli/control/controlRequestContext.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import type { ProviderIssueHandoffPollInput } from '../src/cli/control/providerIssueHandoff.js';
import {
  beginClosingControlServerHttpServer,
  closeControlServerOwnedRuntime,
  startControlServerReadyInstanceLifecycle,
  type ControlServerOwnedLifecycleState
} from '../src/cli/control/controlServerReadyInstanceLifecycle.js';
import {
  closeControlServerPublicLifecycle,
  runProviderIssueHandoffPoll,
  runProviderIssueHandoffRefresh,
  runProviderIssueHandoffRecover,
  runProviderIssueHandoffRehydrate,
  startControlServerPublicLifecycle,
  type ControlServerPublicLifecycleState,
  type ProviderIssueHandoffRefreshRequestOutcome
} from '../src/cli/control/controlServerPublicLifecycle.js';
import {
  readSharedLinearBudgetStatus,
  resolveLinearPollingInterval
} from '../src/cli/control/linearBudgetState.js';
import { resolveLiveLinearTrackedIssues } from '../src/cli/control/linearDispatchSource.js';
import { resolveLinearWebhookSourceSetup } from '../src/cli/control/linearWebhookController.js';
import {
  initializeProviderPollingHealth,
  markProviderPollingCompleted,
  markProviderPollingStarted,
  markProviderPollingStuck,
  readProviderPollingHealth,
  recordProviderPollingProgress,
  scheduleProviderPolling
} from '../src/cli/control/providerPollingHealth.js';
import {
  prepareControlServerStartupInputs,
  type PreparedControlServerStartupInputs
} from '../src/cli/control/controlServerStartupInputPreparation.js';
import {
  acquireControlHostOwnership,
  refreshControlHostOwnershipPollingPayloadInChild,
  type ControlHostOwnershipHandle,
  type ControlHostOwnershipPollingPayload
} from '../src/cli/control/controlHostOwnership.js';

vi.mock('../src/cli/control/controlServerStartupInputPreparation.js', () => ({
  prepareControlServerStartupInputs: vi.fn()
}));

vi.mock('../src/cli/control/controlHostOwnership.js', () => ({
  acquireControlHostOwnership: vi.fn(),
  refreshControlHostOwnershipPollingPayloadInChild: vi.fn(async (payload) => payload)
}));

vi.mock('../src/cli/control/controlServerReadyInstanceLifecycle.js', () => ({
  startControlServerReadyInstanceLifecycle: vi.fn(),
  closeControlServerOwnedRuntime: vi.fn(),
  beginClosingControlServerHttpServer: vi.fn(() => Promise.resolve())
}));

vi.mock('../src/cli/control/linearDispatchSource.js', () => ({
  resolveLiveLinearTrackedIssues: vi.fn()
}));

vi.mock('../src/cli/control/linearBudgetState.js', () => ({
  readSharedLinearBudgetStatus: vi.fn(async () => null),
  resolveLinearPollingInterval: vi.fn(({ default_interval_ms }: { default_interval_ms: number }) => ({
    interval_ms: default_interval_ms,
    reason: null,
    linear_budget: null
  }))
}));

vi.mock('../src/cli/control/linearWebhookController.js', () => ({
  resolveLinearWebhookSourceSetup: vi.fn()
}));

function buildTrackedIssue(id: string): LiveLinearTrackedIssue {
  return {
    provider: 'linear',
    id,
    identifier: `CO-${id}`,
    title: `Issue ${id}`,
    url: null,
    state: 'Todo',
    state_type: 'unstarted',
    archived_at: null,
    trashed: false,
    workspace_id: null,
    viewer_id: null,
    assignee_id: null,
    assignee_name: null,
    team_id: null,
    team_key: null,
    team_name: null,
    project_id: null,
    project_name: null,
    updated_at: '2026-03-22T00:00:00.000Z',
    blocked_by: [],
    recent_activity: []
  };
}

function buildMockControlHostOwnershipHandle(
  input: {
    release?: () => Promise<void>;
    polling?: ControlHostOwnershipPollingPayload;
  } = {}
): ControlHostOwnershipHandle {
  const polling: ControlHostOwnershipPollingPayload =
    input.polling ?? {
      status: 'owned',
      reason: null,
      updated_at: '2026-04-11T00:00:00.000Z',
      owner: null,
      diagnostic_path: null,
      lock_dir: null,
      owner_path: null
    };
  return {
    metadata: {
      schema_version: 1,
      status: 'owned',
      owner_token: 'owner-token',
      acquired_at: polling.updated_at,
      updated_at: polling.updated_at,
      released_at: null,
      repo_root: null,
      task_id: null,
      run_id: 'run-1',
      run_dir: '/tmp/run',
      pipeline_id: null,
      pid: 1,
      ppid: null,
      hostname: 'host',
      cwd: null,
      argv: [],
      source_root_freshness: null,
      lock_dir: '/tmp/run/control-host-owner.lock',
      lock_owner_path: '/tmp/run/control-host-owner.lock/owner.json',
      owner_path: '/tmp/run/control-host-owner.json'
    },
    polling,
    release: input.release ?? vi.fn(async () => undefined)
  };
}

async function flushStartupProviderRefresh(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

describe('startControlServerPublicLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(acquireControlHostOwnership).mockResolvedValue(null as never);
    vi.mocked(resolveLinearWebhookSourceSetup).mockReturnValue({
      sourceSetup: {} as never
    });
    vi.mocked(readSharedLinearBudgetStatus).mockResolvedValue(null);
    vi.mocked(resolveLinearPollingInterval).mockImplementation(({ default_interval_ms }) => ({
      interval_ms: default_interval_ms,
      reason: null,
      linear_budget: null
    }));
    vi.mocked(resolveLiveLinearTrackedIssues).mockResolvedValue({
      kind: 'ready',
      tracked_issues: [buildTrackedIssue('issue-1')]
    } as Awaited<ReturnType<typeof resolveLiveLinearTrackedIssues>>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prepares startup inputs before activating the ready instance and returns the public lifecycle state', async () => {
    const eventStream = { append: vi.fn() };
    const paths = { repoRoot: '/tmp/repo' } as RunPaths;
    const config = { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig;
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    await expect(
      startControlServerPublicLifecycle({
        paths,
        config,
        eventStream,
        runId: 'run-1'
      })
    ).resolves.toEqual({
      server,
      requestContextShared,
      lifecycleState,
      baseUrl: 'http://127.0.0.1:4545'
    });

    expect(prepareControlServerStartupInputs).toHaveBeenCalledWith({
      paths,
      config,
      eventStream,
      runId: 'run-1',
      sessionTtlMs: 15 * 60 * 1000
    });
    expect(startControlServerReadyInstanceLifecycle).toHaveBeenCalledWith({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123',
      intervalMs: 15_000
    });
  });

  it('fails closed before startup preparation when a same-task control-host owner already exists', async () => {
    const error = Object.assign(
      new Error('control-host ownership rejected (duplicate_control_host_owner)'),
      {
        code: 'duplicate_control_host_owner',
        reason: 'duplicate_control_host_owner'
      }
    );
    vi.mocked(acquireControlHostOwnership).mockRejectedValueOnce(error);

    await expect(
      startControlServerPublicLifecycle({
        paths: { repoRoot: '/tmp/repo' } as RunPaths,
        config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
        runId: 'run-1',
        controlHostOwnership: {}
      })
    ).rejects.toMatchObject({
      code: 'duplicate_control_host_owner',
      reason: 'duplicate_control_host_owner'
    });

    expect(prepareControlServerStartupInputs).not.toHaveBeenCalled();
    expect(startControlServerReadyInstanceLifecycle).not.toHaveBeenCalled();
  });

  it('releases the current control-host ownership handle during public lifecycle shutdown', async () => {
    const release = vi.fn(async () => undefined);
    vi.mocked(acquireControlHostOwnership).mockResolvedValueOnce(
      buildMockControlHostOwnershipHandle({ release })
    );
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1',
      controlHostOwnership: {}
    });

    await closeControlServerPublicLifecycle(started);

    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases the control-host ownership lock when runtime shutdown fails', async () => {
    const release = vi.fn(async () => undefined);
    vi.mocked(closeControlServerOwnedRuntime).mockRejectedValueOnce(
      new Error('runtime shutdown failed')
    );
    const state = {
      server: { kind: 'server' } as unknown as http.Server,
      requestContextShared: {
        clients: new Set(),
        eventTransport: { broadcast: vi.fn() }
      } as unknown as ControlRequestSharedContext,
      lifecycleState: {
        expiryLifecycle: { close: vi.fn() },
        bootstrapLifecycle: { close: vi.fn(async () => undefined) }
      } as unknown as ControlServerOwnedLifecycleState,
      controlHostOwnership: buildMockControlHostOwnershipHandle({ release })
    };

    await expect(closeControlServerPublicLifecycle(state)).rejects.toThrow(
      'runtime shutdown failed'
    );

    expect(release).toHaveBeenCalledOnce();
  });

  it('triggers an immediate provider refresh, keeps the timer active, and clears it on shutdown', async () => {
    vi.useFakeTimers();

    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff: {
        handleAcceptedTrackedIssue: vi.fn(),
        rehydrate: vi.fn(async () => undefined),
        refresh: vi.fn(async () => undefined)
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(requestContextShared.providerIssueHandoff?.refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(requestContextShared.providerIssueHandoff?.refresh).toHaveBeenCalledTimes(2);

    await closeControlServerPublicLifecycle(started);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(requestContextShared.providerIssueHandoff?.refresh).toHaveBeenCalledTimes(2);
  });

  it('does not recreate the provider refresh timer when shutdown lands during async schedule resolution', async () => {
    vi.useFakeTimers();

    const defaultSchedule = {
      interval_ms: 15_000,
      reason: null,
      linear_budget: null
    } as const;
    let resolveSchedule:
      | ((value: {
          interval_ms: number;
          reason: string | null;
          linear_budget: null;
        }) => void)
      | null = null;
    vi.mocked(resolveLinearPollingInterval)
      .mockImplementationOnce(() => defaultSchedule)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSchedule = resolve;
          })
      );

    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff: {
        handleAcceptedTrackedIssue: vi.fn(),
        rehydrate: vi.fn(async () => undefined),
        refresh: vi.fn(async () => undefined)
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(requestContextShared.providerIssueHandoff?.refresh).toHaveBeenCalledTimes(1);

    await closeControlServerPublicLifecycle(started);
    resolveSchedule?.(defaultSchedule);
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(requestContextShared.providerIssueHandoff?.refresh).toHaveBeenCalledTimes(1);
  });

  it('does not overlap provider refresh cycles when one interval run is still in flight', async () => {
    vi.useFakeTimers();

    let resolveRefresh: (() => void) | null = null;
    const refreshPromise = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const refresh = vi.fn(async () => {
      await refreshPromise;
    });
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff: {
        handleAcceptedTrackedIssue: vi.fn(),
        rehydrate: vi.fn(async () => undefined),
        refresh
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    resolveRefresh?.();
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(15_000);
    expect(refresh).toHaveBeenCalledTimes(2);

    await closeControlServerPublicLifecycle(started);
  });

  it('shares the in-flight refresh lock between startup-triggered and interval-triggered provider refreshes', async () => {
    vi.useFakeTimers();

    let resolveRefresh: (() => void) | null = null;
    const refreshPromise = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const refresh = vi.fn(async () => {
      await refreshPromise;
    });
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff: {
        handleAcceptedTrackedIssue: vi.fn(),
        rehydrate: vi.fn(async () => undefined),
        refresh
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(refresh).toHaveBeenCalledTimes(1);

    const startupRefresh = started.triggerProviderRefresh?.();
    expect(refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    resolveRefresh?.();
    await startupRefresh;

    await vi.advanceTimersByTimeAsync(15_000);
    expect(refresh).toHaveBeenCalledTimes(2);

    await closeControlServerPublicLifecycle(started);
  });

  it('records verified control-host owner freshness from the startup freshness collector', async () => {
    vi.useFakeTimers();

    const initialControlHostOwner = buildMockControlHostOwnershipHandle();
    const refreshedControlHostOwner: ControlHostOwnershipPollingPayload = {
      ...initialControlHostOwner.polling,
      updated_at: '2026-04-11T00:01:00.000Z'
    };
    let resolveFreshnessVerification:
      | ((value: ControlHostOwnershipPollingPayload) => void)
      | null = null;
    const freshnessVerification = new Promise<ControlHostOwnershipPollingPayload>((resolve) => {
      resolveFreshnessVerification = resolve;
    });
    vi.mocked(acquireControlHostOwnership).mockResolvedValue(initialControlHostOwner);
    vi.mocked(refreshControlHostOwnershipPollingPayloadInChild).mockReturnValue(
      freshnessVerification
    );

    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined)
    };
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1',
      controlHostOwnership: {}
    });

    await flushStartupProviderRefresh();

    expect(providerIssueHandoff.refresh).toHaveBeenCalledOnce();
    expect(refreshControlHostOwnershipPollingPayloadInChild).toHaveBeenCalledWith(
      initialControlHostOwner.polling
    );
    resolveFreshnessVerification?.(refreshedControlHostOwner);
    await vi.advanceTimersByTimeAsync(0);
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      control_host_owner: refreshedControlHostOwner
    });

    await closeControlServerPublicLifecycle(started);
  });

  it('rechecks control-host owner freshness on later provider refresh triggers', async () => {
    vi.useFakeTimers();

    const initialControlHostOwner = buildMockControlHostOwnershipHandle();
    const firstRefreshedControlHostOwner: ControlHostOwnershipPollingPayload = {
      ...initialControlHostOwner.polling,
      updated_at: '2026-04-11T00:01:00.000Z'
    };
    const secondRefreshedControlHostOwner: ControlHostOwnershipPollingPayload = {
      ...initialControlHostOwner.polling,
      updated_at: '2026-04-11T00:02:00.000Z'
    };
    let resolveFirstVerification:
      | ((value: ControlHostOwnershipPollingPayload) => void)
      | null = null;
    let resolveSecondVerification:
      | ((value: ControlHostOwnershipPollingPayload) => void)
      | null = null;
    const firstVerification = new Promise<ControlHostOwnershipPollingPayload>((resolve) => {
      resolveFirstVerification = resolve;
    });
    const secondVerification = new Promise<ControlHostOwnershipPollingPayload>((resolve) => {
      resolveSecondVerification = resolve;
    });
    vi.mocked(acquireControlHostOwnership).mockResolvedValue(initialControlHostOwner);
    vi.mocked(refreshControlHostOwnershipPollingPayloadInChild)
      .mockReturnValueOnce(firstVerification)
      .mockReturnValueOnce(secondVerification);

    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined)
    };
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1',
      controlHostOwnership: {}
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(refreshControlHostOwnershipPollingPayloadInChild).toHaveBeenCalledTimes(1);
    resolveFirstVerification?.(firstRefreshedControlHostOwner);
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();

    await started.triggerProviderRefresh?.();

    expect(refreshControlHostOwnershipPollingPayloadInChild).toHaveBeenCalledTimes(2);
    resolveSecondVerification?.(secondRefreshedControlHostOwner);
    await vi.advanceTimersByTimeAsync(0);
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      control_host_owner: secondRefreshedControlHostOwner
    });

    await closeControlServerPublicLifecycle(started);
  });

  it('coalesces overlapping recovery sweeps, then falls back to deferred discovery on steady-state ticks', async () => {
    vi.useFakeTimers();

    let resolveTrackedIssues: (() => void) | null = null;
    const firstTrackedIssueFetch = new Promise<void>((resolve) => {
      resolveTrackedIssues = resolve;
    });
    const trackedIssue = buildTrackedIssue('issue-1');
    vi.mocked(resolveLiveLinearTrackedIssues)
      .mockImplementationOnce(async () => {
        await firstTrackedIssueFetch;
        return {
          kind: 'ready',
          tracked_issues: [trackedIssue]
        } as Awaited<ReturnType<typeof resolveLiveLinearTrackedIssues>>;
      })
      .mockResolvedValue({
        kind: 'ready',
        tracked_issues: [trackedIssue]
      } as Awaited<ReturnType<typeof resolveLiveLinearTrackedIssues>>);

    const poll = vi.fn(async () => undefined);
    const requestContextShared = {
      clients: new Set(),
      controlStore: {
        snapshot: () => ({ feature_toggles: {} })
      },
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff: {
        handleAcceptedTrackedIssue: vi.fn(),
        poll,
        rehydrate: vi.fn(async () => undefined),
        refresh: vi.fn(async () => undefined)
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(1);

    const startupRefresh = started.triggerProviderRefresh?.();
    await Promise.resolve();
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(1);
    expect(poll).not.toHaveBeenCalled();

    resolveTrackedIssues?.();
    await startupRefresh;
    expect(poll).toHaveBeenCalledTimes(1);
    expect(poll).toHaveBeenNthCalledWith(1, {
      trackedIssues: [trackedIssue],
      refetchTrackedIssues: expect.any(Function),
      allowPollFailClosed: true
    });

    await vi.advanceTimersByTimeAsync(15_000);
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(1);
    expect(poll).toHaveBeenCalledTimes(2);
    expect(poll).toHaveBeenNthCalledWith(2, {
      trackedIssues: [],
      refetchTrackedIssues: expect.any(Function),
      deferFreshDiscovery: true
    });
    let resolveBudgetRead: (() => void) | null = null;
    vi.mocked(readSharedLinearBudgetStatus).mockImplementationOnce(
      async () =>
        await new Promise((resolve) => {
          resolveBudgetRead = () => resolve(null);
        })
    );
    const pendingTrigger = started.triggerProviderRefresh?.();
    await Promise.resolve();
    const closePromise = closeControlServerPublicLifecycle(started);
    resolveBudgetRead?.();
    await pendingTrigger;
    await closePromise;
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('reruns a full recovery sweep after the slow sweep interval elapses', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-24T00:00:00.000Z'));

    const trackedIssue = buildTrackedIssue('issue-1');
    vi.mocked(resolveLiveLinearTrackedIssues).mockResolvedValue({
      kind: 'ready',
      tracked_issues: [trackedIssue]
    } as Awaited<ReturnType<typeof resolveLiveLinearTrackedIssues>>);

    const poll = vi.fn(async () => undefined);
    const requestContextShared = {
      clients: new Set(),
      controlStore: {
        snapshot: () => ({ feature_toggles: {} })
      },
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff: {
        handleAcceptedTrackedIssue: vi.fn(),
        poll,
        rehydrate: vi.fn(async () => undefined),
        refresh: vi.fn(async () => undefined)
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(1);
    expect(resolveLiveLinearTrackedIssues).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        queryMode: 'recovery_sweep'
      })
    );

    vi.setSystemTime(new Date('2026-03-24T00:10:00.001Z'));
    await started.triggerProviderRefresh?.();

    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(2);
    expect(resolveLiveLinearTrackedIssues).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        queryMode: 'recovery_sweep'
      })
    );

    await closeControlServerPublicLifecycle(started);
  });

  it('queues a manual refresh request behind a pending bulk fetch before any follow-up refresh runs', async () => {
    vi.useFakeTimers();

    let resolveTrackedIssues: (() => void) | null = null;
    const firstTrackedIssueFetch = new Promise<void>((resolve) => {
      resolveTrackedIssues = resolve;
    });
    const trackedIssue = buildTrackedIssue('issue-1');
    vi.mocked(resolveLiveLinearTrackedIssues).mockImplementationOnce(async () => {
      await firstTrackedIssueFetch;
      return {
        kind: 'ready',
        tracked_issues: [trackedIssue]
      } as Awaited<ReturnType<typeof resolveLiveLinearTrackedIssues>>;
    });

    const callOrder: string[] = [];
    const refresh = vi.fn(async () => {
      callOrder.push('refresh');
    });
    const poll = vi.fn(async (input: { trackedIssues: LiveLinearTrackedIssue[] }) => {
      callOrder.push(`poll:${input.trackedIssues.map((issue) => issue.id).join(',')}`);
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      poll,
      rehydrate: vi.fn(async () => undefined),
      refresh
    };
    const requestContextShared = {
      clients: new Set(),
      controlStore: {
        snapshot: () => ({ feature_toggles: {} })
      },
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual([]);

    const manualRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });
    expect(refresh).not.toHaveBeenCalled();

    resolveTrackedIssues?.();
    await manualRefresh;

    expect(poll).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['poll:issue-1', 'refresh']);

    await closeControlServerPublicLifecycle(started);
  });

  it('queues one follow-up refresh when a manual refresh request arrives during an in-flight refresh', async () => {
    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const refresh = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(async () => {
        await firstRefresh;
      })
      .mockImplementation(async () => undefined);
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh
    };

    const inFlightRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    const queuedRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(queuedRefresh).not.toBe(inFlightRefresh);

    resolveRefresh?.();
    await queuedRefresh;

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('preserves restart_required when a refresh aborts with provider_refresh_lifecycle_stuck', async () => {
    const refresh = vi.fn(async () => {
      const error = new Error('provider_refresh_lifecycle_stuck');
      error.name = 'ProviderRefreshLifecycleStuckError';
      throw error;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh
    };

    await expect(runProviderIssueHandoffRefresh(providerIssueHandoff)).resolves.toMatchObject({
      queued: true,
      coalesced: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      last_error: 'provider_refresh_lifecycle_stuck'
    });
    await expect(runProviderIssueHandoffRefresh(providerIssueHandoff)).resolves.toMatchObject({
      queued: true,
      coalesced: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('rejects idle poll retries after polling is already marked restart_required', async () => {
    const poll = vi.fn(async () => undefined);
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      poll
    };

    markProviderPollingStarted(providerIssueHandoff, {
      mode: 'poll'
    });
    await markProviderPollingStuck(providerIssueHandoff);
    markProviderPollingCompleted(providerIssueHandoff, {
      error: new Error('provider_poll_lifecycle_stuck')
    });

    await expect(
      runProviderIssueHandoffPoll(providerIssueHandoff, {
        trackedIssues: []
      })
    ).rejects.toThrow('provider_poll_lifecycle_stuck');
    expect(poll).not.toHaveBeenCalled();
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      stuck: true,
      restart_required: true,
      reason: 'provider_poll_lifecycle_stuck'
    });
  });

  it('allows an explicit idle refresh retry to start after restart_required when requested', async () => {
    const refresh = vi.fn(async () => undefined);
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh
    };
    const stuckError = new Error('provider_refresh_lifecycle_stuck');
    stuckError.name = 'ProviderRefreshLifecycleStuckError';

    markProviderPollingStarted(providerIssueHandoff, {
      mode: 'refresh',
      atMs: Date.parse('2026-03-22T09:00:00.000Z')
    });
    await markProviderPollingStuck(providerIssueHandoff, {
      atMs: Date.parse('2026-03-22T09:00:45.000Z')
    });
    markProviderPollingCompleted(providerIssueHandoff, {
      error: stuckError,
      atMs: Date.parse('2026-03-22T09:00:45.000Z')
    });

    await expect(
      runProviderIssueHandoffRefresh(providerIssueHandoff, {
        allowIdleRestartRequiredRetry: true
      })
    ).resolves.toMatchObject({
      queued: true,
      coalesced: false
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      stuck: false,
      restart_required: false,
      last_error: null
    });
  });

  it('allows an explicit refresh retry to replace an active stuck refresh operation', async () => {
    let resolveFirstRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveFirstRefresh = resolve;
    });
    const refresh = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(async () => {
        await firstRefresh;
        const error = new Error('provider_refresh_lifecycle_stuck');
        error.name = 'ProviderRefreshLifecycleStuckError';
        throw error;
      })
      .mockImplementationOnce(async () => undefined);
    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh,
      resetStuckRefreshLifecycle
    };

    const inFlightRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    expect(refresh).toHaveBeenCalledTimes(1);
    const queuedRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });

    await markProviderPollingStuck(providerIssueHandoff);
    const retryOutcome = await runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true,
      allowIdleRestartRequiredRetry: true
    });

    expect(retryOutcome).toMatchObject({
      queued: true,
      coalesced: false
    });
    expect(resetStuckRefreshLifecycle).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(2);
    await expect(inFlightRefresh).resolves.toMatchObject({
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    await expect(queuedRefresh).resolves.toMatchObject({
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      stuck: false,
      restart_required: false,
      last_error: null
    });

    resolveFirstRefresh?.();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      stuck: false,
      restart_required: false,
      last_error: null
    });
  });

  it('lets explicit recovery replace an active stuck refresh operation before later refreshes', async () => {
    let resolveFirstRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveFirstRefresh = resolve;
    });
    const refresh = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(async () => {
        await firstRefresh;
        const error = new Error('provider_refresh_lifecycle_stuck');
        error.name = 'ProviderRefreshLifecycleStuckError';
        throw error;
      })
      .mockImplementationOnce(async () => undefined);
    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh,
      resetStuckRefreshLifecycle,
      recoverIssue: vi.fn(async (input: {
        provider: 'linear';
        issueId: string;
        action: 'recover' | 'relaunch' | 'nudge';
      }) => {
        return {
          provider: input.provider,
          issue_id: input.issueId,
          action: input.action,
          kind: 'start' as const,
          reason: 'provider_issue_start_launched',
          claim: null
        };
      })
    };
    resetStuckRefreshLifecycle.mockImplementation(() => {
      markProviderPollingCompleted(providerIssueHandoff);
    });

    const inFlightRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    expect(refresh).toHaveBeenCalledTimes(1);
    await markProviderPollingStuck(providerIssueHandoff);

    await expect(
      runProviderIssueHandoffRecover(providerIssueHandoff, {
        provider: 'linear',
        issueId: 'lin-issue-330',
        action: 'recover'
      })
    ).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-330',
      action: 'recover',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    await expect(inFlightRefresh).resolves.toMatchObject({
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });

    await expect(runProviderIssueHandoffRefresh(providerIssueHandoff)).resolves.toMatchObject({
      queued: true,
      coalesced: false
    });
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(resetStuckRefreshLifecycle).toHaveBeenCalledTimes(1);

    resolveFirstRefresh?.();
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  it('still runs explicit recovery when the active refresh fails while recovery is waiting', async () => {
    let rejectFirstRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((_resolve, reject) => {
      rejectFirstRefresh = () => {
        const error = new Error('provider_refresh_lifecycle_stuck');
        error.name = 'ProviderRefreshLifecycleStuckError';
        reject(error);
      };
    });
    const refresh = vi.fn<() => Promise<void>>().mockImplementationOnce(async () => {
      await firstRefresh;
    });
    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh,
      resetStuckRefreshLifecycle,
      recoverIssue: vi.fn(async (input: {
        provider: 'linear';
        issueId: string;
        action: 'recover' | 'relaunch' | 'nudge';
      }) => {
        return {
          provider: input.provider,
          issue_id: input.issueId,
          action: input.action,
          kind: 'start' as const,
          reason: 'provider_issue_start_launched',
          claim: null
        };
      })
    };
    resetStuckRefreshLifecycle.mockImplementation(() => {
      markProviderPollingCompleted(providerIssueHandoff);
    });

    const inFlightRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    const recovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-330',
      action: 'recover'
    });

    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).not.toHaveBeenCalled();

    rejectFirstRefresh?.();

    await expect(inFlightRefresh).resolves.toMatchObject({
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    await expect(recovery).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-330',
      action: 'recover',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);
    expect(resetStuckRefreshLifecycle).toHaveBeenCalledTimes(1);
  });

  it('keeps explicit recovery registered after waiting for a healthy active refresh to settle', async () => {
    let resolveFirstRefresh: (() => void) | null = null;
    let resolveRecovery: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveFirstRefresh = resolve;
    });
    const recoveryPending = new Promise<void>((resolve) => {
      resolveRecovery = resolve;
    });
    const refresh = vi.fn<() => Promise<void>>().mockImplementationOnce(async () => {
      await firstRefresh;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh,
      recoverIssue: vi.fn(async (input: {
        provider: 'linear';
        issueId: string;
        action: 'recover' | 'relaunch' | 'nudge';
      }) => {
        await recoveryPending;
        return {
          provider: input.provider,
          issue_id: input.issueId,
          action: input.action,
          kind: 'start' as const,
          reason: 'provider_issue_start_launched',
          claim: null
        };
      })
    };

    const activeRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    const recovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-330',
      action: 'recover'
    });

    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).not.toHaveBeenCalled();

    resolveFirstRefresh?.();
    await expect(activeRefresh).resolves.toMatchObject({
      queued: true,
      coalesced: false
    });
    for (
      let attempt = 0;
      attempt < 10 && providerIssueHandoff.recoverIssue.mock.calls.length === 0;
      attempt += 1
    ) {
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);

    const refreshDuringRecovery = runProviderIssueHandoffRefresh(providerIssueHandoff);
    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(1);

    resolveRecovery?.();
    await expect(recovery).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-330',
      action: 'recover',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    await expect(refreshDuringRecovery).resolves.toMatchObject({
      queued: true,
      coalesced: true
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('uses a bounded explicit-recovery watchdog while waiting on an active refresh', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-30T12:00:00.000Z'));

    const refresh = vi.fn<() => Promise<void>>().mockImplementationOnce(async () => {
      await new Promise<void>(() => undefined);
    });
    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh,
      resetStuckRefreshLifecycle,
      recoverIssue: vi.fn(async (input: {
        provider: 'linear';
        issueId: string;
        action: 'recover' | 'relaunch' | 'nudge';
      }) => {
        return {
          provider: input.provider,
          issue_id: input.issueId,
          action: input.action,
          kind: 'start' as const,
          reason: 'provider_issue_start_launched',
          claim: null
        };
      })
    };
    resetStuckRefreshLifecycle.mockImplementation(() => {
      markProviderPollingCompleted(providerIssueHandoff);
    });
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15_000,
      stuckAfterMs: 45_000
    });

    const inFlightRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    const recovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-330',
      action: 'recover'
    });

    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60_000);

    await expect(inFlightRefresh).resolves.toMatchObject({
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    await expect(recovery).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-330',
      action: 'recover',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);
    expect(resetStuckRefreshLifecycle).toHaveBeenCalledTimes(1);
  });

  it('retries explicit recovery when the recovery operation itself gets stranded', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T17:18:00.000Z'));

    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      resetStuckRefreshLifecycle,
      recoverIssue: vi
        .fn<(
          input: {
            provider: 'linear';
            issueId: string;
            action: 'recover' | 'relaunch' | 'nudge';
          }
        ) => Promise<{
          provider: 'linear';
          issue_id: string;
          action: 'recover' | 'relaunch' | 'nudge';
          kind: 'start';
          reason: string;
          claim: null;
        }>>()
        .mockImplementationOnce(async () => {
          await new Promise<void>(() => undefined);
          throw new Error('unreachable');
        })
        .mockImplementationOnce(async (input) => ({
          provider: input.provider,
          issue_id: input.issueId,
          action: input.action,
          kind: 'start' as const,
          reason: 'provider_issue_start_launched',
          claim: null
        }))
    };
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15_000,
      stuckAfterMs: 45_000
    });

    const recovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-470',
      action: 'recover'
    });

    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(45_000);

    await expect(recovery).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-470',
      action: 'recover',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(2);
    expect(resetStuckRefreshLifecycle).toHaveBeenCalledTimes(1);
  });

  it('allows a slow recovery launch manifest wait to finish before retrying', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T17:18:00.000Z'));

    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      resetStuckRefreshLifecycle,
      recoverIssue: vi.fn(async (input: {
        provider: 'linear';
        issueId: string;
        action: 'recover' | 'relaunch' | 'nudge';
      }) => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 25_000);
        });
        return {
          provider: input.provider,
          issue_id: input.issueId,
          action: input.action,
          kind: 'start' as const,
          reason: 'provider_issue_start_launched',
          claim: null
        };
      })
    };
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15_000,
      stuckAfterMs: 45_000
    });

    const recovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-470',
      action: 'recover'
    });

    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(25_000);

    await expect(recovery).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-470',
      action: 'recover',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);
    expect(resetStuckRefreshLifecycle).not.toHaveBeenCalled();
  });

  it('coalesces an active explicit recovery with the recovery budget instead of retrying', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T17:18:00.000Z'));

    let recoverCalls = 0;
    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      resetStuckRefreshLifecycle,
      recoverIssue: vi.fn(async (input: {
        provider: 'linear';
        issueId: string;
        action: 'recover' | 'relaunch' | 'nudge';
      }) => {
        recoverCalls += 1;
        if (recoverCalls === 1) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 25_000);
          });
        }
        return {
          provider: input.provider,
          issue_id: input.issueId,
          action: input.action,
          kind: 'start' as const,
          reason: 'provider_issue_start_launched',
          claim: null
        };
      })
    };
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15_000,
      stuckAfterMs: 45_000
    });

    const firstRecovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-470',
      action: 'recover'
    });
    await Promise.resolve();
    const secondRecovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-470',
      action: 'recover'
    });
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(24_000);
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);
    expect(resetStuckRefreshLifecycle).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_000);
    await expect(firstRecovery).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-470',
      action: 'recover',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    await expect(secondRecovery).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-470',
      action: 'recover',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);
    expect(resetStuckRefreshLifecycle).not.toHaveBeenCalled();
  });

  it('coalesces duplicate recovery by key when another recovery request waits behind it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T17:18:00.000Z'));

    const recoverActions: Array<'recover' | 'relaunch' | 'nudge'> = [];
    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      resetStuckRefreshLifecycle,
      recoverIssue: vi.fn(async (input: {
        provider: 'linear';
        issueId: string;
        action: 'recover' | 'relaunch' | 'nudge';
      }) => {
        recoverActions.push(input.action);
        if (input.action === 'recover') {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 25_000);
          });
        }
        return {
          provider: input.provider,
          issue_id: input.issueId,
          action: input.action,
          kind: 'start' as const,
          reason: 'provider_issue_start_launched',
          claim: null
        };
      })
    };
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15_000,
      stuckAfterMs: 45_000
    });

    const firstRecovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-470',
      action: 'recover'
    });
    await Promise.resolve();
    const relaunch = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-470',
      action: 'relaunch'
    });
    await Promise.resolve();
    const secondRecovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-470',
      action: 'recover'
    });
    await Promise.resolve();

    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(25_000);

    await expect(firstRecovery).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-470',
      action: 'recover',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    await expect(secondRecovery).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-470',
      action: 'recover',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    await expect(relaunch).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-470',
      action: 'relaunch',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(2);
    expect(recoverActions).toEqual(['recover', 'relaunch']);
    expect(resetStuckRefreshLifecycle).not.toHaveBeenCalled();
  });

  it('fails fast when a retry would exceed the explicit recovery deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T17:18:00.000Z'));

    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      resetStuckRefreshLifecycle,
      recoverIssue: vi.fn(async () => {
        await new Promise<void>(() => undefined);
        throw new Error('unreachable');
      })
    };
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15_000,
      stuckAfterMs: 45_000
    });

    const recovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-470',
      action: 'recover'
    });
    const recoveryExpectation = expect(recovery).rejects.toThrow('provider_refresh_lifecycle_stuck');

    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(45_000);
    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(45_000);

    await recoveryExpectation;
    expect(resetStuckRefreshLifecycle).toHaveBeenCalledTimes(2);
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
  });

  it('abandons an active operation without polling health after the explicit recovery deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T17:18:00.000Z'));

    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {
        await new Promise<void>(() => undefined);
      }),
      refresh: vi.fn(async () => undefined),
      resetStuckRefreshLifecycle,
      recoverIssue: vi.fn(async (input: {
        provider: 'linear';
        issueId: string;
        action: 'recover' | 'relaunch' | 'nudge';
      }) => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 20_000);
        });
        return {
          provider: input.provider,
          issue_id: input.issueId,
          action: input.action,
          kind: 'start' as const,
          reason: 'provider_issue_start_launched',
          claim: null
        };
      })
    };
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15_000,
      stuckAfterMs: 45_000
    });

    void runProviderIssueHandoffRehydrate(providerIssueHandoff);
    const recovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-470',
      action: 'recover'
    });

    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(22_000);
    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2_000);
    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(20_000);

    await expect(recovery).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-470',
      action: 'recover',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);
    expect(resetStuckRefreshLifecycle).toHaveBeenCalledTimes(1);
  });

  it('keeps active recovery registered after an abandoned queued refresh settles later', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T17:18:00.000Z'));

    let resolveRehydrate: (() => void) | null = null;
    const rehydratePending = new Promise<void>((resolve) => {
      resolveRehydrate = resolve;
    });
    let resolveRecovery: (() => void) | null = null;
    const recoveryPending = new Promise<void>((resolve) => {
      resolveRecovery = resolve;
    });
    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {
        await rehydratePending;
      }),
      refresh: vi.fn(async () => undefined),
      resetStuckRefreshLifecycle,
      recoverIssue: vi.fn(async (input: {
        provider: 'linear';
        issueId: string;
        action: 'recover' | 'relaunch' | 'nudge';
      }) => {
        await recoveryPending;
        return {
          provider: input.provider,
          issue_id: input.issueId,
          action: input.action,
          kind: 'start' as const,
          reason: 'provider_issue_start_launched',
          claim: null
        };
      })
    };
    resetStuckRefreshLifecycle.mockImplementation(() => {
      markProviderPollingCompleted(providerIssueHandoff);
    });
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15_000,
      stuckAfterMs: 45_000
    });

    const activeRehydrate = runProviderIssueHandoffRehydrate(providerIssueHandoff);
    const queuedRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });
    const recovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-470',
      action: 'recover'
    });

    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).not.toHaveBeenCalled();

    await vi.advanceTimersToNextTimerAsync();
    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).not.toHaveBeenCalled();

    await vi.advanceTimersToNextTimerAsync();
    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);

    resolveRehydrate?.();
    await expect(activeRehydrate).resolves.toBeUndefined();
    await expect(queuedRefresh).resolves.toMatchObject({
      queued: true,
      coalesced: false
    });

    const refreshDuringRecovery = runProviderIssueHandoffRefresh(providerIssueHandoff);
    await Promise.resolve();
    expect(providerIssueHandoff.refresh).not.toHaveBeenCalled();

    resolveRecovery?.();
    await expect(recovery).resolves.toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-470',
      action: 'recover',
      kind: 'start',
      reason: 'provider_issue_start_launched'
    });
    await expect(refreshDuringRecovery).resolves.toMatchObject({
      queued: true,
      coalesced: true
    });
    expect(providerIssueHandoff.refresh).not.toHaveBeenCalled();
    expect(resetStuckRefreshLifecycle).toHaveBeenCalled();
  });

  it('keeps in-wait stuck diagnostics when explicit recovery skips after abandoning refresh', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T17:18:00.000Z'));

    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => {
        await new Promise<void>(() => undefined);
      }),
      resetStuckRefreshLifecycle,
      recoverIssue: vi.fn(async (input: {
        provider: 'linear';
        issueId: string;
        action: 'recover' | 'relaunch' | 'nudge';
      }) => ({
        provider: input.provider,
        issue_id: input.issueId,
        action: input.action,
        kind: 'skipped' as const,
        reason: 'dispatch_source_unavailable',
        claim: null
      }))
    };
    resetStuckRefreshLifecycle.mockImplementation(() => {
      markProviderPollingCompleted(providerIssueHandoff);
    });
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15_000,
      stuckAfterMs: 45_000
    });

    const inFlightRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    const recovery = runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-470',
      action: 'recover'
    });

    await Promise.resolve();
    expect(providerIssueHandoff.recoverIssue).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(22_000);

    await expect(inFlightRefresh).resolves.toMatchObject({
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    await expect(recovery).resolves.toMatchObject({
      kind: 'skipped',
      reason: 'dispatch_source_unavailable'
    });
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      last_error: 'Provider refresh lifecycle exceeded 45000ms; restart required'
    });
  });

  it('keeps restart-required diagnostics when explicit recovery skips from an idle stuck state', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T17:18:00.000Z'));

    const calls: string[] = [];
    const resetStuckRefreshLifecycle = vi.fn(() => {
      calls.push('reset');
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      resetStuckRefreshLifecycle,
      recoverIssue: vi.fn(async (input: {
        provider: 'linear';
        issueId: string;
        action: 'recover' | 'relaunch' | 'nudge';
      }) => {
        calls.push('recover');
        return {
          provider: input.provider,
          issue_id: input.issueId,
          action: input.action,
          kind: 'skipped' as const,
          reason: 'dispatch_source_unavailable',
          claim: null
        };
      })
    };
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15_000,
      stuckAfterMs: 45_000
    });
    const stuckError = new Error('original refresh timeout');
    stuckError.name = 'ProviderRefreshLifecycleStuckError';
    markProviderPollingStarted(providerIssueHandoff, {
      mode: 'refresh',
      atMs: Date.parse('2026-05-01T17:17:00.000Z')
    });
    await markProviderPollingStuck(providerIssueHandoff, {
      atMs: Date.parse('2026-05-01T17:17:45.000Z')
    });
    markProviderPollingCompleted(providerIssueHandoff, {
      error: stuckError,
      atMs: Date.parse('2026-05-01T17:17:45.000Z')
    });

    const result = await runProviderIssueHandoffRecover(providerIssueHandoff, {
      provider: 'linear',
      issueId: 'lin-issue-470',
      action: 'recover'
    });

    expect(result).toMatchObject({
      provider: 'linear',
      issue_id: 'lin-issue-470',
      action: 'recover',
      kind: 'skipped',
      reason: 'dispatch_source_unavailable'
    });
    expect(providerIssueHandoff.recoverIssue).toHaveBeenCalledTimes(1);
    expect(resetStuckRefreshLifecycle).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['reset', 'recover']);
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      last_success_at: null,
      last_error: 'original refresh timeout',
      next_poll_at: null
    });
  });

  it('acknowledges a newly started refresh immediately for public-route callers while the refresh keeps running', async () => {
    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => {
        await firstRefresh;
      })
    };

    let acknowledgedOutcome: ProviderIssueHandoffRefreshRequestOutcome | null = null;
    const acknowledgedRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true,
      acknowledgeAccepted: true
    });
    void acknowledgedRefresh.then((outcome) => {
      acknowledgedOutcome = outcome;
    });

    let waitingRefreshSettled = false;
    const waitingRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    void waitingRefresh.finally(() => {
      waitingRefreshSettled = true;
    });

    await Promise.resolve();

    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);
    expect(acknowledgedOutcome).toMatchObject({
      queued: true,
      coalesced: false
    });
    expect(waitingRefreshSettled).toBe(false);

    resolveRefresh?.();
    await waitingRefresh;

    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);
  });

  it('does not surface unhandled rejections when an acknowledged refresh later fails', async () => {
    const unhandledRejections: unknown[] = [];
    const handleUnhandledRejection = (reason: unknown): void => {
      unhandledRejections.push(reason);
    };
    process.on('unhandledRejection', handleUnhandledRejection);
    try {
      const providerIssueHandoff = {
        handleAcceptedTrackedIssue: vi.fn(),
        rehydrate: vi.fn(async () => undefined),
        refresh: vi.fn(async () => {
          throw new Error('refresh failed');
        })
      };

      await expect(
        runProviderIssueHandoffRefresh(providerIssueHandoff, {
          queueIfBusy: true,
          acknowledgeAccepted: true
        })
      ).resolves.toMatchObject({
        queued: true,
        coalesced: false
      });

      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(unhandledRejections).toHaveLength(0);
    } finally {
      process.off('unhandledRejection', handleUnhandledRejection);
    }
  });

  it('acknowledges queued and coalesced refresh requests immediately for public-route callers', async () => {
    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const refresh = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(async () => {
        await firstRefresh;
      })
      .mockImplementation(async () => undefined);
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh
    };

    const inFlightRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    const queuedAcknowledgement = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true,
      acknowledgeAccepted: true
    });
    const coalescedAcknowledgement = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true,
      acknowledgeAccepted: true
    });
    const waitingQueuedRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });

    await expect(queuedAcknowledgement).resolves.toMatchObject({
      queued: true,
      coalesced: false
    });
    await expect(coalescedAcknowledgement).resolves.toMatchObject({
      queued: true,
      coalesced: true
    });
    expect(refresh).toHaveBeenCalledTimes(1);

    resolveRefresh?.();
    await inFlightRefresh;
    await expect(waitingQueuedRefresh).resolves.toMatchObject({
      queued: true,
      coalesced: true
    });

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('rechecks the active lock before starting a queued refresh after the prior operation settles', async () => {
    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    let notifyRehydrateStarted: (() => void) | null = null;
    const rehydrateStarted = new Promise<void>((resolve) => {
      notifyRehydrateStarted = resolve;
    });
    let resolveRehydrate: (() => void) | null = null;
    const rehydratePromise = new Promise<void>((resolve) => {
      resolveRehydrate = resolve;
    });
    let queuedRefreshSettled = false;
    const refresh = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(async () => {
        await firstRefresh;
      })
      .mockImplementation(async () => undefined);
    const rehydrate = vi.fn(async () => {
      notifyRehydrateStarted?.();
      await rehydratePromise;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate,
      refresh
    };

    runProviderIssueHandoffRefresh(providerIssueHandoff);
    const activeLock = runProviderIssueHandoffRehydrate(providerIssueHandoff);
    const interposedRehydrate = activeLock.then(() => runProviderIssueHandoffRehydrate(providerIssueHandoff));
    const queuedRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });
    void queuedRefresh.finally(() => {
      queuedRefreshSettled = true;
    });

    expect(refresh).toHaveBeenCalledTimes(1);

    resolveRefresh?.();
    await activeLock;
    await rehydrateStarted;

    expect(rehydrate).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(queuedRefreshSettled).toBe(false);

    resolveRehydrate?.();
    await interposedRehydrate;
    await queuedRefresh;

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('records polling health failures even when background refresh errors are swallowed', async () => {
    vi.useFakeTimers();

    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => {
        throw new Error('refresh failed');
      })
    };
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();

    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      last_mode: 'refresh',
      last_error: 'refresh failed'
    });

    await closeControlServerPublicLifecycle(started);
  });

  it('preserves a persisted polling snapshot across startup until the first live refresh update', async () => {
    vi.useFakeTimers();

    const persistProviderIntakePolling = vi.fn(async () => undefined);
    const providerIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-24T00:00:45.000Z',
      rehydrated_at: null,
      latest_provider_key: null,
      latest_reason: null,
      polling: {
        enabled: true,
        interval_ms: 15000,
        checking: true,
        queued: false,
        last_mode: 'refresh',
        last_requested_at: '2026-03-24T00:00:00.000Z',
        updated_at: '2026-03-24T00:00:45.000Z',
        operation_started_at: '2026-03-24T00:00:00.000Z',
        operation_elapsed_ms: 45000,
        stalled_after_ms: 45000,
        stuck: true,
        stuck_since_at: '2026-03-24T00:00:45.000Z',
        restart_required: true,
        reason: 'provider_refresh_lifecycle_stuck'
      },
      claims: []
    };
    const refresh = vi.fn(async () => undefined);
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      persist: {
        providerIntakePolling: persistProviderIntakePolling
      },
      providerIntakeState,
      providerIssueHandoff: {
        handleAcceptedTrackedIssue: vi.fn(),
        rehydrate: vi.fn(async () => undefined),
        refresh
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    expect(persistProviderIntakePolling).not.toHaveBeenCalled();
    expect(providerIntakeState.polling).toMatchObject({
      checking: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      updated_at: '2026-03-24T00:00:45.000Z'
    });

    await flushStartupProviderRefresh();
    expect(refresh).toHaveBeenCalledTimes(1);

    await closeControlServerPublicLifecycle(started);
  });

  it('records refresh mode when polling falls back to refresh after tracked-issue resolution skips', async () => {
    vi.useFakeTimers();

    vi.mocked(resolveLiveLinearTrackedIssues).mockResolvedValueOnce({
      kind: 'skip',
      reason: 'dispatch_source_unavailable'
    } as Awaited<ReturnType<typeof resolveLiveLinearTrackedIssues>>);

    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      poll: vi.fn(async () => undefined),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined)
    };
    const requestContextShared = {
      clients: new Set(),
      controlStore: {
        snapshot: () => ({ feature_toggles: {} })
      },
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();

    expect(providerIssueHandoff.poll).not.toHaveBeenCalled();
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      last_mode: 'refresh',
      last_error: null
    });

    await closeControlServerPublicLifecycle(started);
  });

  it('skips refresh fallback and widens the next polling interval when the shared budget is already rate limited', async () => {
    vi.useFakeTimers();

    vi.mocked(resolveLiveLinearTrackedIssues).mockResolvedValueOnce({
      kind: 'skip',
      reason: 'dispatch_source_provider_rate_limited'
    } as Awaited<ReturnType<typeof resolveLiveLinearTrackedIssues>>);
    vi.mocked(resolveLinearPollingInterval).mockReturnValue({
      interval_ms: 60_000,
      reason: 'linear_budget_requests_low',
      linear_budget: {
        observed_at: new Date().toISOString(),
        source: 'dispatch_source_tracked_issues',
        request_id: null,
        retry_after_seconds: null,
        cooldown_until: null,
        cooldown_active: false,
        suppression: 'low',
        suppression_reason: 'linear_budget_requests_low',
        requests: {
          limit: 100,
          remaining: 1,
          reset_at: new Date(Date.now() + 60_000).toISOString()
        },
        endpoint_requests: null,
        complexity: null,
        endpoint_complexity: null
      }
    });

    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      poll: vi.fn(async () => undefined),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined)
    };
    const requestContextShared = {
      clients: new Set(),
      controlStore: {
        snapshot: () => ({ feature_toggles: {} })
      },
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();

    expect(providerIssueHandoff.poll).not.toHaveBeenCalled();
    expect(providerIssueHandoff.refresh).not.toHaveBeenCalled();
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      interval_ms: 60_000,
      reason: 'linear_budget_requests_low',
      linear_budget: {
        suppression: 'low'
      }
    });

    await vi.advanceTimersByTimeAsync(15_000);
    expect(providerIssueHandoff.refresh).not.toHaveBeenCalled();

    await closeControlServerPublicLifecycle(started);
  });

  it('resumes provider polling after a shared cooldown window clears', async () => {
    vi.useFakeTimers();

    const cooldownSchedule = {
      interval_ms: 15_000,
      reason: 'linear_budget_shared_cooldown',
      linear_budget: {
        observed_at: new Date().toISOString(),
        source: 'dispatch_source_tracked_issues',
        request_id: 'req-cooldown',
        retry_after_seconds: 15,
        cooldown_until: new Date(Date.now() + 15_000).toISOString(),
        cooldown_active: true,
        suppression: 'cooldown',
        suppression_reason: 'linear_budget_shared_cooldown',
        requests: {
          limit: 100,
          remaining: 0,
          reset_at: new Date(Date.now() + 15_000).toISOString()
        },
        endpoint_requests: null,
        complexity: null,
        endpoint_complexity: null
      }
    } as const;
    const healthySchedule = {
      interval_ms: 15_000,
      reason: null,
      linear_budget: null
    } as const;
    vi.mocked(resolveLinearPollingInterval)
      .mockImplementationOnce(() => cooldownSchedule)
      .mockImplementationOnce(() => cooldownSchedule)
      .mockImplementationOnce(() => healthySchedule)
      .mockImplementation(() => healthySchedule);

    const trackedIssue = buildTrackedIssue('issue-1');
    vi.mocked(resolveLiveLinearTrackedIssues).mockResolvedValue({
      kind: 'ready',
      tracked_issues: [trackedIssue]
    } as Awaited<ReturnType<typeof resolveLiveLinearTrackedIssues>>);

    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      poll: vi.fn(async (input: ProviderIssueHandoffPollInput) => {
        void input;
      }),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined)
    };
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff,
      controlStore: {
        snapshot: () => ({ feature_toggles: {} })
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();

    expect(providerIssueHandoff.poll).not.toHaveBeenCalled();
    expect(providerIssueHandoff.refresh).not.toHaveBeenCalled();
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      next_refresh_state: 'cooldown',
      next_refresh_at: cooldownSchedule.linear_budget.cooldown_until,
      next_refresh_in_ms: 15_000,
      reason: 'linear_budget_shared_cooldown'
    });

    await vi.advanceTimersByTimeAsync(15_000);

    expect(providerIssueHandoff.poll).toHaveBeenCalledTimes(1);
    expect(providerIssueHandoff.refresh).not.toHaveBeenCalled();
    expect(providerIssueHandoff.poll).toHaveBeenCalledWith({
      trackedIssues: [trackedIssue],
      refetchTrackedIssues: expect.any(Function),
      allowPollFailClosed: true
    });

    await closeControlServerPublicLifecycle(started);
  });

  it('reuses the last valid interval when scheduled polling receives an invalid interval', () => {
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      poll: vi.fn(async () => undefined),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined)
    };

    const atMs = Date.parse('2026-03-22T09:00:00.000Z');
    scheduleProviderPolling(providerIssueHandoff, {
      intervalMs: 15_000,
      reason: 'linear_budget_requests_low',
      atMs
    });
    scheduleProviderPolling(providerIssueHandoff, {
      intervalMs: Number.NaN,
      reason: 'linear_budget_requests_low',
      atMs: atMs + 5_000
    });

    expect(readProviderPollingHealth(providerIssueHandoff, atMs + 5_000)).toMatchObject({
      interval_ms: 15_000,
      next_poll_at: '2026-03-22T09:00:20.000Z',
      reason: 'linear_budget_requests_low'
    });
  });

  it('keeps lifecycle-stuck polling fail-closed when later schedules arrive', () => {
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      poll: vi.fn(async () => undefined),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined)
    };

    const startedAtMs = Date.parse('2026-03-22T09:00:00.000Z');
    const stuckError = new Error('provider_refresh_lifecycle_stuck');
    stuckError.name = 'ProviderRefreshLifecycleStuckError';

    markProviderPollingStarted(providerIssueHandoff, {
      mode: 'refresh',
      atMs: startedAtMs
    });
    markProviderPollingCompleted(providerIssueHandoff, {
      atMs: startedAtMs + 45_000,
      error: stuckError
    });

    scheduleProviderPolling(providerIssueHandoff, {
      intervalMs: 15_000,
      reason: 'linear_budget_requests_low',
      atMs: startedAtMs + 50_000
    });

    expect(readProviderPollingHealth(providerIssueHandoff, startedAtMs + 50_000)).toMatchObject({
      checking: false,
      stuck: true,
      restart_required: true,
      next_poll_at: null,
      reason: 'provider_refresh_lifecycle_stuck'
    });
  });

  it('preserves the active refresh mode when a non-queued poll request coalesces behind it', async () => {
    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const refresh = vi.fn(async () => {
      await firstRefresh;
    });
    const poll = vi.fn(async () => undefined);
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      poll,
      rehydrate: vi.fn(async () => undefined),
      refresh
    };

    const inFlightRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    const coalescedPoll = runProviderIssueHandoffPoll(providerIssueHandoff, {
      trackedIssues: [buildTrackedIssue('issue-1')]
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(poll).not.toHaveBeenCalled();

    resolveRefresh?.();
    await Promise.all([inFlightRefresh, coalescedPoll]);

    expect(poll).not.toHaveBeenCalled();
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      last_mode: 'refresh',
      last_error: null
    });
  });

  it('preserves the active poll mode when a refresh request queues behind it', async () => {
    let resolvePoll: (() => void) | null = null;
    const firstPoll = new Promise<void>((resolve) => {
      resolvePoll = resolve;
    });
    let notifyPollStarted: (() => void) | null = null;
    const pollStarted = new Promise<void>((resolve) => {
      notifyPollStarted = resolve;
    });
    const refresh = vi.fn(async () => undefined);
    const poll = vi
      .fn<(_: ProviderIssueHandoffPollInput) => Promise<void>>()
      .mockImplementationOnce(async () => {
        notifyPollStarted?.();
        await firstPoll;
      });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      poll,
      rehydrate: vi.fn(async () => undefined),
      refresh
    };

    const inFlightPoll = runProviderIssueHandoffPoll(providerIssueHandoff, {
      trackedIssues: [buildTrackedIssue('issue-1')]
    });
    await pollStarted;

    const queuedRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: true,
      queued: true,
      last_mode: 'poll'
    });

    resolvePoll?.();
    await Promise.all([inFlightPoll, queuedRefresh]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      queued: false,
      last_mode: 'refresh',
      last_error: null
    });
  });

  it('keeps queued polling health visible when poll falls back to refresh with queued follow-up work', async () => {
    vi.useFakeTimers();

    let resolveTrackedIssues: (() => void) | null = null;
    const trackedIssueFetch = new Promise<void>((resolve) => {
      resolveTrackedIssues = resolve;
    });
    vi.mocked(resolveLiveLinearTrackedIssues).mockImplementationOnce(async () => {
      await trackedIssueFetch;
      return {
        kind: 'skip',
        reason: 'dispatch_source_unavailable'
      } as Awaited<ReturnType<typeof resolveLiveLinearTrackedIssues>>;
    });

    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    let notifyRefreshStarted: (() => void) | null = null;
    const refreshStarted = new Promise<void>((resolve) => {
      notifyRefreshStarted = resolve;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      poll: vi.fn(async () => undefined),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi
        .fn<() => Promise<void>>()
        .mockImplementationOnce(async () => {
          notifyRefreshStarted?.();
          await firstRefresh;
        })
        .mockImplementation(async () => undefined)
    };
    const requestContextShared = {
      clients: new Set(),
      controlStore: {
        snapshot: () => ({ feature_toggles: {} })
      },
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(1);
    const initialHealth = readProviderPollingHealth(providerIssueHandoff);
    const initialStartedAt = initialHealth?.operation_started_at;
    expect(initialHealth).toMatchObject({
      checking: true,
      last_mode: 'poll'
    });

    await vi.advanceTimersByTimeAsync(30_000);

    const queuedRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });
    expect(providerIssueHandoff.refresh).not.toHaveBeenCalled();

    resolveTrackedIssues?.();
    await refreshStarted;

    expect(providerIssueHandoff.poll).not.toHaveBeenCalled();
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: true,
      queued: true,
      last_mode: 'refresh',
      operation_started_at: initialStartedAt
    });

    resolveRefresh?.();
    await queuedRefresh;

    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(2);
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      queued: false,
      last_mode: 'refresh',
      last_error: null
    });

    await closeControlServerPublicLifecycle(started);
  });

  it('marks a wedged refresh as stuck, persists polling evidence, and returns restart-required acknowledgements', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T01:00:00.000Z'));

    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => {
        await firstRefresh;
      })
    };
    const persistProviderIntake = vi.fn(async () => undefined);
    const persistProviderIntakePolling = vi.fn(async () => undefined);
    const providerIntakeState = {
      schema_version: 1,
      updated_at: new Date(0).toISOString(),
      rehydrated_at: null,
      latest_provider_key: null,
      latest_reason: null,
      polling: null,
      claims: []
    };
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff,
      providerIntakeState,
      persist: {
        providerIntake: persistProviderIntake,
        providerIntakePolling: persistProviderIntakePolling
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    const waitingRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    const queuedWaitingRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });

    await vi.advanceTimersByTimeAsync(45_001);

    expect(providerIntakeState.polling).toMatchObject({
      checking: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    expect(persistProviderIntakePolling).toHaveBeenCalled();

    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    await expect(waitingRefresh).resolves.toMatchObject({
      queued: true,
      coalesced: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    await expect(queuedWaitingRefresh).resolves.toMatchObject({
      queued: true,
      coalesced: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });

    const refreshOutcome = await runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });
    expect(refreshOutcome).toMatchObject({
      queued: true,
      coalesced: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: true,
      queued: false,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });

    await vi.advanceTimersByTimeAsync(15_000);
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);
    expect(persistProviderIntake).not.toHaveBeenCalled();

    resolveRefresh?.();
    await closeControlServerPublicLifecycle(started);
  });

  it('extends the refresh watchdog from progress instead of total operation age', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T10:09:15.000Z'));

    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => {
        await firstRefresh;
      })
    };
    const persistProviderIntake = vi.fn(async () => undefined);
    const persistProviderIntakePolling = vi.fn(async () => undefined);
    const providerIntakeState = {
      schema_version: 1,
      updated_at: new Date(0).toISOString(),
      rehydrated_at: null,
      latest_provider_key: null,
      latest_reason: null,
      polling: null,
      claims: []
    };
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff,
      providerIntakeState,
      persist: {
        providerIntake: persistProviderIntake,
        providerIntakePolling: persistProviderIntakePolling
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(40_000);
    recordProviderPollingProgress(providerIssueHandoff, {
      phase: 'refresh:claim_issue_by_id_reconcile',
      requestClass: 'claim_issue_by_id:released_deferred',
      providerKeys: ['linear:7cedb707-d338-4e86-af14-02ed4d5070d6'],
      counts: {
        claims_scanned: 731,
        issue_by_id_deferred: 728
      },
      atMs: Date.now()
    });
    await vi.advanceTimersByTimeAsync(6_000);

    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: true,
      stuck: false,
      restart_required: false,
      operation_elapsed_ms: 46_000,
      progress_elapsed_ms: 6_000,
      refresh_phase: 'refresh:claim_issue_by_id_reconcile',
      refresh_request_class: 'claim_issue_by_id:released_deferred'
    });
    expect(providerIntakeState.polling).not.toMatchObject({
      restart_required: true
    });

    resolveRefresh?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      stuck: false,
      restart_required: false,
      last_error: null
    });

    await closeControlServerPublicLifecycle(started);
  });

  it('flushes stuck polling evidence before releasing waiting refresh callers', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T01:00:00.000Z'));

    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    let resolvePersistPolling: (() => void) | null = null;
    const persistPolling = new Promise<void>((resolve) => {
      resolvePersistPolling = resolve;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => {
        await firstRefresh;
      })
    };
    const persistProviderIntakePolling = vi.fn(async (polling: Record<string, unknown>) => {
      if (polling.stuck === true) {
        await persistPolling;
      }
    });
    const providerIntakeState = {
      schema_version: 1,
      updated_at: new Date(0).toISOString(),
      rehydrated_at: null,
      latest_provider_key: null,
      latest_reason: null,
      polling: null,
      claims: []
    };
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff,
      providerIntakeState,
      persist: {
        providerIntake: vi.fn(async () => undefined),
        providerIntakePolling: persistProviderIntakePolling
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    const waitingRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    let waitingRefreshOutcome: Awaited<typeof waitingRefresh> | null = null;
    void waitingRefresh.then((outcome) => {
      waitingRefreshOutcome = outcome;
    });

    await vi.advanceTimersByTimeAsync(45_001);

    expect(providerIntakeState.polling).toMatchObject({
      checking: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck',
      updated_at: expect.any(String)
    });
    expect(
      Date.parse(providerIntakeState.updated_at) >=
        Date.parse((providerIntakeState.polling as { updated_at?: string }).updated_at ?? '')
    ).toBe(true);
    expect(providerIntakeState.updated_at).not.toBe(new Date(0).toISOString());
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    expect(persistProviderIntakePolling).toHaveBeenCalledWith(
      expect.objectContaining({
        updated_at: providerIntakeState.updated_at
      }),
      providerIntakeState.updated_at
    );
    await Promise.resolve();
    expect(waitingRefreshOutcome).toBeNull();

    resolvePersistPolling?.();
    await expect(waitingRefresh).resolves.toMatchObject({
      queued: true,
      coalesced: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });

    resolveRefresh?.();
    await closeControlServerPublicLifecycle(started);
  });

  it('keeps provider intake updated_at monotonic when a queued polling snapshot is older than newer in-memory state', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T01:00:00.000Z'));

    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => {
        await firstRefresh;
      })
    };
    const persistProviderIntakePolling = vi.fn(async () => undefined);
    const providerIntakeState = {
      schema_version: 1,
      updated_at: new Date(0).toISOString(),
      rehydrated_at: null,
      latest_provider_key: null,
      latest_reason: null,
      polling: null,
      claims: []
    };
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff,
      providerIntakeState,
      persist: {
        providerIntake: vi.fn(async () => undefined),
        providerIntakePolling: persistProviderIntakePolling
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    providerIntakeState.updated_at = '2026-03-30T01:00:50.000Z';

    await vi.advanceTimersByTimeAsync(45_001);

    expect(providerIntakeState.updated_at).toBe('2026-03-30T01:00:50.000Z');
    expect(providerIntakeState.polling).toMatchObject({
      stuck: true,
      updated_at: '2026-03-30T01:00:45.000Z'
    });
    expect(persistProviderIntakePolling).toHaveBeenCalledWith(
      expect.objectContaining({
        updated_at: '2026-03-30T01:00:45.000Z'
      }),
      '2026-03-30T01:00:50.000Z'
    );

    resolveRefresh?.();
    await closeControlServerPublicLifecycle(started);
  });

  it('keeps the watchdog active while draining a queued follow-up refresh', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T01:00:00.000Z'));

    let resolveFirstRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveFirstRefresh = resolve;
    });
    let resolveSecondRefresh: (() => void) | null = null;
    const secondRefresh = new Promise<void>((resolve) => {
      resolveSecondRefresh = resolve;
    });
    let notifySecondRefreshStarted: (() => void) | null = null;
    const secondRefreshStarted = new Promise<void>((resolve) => {
      notifySecondRefreshStarted = resolve;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi
        .fn<() => Promise<void>>()
        .mockImplementationOnce(async () => {
          await firstRefresh;
        })
        .mockImplementationOnce(async () => {
          notifySecondRefreshStarted?.();
          await secondRefresh;
        })
    };
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    const queuedRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });

    resolveFirstRefresh?.();
    await secondRefreshStarted;
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(45_001);

    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    await expect(queuedRefresh).resolves.toMatchObject({
      queued: true,
      coalesced: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });

    resolveSecondRefresh?.();
    await closeControlServerPublicLifecycle(started);
  });

  it('uses the remaining stuck budget when the lifecycle attaches to an in-flight refresh', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T01:00:00.000Z'));

    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => {
        await firstRefresh;
      })
    };

    const inFlightRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_000);

    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_001);

    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    await expect(inFlightRefresh).resolves.toMatchObject({
      queued: true,
      coalesced: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });

    resolveRefresh?.();
    await closeControlServerPublicLifecycle(started);
  });

  it('signals stuck waiters when the trigger attaches after the refresh is already over budget', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T01:00:00.000Z'));

    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => {
        await firstRefresh;
      })
    };

    const waitingRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(45_001);

    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();

    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });
    await expect(waitingRefresh).resolves.toMatchObject({
      queued: true,
      coalesced: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });

    resolveRefresh?.();
    await closeControlServerPublicLifecycle(started);
  });

  it('returns stuck truth instead of accepted for public-route callers once the refresh is already stuck', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T01:00:00.000Z'));

    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => {
        await firstRefresh;
      })
    };

    const inFlightRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff);
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_000);

    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_001);

    await expect(
      runProviderIssueHandoffRefresh(providerIssueHandoff, {
        queueIfBusy: true,
        acknowledgeAccepted: true
      })
    ).resolves.toMatchObject({
      queued: true,
      coalesced: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });

    await expect(inFlightRefresh).resolves.toMatchObject({
      queued: true,
      coalesced: true,
      stuck: true,
      restart_required: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });

    resolveRefresh?.();
    await closeControlServerPublicLifecycle(started);
  });

  it('queues a follow-up refresh when a manual refresh request arrives during rehydrate', async () => {
    let resolveRehydrate: (() => void) | null = null;
    const rehydratePromise = new Promise<void>((resolve) => {
      resolveRehydrate = resolve;
    });
    const refresh = vi.fn(async () => undefined);
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {
        await rehydratePromise;
      }),
      refresh
    };

    const inFlightRehydrate = runProviderIssueHandoffRehydrate(providerIssueHandoff);
    const queuedRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });

    expect(refresh).not.toHaveBeenCalled();

    resolveRehydrate?.();
    await inFlightRehydrate;
    await queuedRefresh;

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps the provider refresh timer from overlapping an in-flight rehydrate', async () => {
    vi.useFakeTimers();

    let resolveRehydrate: (() => void) | null = null;
    const rehydratePromise = new Promise<void>((resolve) => {
      resolveRehydrate = resolve;
    });
    const refresh = vi.fn(async () => undefined);
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => {
        await rehydratePromise;
      }),
      refresh
    };
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(refresh).toHaveBeenCalledTimes(1);

    const rehydrate = runProviderIssueHandoffRehydrate(providerIssueHandoff);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    resolveRehydrate?.();
    await rehydrate;
    await started.triggerProviderRefresh?.();
    expect(refresh).toHaveBeenCalledTimes(2);

    await closeControlServerPublicLifecycle(started);
  });

  it('keeps interval-triggered recovery sweeps from overlapping the Linear fetch path when a fetch exceeds the interval', async () => {
    vi.useFakeTimers();

    let resolveTrackedIssues: (() => void) | null = null;
    const firstTrackedIssueFetch = new Promise<void>((resolve) => {
      resolveTrackedIssues = resolve;
    });
    const trackedIssue = buildTrackedIssue('issue-1');
    vi.mocked(resolveLiveLinearTrackedIssues)
      .mockImplementationOnce(async () => {
        await firstTrackedIssueFetch;
        return {
          kind: 'ready',
          tracked_issues: [trackedIssue]
        } as Awaited<ReturnType<typeof resolveLiveLinearTrackedIssues>>;
      })
      .mockResolvedValue({
        kind: 'ready',
        tracked_issues: [trackedIssue]
      } as Awaited<ReturnType<typeof resolveLiveLinearTrackedIssues>>);

    const poll = vi.fn(async () => undefined);
    const requestContextShared = {
      clients: new Set(),
      controlStore: {
        snapshot: () => ({ feature_toggles: {} })
      },
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff: {
        handleAcceptedTrackedIssue: vi.fn(),
        poll,
        rehydrate: vi.fn(async () => undefined),
        refresh: vi.fn(async () => undefined)
      }
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(1);
    expect(poll).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(15_000);
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(1);

    resolveTrackedIssues?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(poll).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(1);
    expect(poll).toHaveBeenCalledTimes(2);
    expect(poll).toHaveBeenNthCalledWith(2, {
      trackedIssues: [],
      refetchTrackedIssues: expect.any(Function),
      deferFreshDiscovery: true
    });

    await closeControlServerPublicLifecycle(started);
  });

  it('schedules the next provider refresh interval from completion time instead of a fixed timer phase', async () => {
    vi.useFakeTimers();

    let resolveRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi
        .fn<() => Promise<void>>()
        .mockImplementationOnce(async () => {
          await firstRefresh;
        })
        .mockImplementation(async () => undefined)
    };
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(20_000);
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    resolveRefresh?.();
    await vi.advanceTimersByTimeAsync(0);

    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      last_mode: 'refresh',
      next_poll_in_ms: 15_000
    });

    await vi.advanceTimersByTimeAsync(14_999);
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(2);

    await closeControlServerPublicLifecycle(started);
  });

  it('waits for a queued follow-up refresh to finish before re-arming the periodic timer', async () => {
    vi.useFakeTimers();

    let resolveFirstRefresh: (() => void) | null = null;
    const firstRefresh = new Promise<void>((resolve) => {
      resolveFirstRefresh = resolve;
    });
    let resolveSecondRefresh: (() => void) | null = null;
    const secondRefresh = new Promise<void>((resolve) => {
      resolveSecondRefresh = resolve;
    });
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi
        .fn<() => Promise<void>>()
        .mockImplementationOnce(async () => {
          await firstRefresh;
        })
        .mockImplementationOnce(async () => {
          await secondRefresh;
        })
        .mockImplementation(async () => undefined)
    };
    const requestContextShared = {
      clients: new Set(),
      eventTransport: { broadcast: vi.fn() },
      providerIssueHandoff
    } as unknown as ControlRequestSharedContext;
    const lifecycleState = {
      expiryLifecycle: { close: vi.fn() },
      bootstrapLifecycle: { close: vi.fn(async () => undefined) }
    } as unknown as ControlServerOwnedLifecycleState;
    const server = { kind: 'server' } as unknown as http.Server;

    vi.mocked(prepareControlServerStartupInputs).mockResolvedValue({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123'
    } satisfies PreparedControlServerStartupInputs);
    vi.mocked(startControlServerReadyInstanceLifecycle).mockResolvedValue({
      server,
      baseUrl: 'http://127.0.0.1:4545',
      lifecycleState
    });

    const started = await startControlServerPublicLifecycle({
      paths: { repoRoot: '/tmp/repo' } as RunPaths,
      config: { ui: { bindHost: '127.0.0.1' } } as unknown as EffectiveDelegationConfig,
      runId: 'run-1'
    });

    await flushStartupProviderRefresh();
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(1);

    const queuedRefresh = runProviderIssueHandoffRefresh(providerIssueHandoff, {
      queueIfBusy: true
    });

    await vi.advanceTimersByTimeAsync(20_000);
    resolveFirstRefresh?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(5_000);
    resolveSecondRefresh?.();
    await queuedRefresh;

    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      checking: false,
      last_mode: 'refresh',
      next_poll_in_ms: 15_000
    });

    await vi.advanceTimersByTimeAsync(14_999);
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(providerIssueHandoff.refresh).toHaveBeenCalledTimes(3);

    await closeControlServerPublicLifecycle(started);
  });
});

describe('closeControlServerPublicLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('delegates owned shutdown through the ready-instance lifecycle closer', async () => {
    const state = {
      server: { kind: 'server' } as unknown as http.Server,
      requestContextShared: { clients: new Set() } as unknown as ControlRequestSharedContext,
      lifecycleState: {
        expiryLifecycle: { close: vi.fn() },
        bootstrapLifecycle: { close: vi.fn(async () => undefined) }
      } as unknown as ControlServerOwnedLifecycleState
    } satisfies ControlServerPublicLifecycleState;

    await closeControlServerPublicLifecycle(state);

    expect(closeControlServerOwnedRuntime).toHaveBeenCalledWith({
      server: state.server,
      requestContextShared: state.requestContextShared,
      lifecycleState: state.lifecycleState,
      serverClosePromise: expect.any(Promise)
    });
    expect(beginClosingControlServerHttpServer).toHaveBeenCalledWith(state.server);
  });

  it('settles HTTP close and releases ownership when owned shutdown fails', async () => {
    let resolveServerClose: () => void = () => undefined;
    const serverClosePromise = new Promise<void>((resolve) => {
      resolveServerClose = resolve;
    });
    const closeError = new Error('owned close failed');
    const release = vi.fn(async () => undefined);
    vi.mocked(beginClosingControlServerHttpServer).mockReturnValueOnce(serverClosePromise);
    vi.mocked(closeControlServerOwnedRuntime).mockRejectedValueOnce(closeError);
    const state = {
      server: { kind: 'server' } as unknown as http.Server,
      requestContextShared: { clients: new Set() } as unknown as ControlRequestSharedContext,
      lifecycleState: {
        expiryLifecycle: { close: vi.fn() },
        bootstrapLifecycle: { close: vi.fn(async () => undefined) }
      } as unknown as ControlServerOwnedLifecycleState,
      controlHostOwnership: buildMockControlHostOwnershipHandle({ release })
    } satisfies ControlServerPublicLifecycleState;

    const closePromise = closeControlServerPublicLifecycle(state);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(release).not.toHaveBeenCalled();

    resolveServerClose();
    await expect(closePromise).rejects.toThrow('owned close failed');

    expect(beginClosingControlServerHttpServer).toHaveBeenCalledWith(state.server);
    expect(closeControlServerOwnedRuntime).toHaveBeenCalledWith({
      server: state.server,
      requestContextShared: state.requestContextShared,
      lifecycleState: state.lifecycleState,
      serverClosePromise
    });
    expect(release).toHaveBeenCalledOnce();
  });

  it('bounds shutdown when a stuck provider refresh never settles', async () => {
    const resetStuckRefreshLifecycle = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => {
        await new Promise<void>(() => undefined);
      }),
      resetStuckRefreshLifecycle
    };
    initializeProviderPollingHealth(providerIssueHandoff, {
      intervalMs: 15_000,
      stuckAfterMs: 1,
      skipInitialUpdate: true
    });
    await runProviderIssueHandoffRefresh(providerIssueHandoff, {
      acknowledgeAccepted: true
    });
    const state = {
      server: { kind: 'server' } as unknown as http.Server,
      requestContextShared: {
        clients: new Set(),
        providerIssueHandoff
      } as unknown as ControlRequestSharedContext,
      lifecycleState: {
        expiryLifecycle: { close: vi.fn() },
        bootstrapLifecycle: { close: vi.fn(async () => undefined) }
      } as unknown as ControlServerOwnedLifecycleState
    } satisfies ControlServerPublicLifecycleState;

    await markProviderPollingStuck(providerIssueHandoff);
    expect(readProviderPollingHealth(providerIssueHandoff)).toMatchObject({
      stuck: true,
      reason: 'provider_refresh_lifecycle_stuck'
    });

    const closePromise = closeControlServerPublicLifecycle(state);
    await expect(closePromise).resolves.toBeUndefined();

    expect(resetStuckRefreshLifecycle).toHaveBeenCalledOnce();
    expect(closeControlServerOwnedRuntime).toHaveBeenCalledWith({
      server: state.server,
      requestContextShared: state.requestContextShared,
      lifecycleState: state.lifecycleState,
      serverClosePromise: expect.any(Promise)
    });
  });

  it('preserves persisted queued provider retry ownership across shutdown', async () => {
    const persistProviderIntake = vi.fn(async () => undefined);
    const requestContextShared = {
      clients: new Set(),
      providerIntakeState: {
        updated_at: '2026-03-22T00:00:00.000Z',
        claims: [
          {
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
            run_manifest_path: '/tmp/provider-run/completed-manifest.json',
            launch_source: null,
            launch_token: null,
            retry_queued: true,
            retry_attempt: 1,
            retry_due_at: '2026-03-22T00:05:00.000Z',
            retry_error: null
          }
        ]
      },
      persist: {
        providerIntake: persistProviderIntake
      }
    } as unknown as ControlRequestSharedContext;
    const state = {
      server: { kind: 'server' } as unknown as http.Server,
      requestContextShared,
      lifecycleState: {
        expiryLifecycle: { close: vi.fn() },
        bootstrapLifecycle: { close: vi.fn(async () => undefined) }
      } as unknown as ControlServerOwnedLifecycleState
    } satisfies ControlServerPublicLifecycleState;

    await closeControlServerPublicLifecycle(state);

    expect(requestContextShared.providerIntakeState?.claims[0]).toMatchObject({
      retry_queued: true,
      retry_attempt: 1,
      retry_due_at: '2026-03-22T00:05:00.000Z',
      retry_error: null
    });
    expect(persistProviderIntake).not.toHaveBeenCalled();
    expect(closeControlServerOwnedRuntime).toHaveBeenCalledWith({
      server: state.server,
      requestContextShared: state.requestContextShared,
      lifecycleState: state.lifecycleState,
      serverClosePromise: expect.any(Promise)
    });
    expect(beginClosingControlServerHttpServer).toHaveBeenCalledWith(state.server);
  });
});
