import http from 'node:http';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EffectiveDelegationConfig } from '../src/config/delegationConfig.js';
import type { RunPaths } from '../src/run/runPaths.js';
import type { ControlRequestSharedContext } from '../src/cli/control/controlRequestContext.js';
import type { LiveLinearTrackedIssue } from '../src/cli/control/linearDispatchSource.js';
import {
  closeControlServerOwnedRuntime,
  startControlServerReadyInstanceLifecycle,
  type ControlServerOwnedLifecycleState
} from '../src/cli/control/controlServerReadyInstanceLifecycle.js';
import {
  closeControlServerPublicLifecycle,
  runProviderIssueHandoffRefresh,
  runProviderIssueHandoffRehydrate,
  startControlServerPublicLifecycle,
  type ControlServerPublicLifecycleState
} from '../src/cli/control/controlServerPublicLifecycle.js';
import { resolveLiveLinearTrackedIssues } from '../src/cli/control/linearDispatchSource.js';
import { resolveLinearWebhookSourceSetup } from '../src/cli/control/linearWebhookController.js';
import {
  prepareControlServerStartupInputs,
  type PreparedControlServerStartupInputs
} from '../src/cli/control/controlServerStartupInputPreparation.js';

vi.mock('../src/cli/control/controlServerStartupInputPreparation.js', () => ({
  prepareControlServerStartupInputs: vi.fn()
}));

vi.mock('../src/cli/control/controlServerReadyInstanceLifecycle.js', () => ({
  startControlServerReadyInstanceLifecycle: vi.fn(),
  closeControlServerOwnedRuntime: vi.fn()
}));

vi.mock('../src/cli/control/linearDispatchSource.js', () => ({
  resolveLiveLinearTrackedIssues: vi.fn()
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
    workspace_id: null,
    team_id: null,
    team_key: null,
    team_name: null,
    project_id: null,
    project_name: null,
    updated_at: '2026-03-22T00:00:00.000Z',
    recent_activity: []
  };
}

async function flushStartupProviderRefresh(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

describe('startControlServerPublicLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(resolveLinearWebhookSourceSetup).mockReturnValue({
      sourceSetup: {} as never
    });
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

  it('coalesces startup-triggered, startup-refresh-triggered, and interval-triggered bulk polls before issuing another Linear fetch', async () => {
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

    await vi.advanceTimersByTimeAsync(15_000);
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(2);
    expect(poll).toHaveBeenCalledTimes(2);

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

  it('keeps interval-triggered bulk polls from overlapping the Linear fetch path when a fetch exceeds the interval', async () => {
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
    expect(resolveLiveLinearTrackedIssues).toHaveBeenCalledTimes(2);
    expect(poll).toHaveBeenCalledTimes(2);

    await closeControlServerPublicLifecycle(started);
  });
});

describe('closeControlServerPublicLifecycle', () => {
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
      lifecycleState: state.lifecycleState
    });
  });
});
