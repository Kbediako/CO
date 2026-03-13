import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createControlTelegramBridgeBootstrapLifecycle
} from '../src/cli/control/controlTelegramBridgeBootstrapLifecycle.js';
import { createControlTelegramBridgeLifecycle } from '../src/cli/control/controlTelegramBridgeLifecycle.js';
import {
  createControlTelegramBridgeOversightFacadeFactory
} from '../src/cli/control/controlTelegramBridgeOversightFacadeFactory.js';
import {
  createControlServerBootstrapLifecycle
} from '../src/cli/control/controlServerBootstrapLifecycle.js';

vi.mock('../src/cli/control/controlServerBootstrapLifecycle.js', () => ({
  createControlServerBootstrapLifecycle: vi.fn()
}));

vi.mock('../src/cli/control/controlTelegramBridgeLifecycle.js', () => ({
  createControlTelegramBridgeLifecycle: vi.fn()
}));

vi.mock('../src/cli/control/controlTelegramBridgeOversightFacadeFactory.js', () => ({
  createControlTelegramBridgeOversightFacadeFactory: vi.fn()
}));

describe('ControlTelegramBridgeBootstrapLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the generic bootstrap lifecycle with the extracted lazy oversight-factory wiring', () => {
    const lifecycle = { start: vi.fn(), close: vi.fn() };
    const telegramBridgeLifecycle = { start: vi.fn(), close: vi.fn() };
    const createOversightFacade = vi.fn();
    vi.mocked(createControlServerBootstrapLifecycle).mockReturnValue(lifecycle as never);
    vi.mocked(createControlTelegramBridgeLifecycle).mockReturnValue(telegramBridgeLifecycle as never);
    vi.mocked(createControlTelegramBridgeOversightFacadeFactory).mockReturnValue(
      createOversightFacade as never
    );

    const emitDispatchPilotAuditEvents = vi.fn(async () => undefined);
    const requestContextShared = {
      token: 'token',
      controlStore: {} as never,
      confirmationStore: {} as never,
      questionQueue: {} as never,
      delegationTokens: {} as never,
      sessionTokens: {} as never,
      config: {} as never,
      persist: {} as never,
      clients: new Set(),
      eventTransport: {} as never,
      paths: {} as never,
      linearAdvisoryState: {} as never,
      runtime: {} as never
    };
    let expiryLifecycle = { start: vi.fn() } as never;

    const result = createControlTelegramBridgeBootstrapLifecycle({
      paths: {
        runDir: '/tmp/run',
        controlAuthPath: '/tmp/run/control-auth.json',
        controlEndpointPath: '/tmp/run/control-endpoint.json'
      },
      persistControl: async () => undefined,
      startExpiryLifecycle: () => undefined,
      requestContextShared: requestContextShared as never,
      getExpiryLifecycle: () => expiryLifecycle,
      emitDispatchPilotAuditEvents
    });

    expect(result).toBe(lifecycle);
    expect(createControlServerBootstrapLifecycle).toHaveBeenCalledOnce();

    const input = vi.mocked(createControlServerBootstrapLifecycle).mock.calls[0]?.[0];
    expect(input?.paths).toEqual({
      controlAuthPath: '/tmp/run/control-auth.json',
      controlEndpointPath: '/tmp/run/control-endpoint.json'
    });
    expect(input?.telegramBridgeLifecycle).toBe(telegramBridgeLifecycle);

    const bridgeLifecycleInput = vi.mocked(createControlTelegramBridgeLifecycle).mock.calls[0]?.[0];
    expect(bridgeLifecycleInput?.runDir).toBe('/tmp/run');
    expect(bridgeLifecycleInput?.createOversightFacade).toBe(createOversightFacade);

    const oversightFactoryInput = vi.mocked(createControlTelegramBridgeOversightFacadeFactory).mock.calls[0]?.[0];
    expect(oversightFactoryInput?.requestContextShared).toBe(requestContextShared);
    expect(oversightFactoryInput?.emitDispatchPilotAuditEvents).toBe(emitDispatchPilotAuditEvents);
    expect(oversightFactoryInput?.getExpiryLifecycle()).toBe(expiryLifecycle);
    expiryLifecycle = null as never;
    expect(oversightFactoryInput?.getExpiryLifecycle()).toBeNull();
  });

  it('preserves the bootstrap context receiver for getExpiryLifecycle when wiring the helper', () => {
    const lifecycle = { start: vi.fn(), close: vi.fn() };
    const telegramBridgeLifecycle = { start: vi.fn(), close: vi.fn() };
    const createOversightFacade = vi.fn();
    vi.mocked(createControlServerBootstrapLifecycle).mockReturnValue(lifecycle as never);
    vi.mocked(createControlTelegramBridgeLifecycle).mockReturnValue(telegramBridgeLifecycle as never);
    vi.mocked(createControlTelegramBridgeOversightFacadeFactory).mockReturnValue(
      createOversightFacade as never
    );

    const bootstrapContext = {
      paths: {
        runDir: '/tmp/run',
        controlAuthPath: '/tmp/run/control-auth.json',
        controlEndpointPath: '/tmp/run/control-endpoint.json'
      },
      persistControl: async () => undefined,
      startExpiryLifecycle: () => undefined,
      requestContextShared: {
        token: 'token',
        controlStore: {} as never,
        confirmationStore: {} as never,
        questionQueue: {} as never,
        delegationTokens: {} as never,
        sessionTokens: {} as never,
        config: {} as never,
        persist: {} as never,
        clients: new Set(),
        eventTransport: {} as never,
        paths: {} as never,
        linearAdvisoryState: {} as never,
        runtime: {} as never
      } as never,
      expiryLifecycle: { start: vi.fn() } as never,
      getExpiryLifecycle() {
        return this.expiryLifecycle;
      },
      emitDispatchPilotAuditEvents: vi.fn(async () => undefined)
    };

    createControlTelegramBridgeBootstrapLifecycle(bootstrapContext as never);

    const oversightFactoryInput = vi.mocked(createControlTelegramBridgeOversightFacadeFactory).mock.calls[0]?.[0];
    expect(oversightFactoryInput?.getExpiryLifecycle()).toBe(bootstrapContext.expiryLifecycle);

    bootstrapContext.expiryLifecycle = null as never;
    expect(oversightFactoryInput?.getExpiryLifecycle()).toBeNull();
  });
});
