import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createControlTelegramBridgeOversightFacadeFactory
} from '../src/cli/control/controlTelegramBridgeOversightFacadeFactory.js';
import { createControlOversightFacade } from '../src/cli/control/controlOversightFacade.js';

vi.mock('../src/cli/control/controlOversightFacade.js', () => ({
  createControlOversightFacade: vi.fn()
}));

describe('createControlTelegramBridgeOversightFacadeFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lazily creates the oversight facade and rereads expiry lifecycle on every call', () => {
    const facadeOne = {
      readSelectedRun: vi.fn(),
      readDispatch: vi.fn(),
      readQuestions: vi.fn(),
      subscribe: vi.fn()
    };
    const facadeTwo = {
      readSelectedRun: vi.fn(),
      readDispatch: vi.fn(),
      readQuestions: vi.fn(),
      subscribe: vi.fn()
    };
    vi.mocked(createControlOversightFacade)
      .mockReturnValueOnce(facadeOne as never)
      .mockReturnValueOnce(facadeTwo as never);

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
    const getExpiryLifecycle = vi.fn();
    let expiryLifecycle = { start: vi.fn() } as never;
    getExpiryLifecycle.mockImplementation(() => expiryLifecycle);

    const createOversightFacade = createControlTelegramBridgeOversightFacadeFactory({
      requestContextShared: requestContextShared as never,
      getExpiryLifecycle,
      emitDispatchPilotAuditEvents
    });

    expect(createControlOversightFacade).not.toHaveBeenCalled();

    expect(createOversightFacade()).toBe(facadeOne);
    expect(createControlOversightFacade).toHaveBeenNthCalledWith(1, {
      ...requestContextShared,
      expiryLifecycle,
      emitDispatchPilotAuditEvents
    });

    expiryLifecycle = null as never;
    expect(createOversightFacade()).toBe(facadeTwo);
    expect(getExpiryLifecycle).toHaveBeenCalledTimes(2);
    expect(createControlOversightFacade).toHaveBeenNthCalledWith(2, {
      ...requestContextShared,
      expiryLifecycle: null,
      emitDispatchPilotAuditEvents
    });
  });
});
