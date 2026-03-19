import http from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createControlBootstrapAssembly } from '../src/cli/control/controlBootstrapAssembly.js';
import type { ControlRequestSharedContext } from '../src/cli/control/controlRequestContext.js';
import { emitDispatchPilotAuditEvents } from '../src/cli/control/controlServerAuditAndErrorHelpers.js';
import { startControlServerReadyInstanceStartup } from '../src/cli/control/controlServerReadyInstanceStartup.js';
import { startControlServerStartupSequence } from '../src/cli/control/controlServerStartupSequence.js';

vi.mock('../src/cli/control/controlBootstrapAssembly.js', () => ({
  createControlBootstrapAssembly: vi.fn()
}));

vi.mock('../src/cli/control/controlServerStartupSequence.js', () => ({
  startControlServerStartupSequence: vi.fn()
}));

describe('startControlServerReadyInstanceStartup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assembles bootstrap state and startup sequencing into one ready bundle', async () => {
    const server = { kind: 'server' } as unknown as http.Server;
    const requestContextShared = {
      kind: 'request-context-shared'
    } as unknown as ControlRequestSharedContext;
    const bootstrapAssembly = {
      expiryLifecycle: { kind: 'expiry-lifecycle' },
      bootstrapLifecycle: { kind: 'bootstrap-lifecycle' }
    };
    const onBootstrapAssembly = vi.fn();
    const closeOnFailure = vi.fn(async () => undefined);

    vi.mocked(createControlBootstrapAssembly).mockReturnValue(bootstrapAssembly);
    vi.mocked(startControlServerStartupSequence).mockResolvedValue('http://127.0.0.1:4321');

    await expect(
      startControlServerReadyInstanceStartup({
        server,
        requestContextShared,
        intervalMs: 15_000,
        host: '127.0.0.1',
        controlToken: 'token-123',
        onBootstrapAssembly,
        closeOnFailure
      })
    ).resolves.toBe('http://127.0.0.1:4321');

    expect(createControlBootstrapAssembly).toHaveBeenCalledWith({
      intervalMs: 15_000,
      requestContextShared,
      emitDispatchPilotAuditEvents
    });
    expect(onBootstrapAssembly).toHaveBeenCalledWith(bootstrapAssembly);
    expect(startControlServerStartupSequence).toHaveBeenCalledWith({
      server,
      host: '127.0.0.1',
      bootstrapLifecycle: bootstrapAssembly.bootstrapLifecycle,
      controlToken: 'token-123',
      closeOnFailure
    });
  });

  it('does not invoke startup sequencing when bootstrap assembly fails', async () => {
    const server = { kind: 'server' } as unknown as http.Server;
    const requestContextShared = {
      kind: 'request-context-shared'
    } as unknown as ControlRequestSharedContext;

    vi.mocked(createControlBootstrapAssembly).mockImplementation(() => {
      throw new Error('bootstrap-assembly-failed');
    });

    await expect(
      startControlServerReadyInstanceStartup({
        server,
        requestContextShared,
        intervalMs: 15_000,
        host: '127.0.0.1',
        controlToken: 'token-123',
        onBootstrapAssembly: () => undefined,
        closeOnFailure: async () => undefined
      })
    ).rejects.toThrow('bootstrap-assembly-failed');
    expect(startControlServerStartupSequence).not.toHaveBeenCalled();
  });

  it('publishes the bootstrap assembly before startup sequencing begins', async () => {
    const server = { kind: 'server' } as unknown as http.Server;
    const requestContextShared = {
      kind: 'request-context-shared'
    } as unknown as ControlRequestSharedContext;
    const order: string[] = [];
    const bootstrapAssembly = {
      expiryLifecycle: { kind: 'expiry-lifecycle' },
      bootstrapLifecycle: { kind: 'bootstrap-lifecycle' }
    };

    vi.mocked(createControlBootstrapAssembly).mockImplementation(() => {
      order.push('bootstrap');
      return bootstrapAssembly;
    });
    vi.mocked(startControlServerStartupSequence).mockImplementation(async () => {
      order.push('startup');
      return 'http://127.0.0.1:4321';
    });

    await startControlServerReadyInstanceStartup({
      server,
      requestContextShared,
      intervalMs: 15_000,
      host: '127.0.0.1',
      controlToken: 'token-123',
      onBootstrapAssembly: () => {
        order.push('attach');
      },
      closeOnFailure: async () => undefined
    });

    expect(order).toEqual(['bootstrap', 'attach', 'startup']);
  });
});
