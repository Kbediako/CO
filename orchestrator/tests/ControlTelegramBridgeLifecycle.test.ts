import { describe, expect, it, vi } from 'vitest';

import { createControlTelegramBridgeLifecycle } from '../src/cli/control/controlTelegramBridgeLifecycle.js';

function createReadAdapter() {
  return {
    readSelectedRun: vi.fn(async () => ({
      selected: null,
      dispatchPilot: null,
      tracked: null
    })),
    readDispatch: vi.fn(async () => ({})),
    readQuestions: vi.fn(async () => ({ questions: [] }))
  };
}

describe('createControlTelegramBridgeLifecycle', () => {
  it('propagates telegram bridge startup failure to the caller', async () => {
    const subscribe = vi.fn(() => () => undefined);
    const lifecycle = createControlTelegramBridgeLifecycle({
      runDir: '/tmp/run',
      controlRuntime: { subscribe },
      createTelegramReadAdapter: createReadAdapter,
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

    expect(subscribe).not.toHaveBeenCalled();
  });

  it('unsubscribes before closing the telegram bridge', async () => {
    const order: string[] = [];
    const bridge = {
      notifyProjectionDelta: vi.fn(async () => undefined),
      close: vi.fn(async () => {
        order.push('close');
      })
    };
    const lifecycle = createControlTelegramBridgeLifecycle({
      runDir: '/tmp/run',
      controlRuntime: {
        subscribe: vi.fn(() => {
          order.push('subscribe');
          return () => {
            order.push('unsubscribe');
          };
        })
      },
      createTelegramReadAdapter: createReadAdapter,
      startTelegramBridgeImpl: vi.fn(async () => bridge)
    });

    await lifecycle.start({
      baseUrl: 'http://127.0.0.1:4321',
      controlToken: 'token-1'
    });
    await lifecycle.close();

    expect(order).toEqual(['subscribe', 'unsubscribe', 'close']);
    expect(bridge.close).toHaveBeenCalledOnce();
  });

  it('closes the bridge and propagates subscription wiring failure', async () => {
    const bridge = {
      notifyProjectionDelta: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined)
    };
    const lifecycle = createControlTelegramBridgeLifecycle({
      runDir: '/tmp/run',
      controlRuntime: {
        subscribe: vi.fn(() => {
          throw new Error('subscribe-boom');
        })
      },
      createTelegramReadAdapter: createReadAdapter,
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
});
