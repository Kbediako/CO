import http from 'node:http';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EffectiveDelegationConfig } from '../src/config/delegationConfig.js';
import type { RunPaths } from '../src/run/runPaths.js';
import type { ControlRequestSharedContext } from '../src/cli/control/controlRequestContext.js';
import {
  closeControlServerOwnedRuntime,
  startControlServerReadyInstanceLifecycle,
  type ControlServerOwnedLifecycleState
} from '../src/cli/control/controlServerReadyInstanceLifecycle.js';
import {
  closeControlServerPublicLifecycle,
  startControlServerPublicLifecycle,
  type ControlServerPublicLifecycleState
} from '../src/cli/control/controlServerPublicLifecycle.js';
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

describe('startControlServerPublicLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
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

  it('schedules a provider refresh timer when provider handoff is present and clears it on shutdown', async () => {
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

    await vi.advanceTimersByTimeAsync(15_000);
    expect(requestContextShared.providerIssueHandoff?.refresh).toHaveBeenCalledTimes(1);

    await closeControlServerPublicLifecycle(started);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(requestContextShared.providerIssueHandoff?.refresh).toHaveBeenCalledTimes(1);
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
