import http from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ControlExpiryLifecycle } from '../src/cli/control/controlExpiryLifecycle.js';
import type { ControlRequestSharedContext } from '../src/cli/control/controlRequestContext.js';
import { createBoundControlServerRequestShell } from '../src/cli/control/controlServerRequestShellBinding.js';
import {
  closeControlServerOwnedRuntime,
  startControlServerReadyInstanceLifecycle
} from '../src/cli/control/controlServerReadyInstanceLifecycle.js';
import type { ControlServerBootstrapLifecycle } from '../src/cli/control/controlServerBootstrapLifecycle.js';
import { startControlServerReadyInstanceStartup } from '../src/cli/control/controlServerReadyInstanceStartup.js';

vi.mock('../src/cli/control/controlServerRequestShellBinding.js', () => ({
  createBoundControlServerRequestShell: vi.fn()
}));

vi.mock('../src/cli/control/controlServerReadyInstanceStartup.js', () => ({
  startControlServerReadyInstanceStartup: vi.fn()
}));

describe('startControlServerReadyInstanceLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps request-shell readers live while pending and publishes bootstrap handles before startup resolves', async () => {
    const server = { kind: 'server' } as unknown as http.Server;
    const requestContextShared = {
      clients: new Set()
    } as unknown as ControlRequestSharedContext;
    const expiryLifecycle = {
      close: vi.fn(),
      start: vi.fn(),
      expireConfirmations: vi.fn(async () => undefined),
      expireQuestions: vi.fn(async () => undefined)
    } as unknown as ControlExpiryLifecycle;
    const bootstrapLifecycle = {
      start: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined)
    } as unknown as ControlServerBootstrapLifecycle;
    const order: string[] = [];

    vi.mocked(createBoundControlServerRequestShell).mockReturnValue(server);
    vi.mocked(startControlServerReadyInstanceStartup).mockImplementation(async (options) => {
      const [[requestShellOptions]] = vi.mocked(createBoundControlServerRequestShell).mock.calls;
      order.push('startup');
      expect(requestShellOptions.readRequestContextShared()).toBe(requestContextShared);
      expect(requestShellOptions.readExpiryLifecycle()).toBeNull();
      options.onBootstrapAssembly({ expiryLifecycle, bootstrapLifecycle });
      order.push('publish');
      expect(requestShellOptions.readExpiryLifecycle()).toBe(expiryLifecycle);
      return 'http://127.0.0.1:4321';
    });

    const readyInstance = await startControlServerReadyInstanceLifecycle({
      requestContextShared,
      host: '127.0.0.1',
      controlToken: 'token-123',
      intervalMs: 15_000
    });

    expect(readyInstance).toMatchObject({
      server,
      baseUrl: 'http://127.0.0.1:4321',
      lifecycleState: {
        expiryLifecycle,
        bootstrapLifecycle
      }
    });
    const [[requestShellOptions]] = vi.mocked(createBoundControlServerRequestShell).mock.calls;
    readyInstance.lifecycleState.expiryLifecycle = null;
    expect(requestShellOptions.readExpiryLifecycle()).toBeNull();

    expect(createBoundControlServerRequestShell).toHaveBeenCalledOnce();
    expect(startControlServerReadyInstanceStartup).toHaveBeenCalledWith({
      server,
      requestContextShared,
      intervalMs: 15_000,
      host: '127.0.0.1',
      controlToken: 'token-123',
      onBootstrapAssembly: expect.any(Function),
      closeOnFailure: expect.any(Function)
    });
    expect(order).toEqual(['startup', 'publish']);
  });

  it('rolls back the owned runtime through closeOnFailure when startup fails after bootstrap publication', async () => {
    const order: string[] = [];
    const requestContextShared = {
      clients: new Set([
        {
          end: vi.fn(() => {
            order.push('client');
          })
        } as unknown as http.ServerResponse
      ])
    } as unknown as ControlRequestSharedContext;
    const server = {
      close: vi.fn((callback?: () => void) => {
        order.push('server');
        callback?.();
        return server;
      })
    } as unknown as http.Server;
    const expiryLifecycle = {
      close: vi.fn(() => {
        order.push('expiry');
      }),
      start: vi.fn(),
      expireConfirmations: vi.fn(async () => undefined),
      expireQuestions: vi.fn(async () => undefined)
    } as unknown as ControlExpiryLifecycle;
    const bootstrapLifecycle = {
      start: vi.fn(async () => undefined),
      close: vi.fn(async () => {
        order.push('bootstrap');
      })
    } as unknown as ControlServerBootstrapLifecycle;

    vi.mocked(createBoundControlServerRequestShell).mockReturnValue(server);
    vi.mocked(startControlServerReadyInstanceStartup).mockImplementation(async (options) => {
      options.onBootstrapAssembly({ expiryLifecycle, bootstrapLifecycle });
      await options.closeOnFailure();
      throw new Error('startup-failed');
    });

    await expect(
      startControlServerReadyInstanceLifecycle({
        requestContextShared,
        host: '127.0.0.1',
        controlToken: 'token-123',
        intervalMs: 15_000
      })
    ).rejects.toThrow('startup-failed');

    expect(order).toEqual(['expiry', 'bootstrap', 'client', 'server']);
  });

  it('fails when startup resolves without publishing bootstrap assembly', async () => {
    const server = { kind: 'server' } as unknown as http.Server;
    const requestContextShared = {
      clients: new Set()
    } as unknown as ControlRequestSharedContext;

    vi.mocked(createBoundControlServerRequestShell).mockReturnValue(server);
    vi.mocked(startControlServerReadyInstanceStartup).mockResolvedValue('http://127.0.0.1:4321');

    await expect(
      startControlServerReadyInstanceLifecycle({
        requestContextShared,
        host: '127.0.0.1',
        controlToken: 'token-123',
        intervalMs: 15_000
      })
    ).rejects.toThrow('Control server ready instance startup did not publish bootstrap assembly');
  });
});

describe('closeControlServerOwnedRuntime', () => {
  it('closes owned runtime state in order and clears lifecycle handles', async () => {
    const order: string[] = [];
    let expiryLifecycle: ControlExpiryLifecycle | null = {
      close: vi.fn(() => {
        order.push('expiry');
      }),
      start: vi.fn(),
      expireConfirmations: vi.fn(async () => undefined),
      expireQuestions: vi.fn(async () => undefined)
    };
    let bootstrapLifecycle: ControlServerBootstrapLifecycle | null = {
      start: vi.fn(async () => undefined),
      close: vi.fn(async () => {
        order.push('bootstrap');
      })
    };
    const client = {
      end: vi.fn(() => {
        order.push('client');
      })
    } as unknown as http.ServerResponse;
    const server = {
      close: vi.fn((callback?: () => void) => {
        order.push('server');
        callback?.();
        return server;
      })
    } as unknown as http.Server;

    await closeControlServerOwnedRuntime({
      server,
      requestContextShared: { clients: new Set([client]) },
      lifecycleState: {
        get expiryLifecycle() {
          return expiryLifecycle;
        },
        set expiryLifecycle(value) {
          expiryLifecycle = value;
        },
        get bootstrapLifecycle() {
          return bootstrapLifecycle;
        },
        set bootstrapLifecycle(value) {
          bootstrapLifecycle = value;
        }
      }
    });

    expect(order).toEqual(['expiry', 'bootstrap', 'client', 'server']);
    expect(expiryLifecycle).toBeNull();
    expect(bootstrapLifecycle).toBeNull();
  });
});
