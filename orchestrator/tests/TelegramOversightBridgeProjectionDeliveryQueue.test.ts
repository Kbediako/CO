import { describe, expect, it, vi } from 'vitest';

import { createDefaultTelegramOversightState } from '../src/cli/control/controlTelegramPushState.js';
import { createTelegramOversightBridgeProjectionDeliveryQueue } from '../src/cli/control/telegramOversightBridgeProjectionDeliveryQueue.js';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('createTelegramOversightBridgeProjectionDeliveryQueue', () => {
  it('skips projection delivery when push is disabled or the bridge is already closed', async () => {
    const readPushState = vi.fn(() => createDefaultTelegramOversightState().push);
    const notifyProjectionDelta = vi.fn();
    const applyStatePatchAndSave = vi.fn();

    const disabled = createTelegramOversightBridgeProjectionDeliveryQueue({
      pushEnabled: false,
      isClosed: () => false,
      readPushState,
      notifyProjectionDelta,
      applyStatePatchAndSave,
      logDeliveryFailure: vi.fn()
    });
    await disabled.notifyProjectionDelta({ eventSeq: 1 });

    const closed = createTelegramOversightBridgeProjectionDeliveryQueue({
      pushEnabled: true,
      isClosed: () => true,
      readPushState,
      notifyProjectionDelta,
      applyStatePatchAndSave,
      logDeliveryFailure: vi.fn()
    });
    await closed.notifyProjectionDelta({ eventSeq: 2 });

    expect(readPushState).not.toHaveBeenCalled();
    expect(notifyProjectionDelta).not.toHaveBeenCalled();
    expect(applyStatePatchAndSave).not.toHaveBeenCalled();
  });

  it('serializes queued projection deliveries and applies patches using the latest push state', async () => {
    const firstDelivery = createDeferred<void>();
    let currentPushState = createDefaultTelegramOversightState().push;
    const callOrder: string[] = [];

    const queue = createTelegramOversightBridgeProjectionDeliveryQueue({
      pushEnabled: true,
      isClosed: () => false,
      readPushState: () => currentPushState,
      notifyProjectionDelta: vi.fn(async ({ pushState, eventSeq }) => {
        callOrder.push(`notify:${eventSeq}:${pushState.last_event_seq ?? 'null'}`);
        if (eventSeq === 1) {
          await firstDelivery.promise;
        }
        return {
          delivery: eventSeq === 1 ? 'send' : 'pending',
          statePatch: {
            updated_at: `2026-03-06T04:0${eventSeq}:00.000Z`,
            push: {
              ...pushState,
              last_event_seq: eventSeq ?? null,
              last_sent_projection_hash: eventSeq === 1 ? 'hash-1' : pushState.last_sent_projection_hash,
              last_sent_at: eventSeq === 1 ? '2026-03-06T04:01:00.000Z' : pushState.last_sent_at,
              pending_projection_hash: eventSeq === 2 ? 'hash-2' : null,
              pending_projection_observed_at: eventSeq === 2 ? '2026-03-06T04:02:00.000Z' : null
            }
          }
        };
      }),
      applyStatePatchAndSave: vi.fn(async (statePatch) => {
        callOrder.push(`apply:${statePatch.push.last_event_seq ?? 'null'}`);
        currentPushState = statePatch.push;
      }),
      logDeliveryFailure: vi.fn()
    });

    const firstPromise = queue.notifyProjectionDelta({ eventSeq: 1 });
    const secondPromise = queue.notifyProjectionDelta({ eventSeq: 2 });

    await Promise.resolve();
    expect(callOrder).toEqual(['notify:1:null']);

    firstDelivery.resolve();
    await Promise.all([firstPromise, secondPromise]);

    expect(callOrder).toEqual(['notify:1:null', 'apply:1', 'notify:2:1', 'apply:2']);
    expect(currentPushState.last_event_seq).toBe(2);
    expect(currentPushState.pending_projection_hash).toBe('hash-2');
  });

  it('logs projection delivery failures and allows later deliveries to continue', async () => {
    let currentPushState = createDefaultTelegramOversightState().push;
    const logDeliveryFailure = vi.fn();

    const queue = createTelegramOversightBridgeProjectionDeliveryQueue({
      pushEnabled: true,
      isClosed: () => false,
      readPushState: () => currentPushState,
      notifyProjectionDelta: vi
        .fn()
        .mockRejectedValueOnce(new Error('send failed'))
        .mockResolvedValueOnce({
          delivery: 'send',
          statePatch: {
            updated_at: '2026-03-06T04:03:00.000Z',
            push: {
              ...currentPushState,
              last_event_seq: 2,
              last_sent_projection_hash: 'hash-2',
              last_sent_at: '2026-03-06T04:03:00.000Z',
              pending_projection_hash: null,
              pending_projection_observed_at: null
            }
          }
        }),
      applyStatePatchAndSave: vi.fn(async (statePatch) => {
        currentPushState = statePatch.push;
      }),
      logDeliveryFailure
    });

    await queue.notifyProjectionDelta({ eventSeq: 1 });
    await queue.notifyProjectionDelta({ eventSeq: 2 });

    expect(logDeliveryFailure).toHaveBeenCalledOnce();
    expect(currentPushState.last_event_seq).toBe(2);
    expect(currentPushState.last_sent_projection_hash).toBe('hash-2');
  });
});
