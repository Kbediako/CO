import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createControlTelegramBridgeBootstrapLifecycle
} from '../src/cli/control/controlTelegramBridgeBootstrapLifecycle.js';
import {
  createControlServerBootstrapLifecycle
} from '../src/cli/control/controlServerBootstrapLifecycle.js';
import { createControlTelegramReadAdapter } from '../src/cli/control/controlTelegramReadAdapter.js';

vi.mock('../src/cli/control/controlServerBootstrapLifecycle.js', () => ({
  createControlServerBootstrapLifecycle: vi.fn()
}));

vi.mock('../src/cli/control/controlTelegramReadAdapter.js', () => ({
  createControlTelegramReadAdapter: vi.fn()
}));

describe('ControlTelegramBridgeBootstrapLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the generic bootstrap lifecycle with a lazy Telegram read-adapter closure', () => {
    const lifecycle = { start: vi.fn(), close: vi.fn() };
    vi.mocked(createControlServerBootstrapLifecycle).mockReturnValue(lifecycle as never);
    vi.mocked(createControlTelegramReadAdapter).mockReturnValue({
      readSelectedRun: vi.fn(),
      readDispatch: vi.fn(),
      readQuestions: vi.fn()
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
      controlRuntime: { subscribe: vi.fn() } as never,
      requestContextShared: requestContextShared as never,
      getExpiryLifecycle: () => expiryLifecycle,
      emitDispatchPilotAuditEvents
    });

    expect(result).toBe(lifecycle);
    expect(createControlServerBootstrapLifecycle).toHaveBeenCalledOnce();

    const input = vi.mocked(createControlServerBootstrapLifecycle).mock.calls[0]?.[0];
    expect(input?.paths).toEqual({
      runDir: '/tmp/run',
      controlAuthPath: '/tmp/run/control-auth.json',
      controlEndpointPath: '/tmp/run/control-endpoint.json'
    });

    input?.createTelegramReadAdapter();
    expect(createControlTelegramReadAdapter).toHaveBeenCalledWith({
      ...requestContextShared,
      expiryLifecycle,
      emitDispatchPilotAuditEvents
    });

    expiryLifecycle = null as never;
    input?.createTelegramReadAdapter();
    expect(createControlTelegramReadAdapter).toHaveBeenLastCalledWith({
      ...requestContextShared,
      expiryLifecycle: null,
      emitDispatchPilotAuditEvents
    });
  });
});
