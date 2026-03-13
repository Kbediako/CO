import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createControlTelegramBridgeBootstrapLifecycle
} from '../src/cli/control/controlTelegramBridgeBootstrapLifecycle.js';
import { createControlOversightFacade } from '../src/cli/control/controlOversightFacade.js';
import { createControlTelegramBridgeLifecycle } from '../src/cli/control/controlTelegramBridgeLifecycle.js';
import {
  createControlServerBootstrapLifecycle
} from '../src/cli/control/controlServerBootstrapLifecycle.js';

vi.mock('../src/cli/control/controlServerBootstrapLifecycle.js', () => ({
  createControlServerBootstrapLifecycle: vi.fn()
}));

vi.mock('../src/cli/control/controlTelegramBridgeLifecycle.js', () => ({
  createControlTelegramBridgeLifecycle: vi.fn()
}));

vi.mock('../src/cli/control/controlOversightFacade.js', () => ({
  createControlOversightFacade: vi.fn()
}));

describe('ControlTelegramBridgeBootstrapLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the generic bootstrap lifecycle with a lazy oversight-facade closure', () => {
    const lifecycle = { start: vi.fn(), close: vi.fn() };
    const telegramBridgeLifecycle = { start: vi.fn(), close: vi.fn() };
    vi.mocked(createControlServerBootstrapLifecycle).mockReturnValue(lifecycle as never);
    vi.mocked(createControlTelegramBridgeLifecycle).mockReturnValue(telegramBridgeLifecycle as never);
    vi.mocked(createControlOversightFacade).mockReturnValue({
      readSelectedRun: vi.fn(),
      readDispatch: vi.fn(),
      readQuestions: vi.fn(),
      subscribe: vi.fn()
    } as never);

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
    expect(bridgeLifecycleInput?.createOversightFacade).toBeTypeOf('function');
    expect(createControlOversightFacade).not.toHaveBeenCalled();

    bridgeLifecycleInput?.createOversightFacade();
    expect(createControlOversightFacade).toHaveBeenCalledWith({
      ...requestContextShared,
      expiryLifecycle,
      emitDispatchPilotAuditEvents
    });

    expiryLifecycle = null as never;
    bridgeLifecycleInput?.createOversightFacade();
    expect(createControlOversightFacade).toHaveBeenLastCalledWith({
      ...requestContextShared,
      expiryLifecycle: null,
      emitDispatchPilotAuditEvents
    });
  });
});
