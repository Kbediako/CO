import { describe, expect, it, vi } from 'vitest';

import { createDefaultTelegramOversightState } from '../src/cli/control/controlTelegramPushState.js';
import { createTelegramOversightBridgeRuntimeLifecycle } from '../src/cli/control/telegramOversightBridgeRuntimeLifecycle.js';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('createTelegramOversightBridgeRuntimeLifecycle', () => {
  it('loads persisted state, fetches bot identity, logs enablement, and starts polling with runtime callbacks', async () => {
    const order: string[] = [];
    const persistedState = {
      ...createDefaultTelegramOversightState(),
      next_update_id: 41,
      updated_at: '2026-03-06T00:00:00.000Z'
    };
    const setState = vi.fn((state) => {
      order.push('setState');
      expect(state).toBe(persistedState);
    });
    let runtimeArg:
      | {
          isClosed: () => boolean;
          readBotUsername: () => string | null;
        }
      | undefined;

    const lifecycle = createTelegramOversightBridgeRuntimeLifecycle({
      loadState: vi.fn(async () => {
        order.push('loadState');
        return persistedState;
      }),
      setState,
      getBotIdentity: vi.fn(async () => {
        order.push('getBotIdentity');
        return { id: 8041324726, first_name: 'CO Test Bot', username: 'co_test_advisory_bot' };
      }),
      runPolling: vi.fn(async (runtime) => {
        order.push('runPolling');
        runtimeArg = runtime;
      }),
      abortPolling: vi.fn(() => {
        order.push('abortPolling');
      }),
      flushNotifications: vi.fn(async () => {
        order.push('flushNotifications');
      }),
      logEnabled: vi.fn((botUsername) => {
        order.push('logEnabled');
        expect(botUsername).toBe('co_test_advisory_bot');
      })
    });

    expect(lifecycle.isClosed()).toBe(false);

    await lifecycle.start();

    expect(order).toEqual(['loadState', 'setState', 'getBotIdentity', 'logEnabled', 'runPolling']);
    expect(lifecycle.isClosed()).toBe(false);
    expect(runtimeArg?.isClosed()).toBe(false);
    expect(runtimeArg?.readBotUsername()).toBe('co_test_advisory_bot');
  });

  it('aborts polling and waits for the loop to exit during close', async () => {
    const loopDeferred = createDeferred<void>();
    let runPollingResolved = false;
    const abortPolling = vi.fn();
    const flushNotifications = vi.fn(async () => undefined);
    const lifecycle = createTelegramOversightBridgeRuntimeLifecycle({
      loadState: vi.fn(async () => createDefaultTelegramOversightState()),
      setState: vi.fn(),
      getBotIdentity: vi.fn(async () => ({ id: 1, username: 'bot' })),
      runPolling: vi.fn(async () => {
        await loopDeferred.promise;
        runPollingResolved = true;
      }),
      abortPolling,
      flushNotifications,
      logEnabled: vi.fn()
    });

    await lifecycle.start();

    let closeResolved = false;
    const closePromise = lifecycle.close().then(() => {
      closeResolved = true;
    });

    await Promise.resolve();

    expect(lifecycle.isClosed()).toBe(true);
    expect(abortPolling).toHaveBeenCalledOnce();
    expect(runPollingResolved).toBe(false);
    expect(closeResolved).toBe(false);

    loopDeferred.resolve();
    await closePromise;

    expect(runPollingResolved).toBe(true);
    expect(flushNotifications).toHaveBeenCalledOnce();
    expect(closeResolved).toBe(true);
  });

  it('waits for queued notification work and ignores queued failures during close', async () => {
    const flushDeferred = createDeferred<void>();
    const lifecycle = createTelegramOversightBridgeRuntimeLifecycle({
      loadState: vi.fn(async () => createDefaultTelegramOversightState()),
      setState: vi.fn(),
      getBotIdentity: vi.fn(async () => ({ id: 1, username: 'bot' })),
      runPolling: vi.fn(async () => undefined),
      abortPolling: vi.fn(),
      flushNotifications: vi.fn(() => flushDeferred.promise),
      logEnabled: vi.fn()
    });

    await lifecycle.start();

    let closeResolved = false;
    const closePromise = lifecycle.close().then(() => {
      closeResolved = true;
    });

    await Promise.resolve();
    expect(closeResolved).toBe(false);

    flushDeferred.reject(new Error('queued send failed'));
    await closePromise;

    expect(closeResolved).toBe(true);
  });

  it('bounds close when the polling loop ignores abort', async () => {
    const flushNotifications = vi.fn(async () => undefined);
    const lifecycle = createTelegramOversightBridgeRuntimeLifecycle({
      loadState: vi.fn(async () => createDefaultTelegramOversightState()),
      setState: vi.fn(),
      getBotIdentity: vi.fn(async () => ({ id: 1, username: 'bot' })),
      runPolling: vi.fn(async () => {
        await createDeferred<void>().promise;
      }),
      abortPolling: vi.fn(),
      closePollGraceMs: 5,
      flushNotifications,
      logEnabled: vi.fn()
    });

    await lifecycle.start();

    const startedAt = Date.now();
    await lifecycle.close();
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeLessThan(250);
    expect(flushNotifications).toHaveBeenCalledOnce();
  });
});
