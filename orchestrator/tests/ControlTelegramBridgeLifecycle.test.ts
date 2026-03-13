import { describe, expect, it, vi } from 'vitest';

import { createControlTelegramBridgeLifecycle } from '../src/cli/control/controlTelegramBridgeLifecycle.js';

function createOversightFacade() {
  return {
    readSelectedRun: vi.fn(async () => ({
      selected: null,
      dispatchPilot: null,
      tracked: null
    })),
    readDispatch: vi.fn(async () => ({})),
    readQuestions: vi.fn(async () => ({ questions: [] })),
    subscribe: vi.fn(() => () => undefined)
  };
}

describe('createControlTelegramBridgeLifecycle', () => {
  it('propagates telegram bridge startup failure to the caller', async () => {
    const oversightFacade = createOversightFacade();
    const lifecycle = createControlTelegramBridgeLifecycle({
      runDir: '/tmp/run',
      createOversightFacade: () => oversightFacade,
      startTelegramBridgeImpl: vi.fn(async () => {
        throw new Error('bridge-boom');
      })
    });

    await expect(
      lifecycle.start({
        baseUrl: 'http://127.0.0.1:4321',
        controlToken: 'token-1'
      })
    ).rejects.toThrow('bridge-boom');

    expect(oversightFacade.subscribe).not.toHaveBeenCalled();
  });

  it('unsubscribes before closing the telegram bridge', async () => {
    const order: string[] = [];
    const oversightFacade = createOversightFacade();
    let listener: ((input?: { eventSeq?: number | null; source?: string | null }) => Promise<void> | void) | null =
      null;
    oversightFacade.subscribe = vi.fn((nextListener) => {
      order.push('subscribe');
      listener = nextListener;
      return () => {
        order.push('unsubscribe');
      };
    });
    const bridge = {
      notifyProjectionDelta: vi.fn(async () => undefined),
      close: vi.fn(async () => {
        order.push('close');
      })
    };
    const startTelegramBridgeImpl = vi.fn(async (input: { readAdapter: unknown }) => {
      expect(input.readAdapter).toBe(oversightFacade);
      return bridge;
    });
    const lifecycle = createControlTelegramBridgeLifecycle({
      runDir: '/tmp/run',
      createOversightFacade: () => oversightFacade,
      startTelegramBridgeImpl
    });

    await lifecycle.start({
      baseUrl: 'http://127.0.0.1:4321',
      controlToken: 'token-1'
    });
    const projectionInput = { eventSeq: 42, source: 'runtime' } as const;
    await listener?.(projectionInput);
    await lifecycle.close();

    expect(order).toEqual(['subscribe', 'unsubscribe', 'close']);
    expect(bridge.close).toHaveBeenCalledOnce();
    expect(oversightFacade.subscribe).toHaveBeenCalledOnce();
    expect(startTelegramBridgeImpl).toHaveBeenCalledOnce();
    expect(bridge.notifyProjectionDelta).toHaveBeenCalledWith(projectionInput);
  });

  it('closes the bridge and propagates subscription wiring failure', async () => {
    const oversightFacade = createOversightFacade();
    oversightFacade.subscribe = vi.fn(() => {
      throw new Error('subscribe-boom');
    });
    const bridge = {
      notifyProjectionDelta: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined)
    };
    const lifecycle = createControlTelegramBridgeLifecycle({
      runDir: '/tmp/run',
      createOversightFacade: () => oversightFacade,
      startTelegramBridgeImpl: vi.fn(async () => bridge)
    });

    await expect(
      lifecycle.start({
        baseUrl: 'http://127.0.0.1:4321',
        controlToken: 'token-1'
      })
    ).rejects.toThrow('subscribe-boom');

    expect(bridge.close).toHaveBeenCalledOnce();
  });

  it('does not subscribe when the telegram bridge is disabled by config', async () => {
    const oversightFacade = createOversightFacade();
    const lifecycle = createControlTelegramBridgeLifecycle({
      runDir: '/tmp/run',
      createOversightFacade: () => oversightFacade,
      startTelegramBridgeImpl: vi.fn(async () => null)
    });

    await expect(
      lifecycle.start({
        baseUrl: 'http://127.0.0.1:4321',
        controlToken: 'token-1'
      })
    ).resolves.toBeUndefined();

    expect(oversightFacade.subscribe).not.toHaveBeenCalled();
  });

  it('closes the previous bridge before replacing it on repeated start', async () => {
    const order: string[] = [];
    const unsubscribeOne = vi.fn(() => {
      order.push('unsubscribe-1');
    });
    const unsubscribeTwo = vi.fn(() => {
      order.push('unsubscribe-2');
    });
    const oversightFacadeOne = createOversightFacade();
    oversightFacadeOne.subscribe = vi.fn(() => unsubscribeOne);
    const oversightFacadeTwo = createOversightFacade();
    oversightFacadeTwo.subscribe = vi.fn(() => unsubscribeTwo);
    const bridgeOne = {
      notifyProjectionDelta: vi.fn(async () => undefined),
      close: vi.fn(async () => {
        order.push('close-1');
      })
    };
    const bridgeTwo = {
      notifyProjectionDelta: vi.fn(async () => undefined),
      close: vi.fn(async () => {
        order.push('close-2');
      })
    };
    const lifecycle = createControlTelegramBridgeLifecycle({
      runDir: '/tmp/run',
      createOversightFacade: vi.fn(() => oversightFacadeOne).mockReturnValueOnce(oversightFacadeOne).mockReturnValueOnce(oversightFacadeTwo),
      startTelegramBridgeImpl: vi
        .fn(async () => bridgeOne)
        .mockResolvedValueOnce(bridgeOne)
        .mockResolvedValueOnce(bridgeTwo)
    });

    await lifecycle.start({
      baseUrl: 'http://127.0.0.1:4321',
      controlToken: 'token-1'
    });
    await lifecycle.start({
      baseUrl: 'http://127.0.0.1:4321',
      controlToken: 'token-1'
    });
    await lifecycle.close();

    expect(order).toEqual(['unsubscribe-1', 'close-1', 'unsubscribe-2', 'close-2']);
    expect(oversightFacadeOne.subscribe).toHaveBeenCalledOnce();
    expect(oversightFacadeTwo.subscribe).toHaveBeenCalledOnce();
  });

  it('waits for an in-flight start before closing the attached bridge', async () => {
    let resolveBridge: ((value: { notifyProjectionDelta: typeof vi.fn; close: typeof vi.fn }) => void) | null = null;
    let markStartInvoked: (() => void) | null = null;
    const startInvoked = new Promise<void>((resolve) => {
      markStartInvoked = resolve;
    });
    const oversightFacade = createOversightFacade();
    const order: string[] = [];
    oversightFacade.subscribe = vi.fn(() => () => {
      order.push('unsubscribe');
    });
    const bridge = {
      notifyProjectionDelta: vi.fn(async () => undefined),
      close: vi.fn(async () => {
        order.push('close');
      })
    };
    const lifecycle = createControlTelegramBridgeLifecycle({
      runDir: '/tmp/run',
      createOversightFacade: () => oversightFacade,
      startTelegramBridgeImpl: vi.fn(
        () =>
          new Promise<typeof bridge>((resolve) => {
            markStartInvoked?.();
            resolveBridge = resolve;
          })
      )
    });

    const startPromise = lifecycle.start({
      baseUrl: 'http://127.0.0.1:4321',
      controlToken: 'token-1'
    });
    await startInvoked;
    const closePromise = lifecycle.close();
    resolveBridge?.(bridge);
    await startPromise;
    await closePromise;

    expect(oversightFacade.subscribe).toHaveBeenCalledOnce();
    expect(order).toEqual(['unsubscribe', 'close']);
    expect(bridge.close).toHaveBeenCalledOnce();
  });
});
