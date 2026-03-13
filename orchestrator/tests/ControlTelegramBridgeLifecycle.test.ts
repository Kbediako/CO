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
});
