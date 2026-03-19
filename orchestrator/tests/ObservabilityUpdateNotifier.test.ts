import { describe, expect, it, vi } from 'vitest';

import { createObservabilityUpdateNotifier } from '../src/cli/control/observabilityUpdateNotifier.js';

describe('ObservabilityUpdateNotifier', () => {
  it('publishes metadata to subscribers and supports unsubscribe', async () => {
    const notifier = createObservabilityUpdateNotifier();
    const listener = vi.fn();
    const unsubscribe = notifier.subscribe(listener);

    notifier.publish({ eventSeq: 7, source: 'run.updated' });
    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith({ eventSeq: 7, source: 'run.updated' })
    );

    unsubscribe();
    notifier.publish({ eventSeq: 8, source: 'run.updated' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps notifying remaining subscribers when one listener fails', async () => {
    const notifier = createObservabilityUpdateNotifier();
    const failing = vi.fn(async () => {
      throw new Error('listener_failed');
    });
    const succeeding = vi.fn();
    notifier.subscribe(failing);
    notifier.subscribe(succeeding);

    notifier.publish({ source: 'questions.enqueue' });

    await vi.waitFor(() =>
      expect(succeeding).toHaveBeenCalledWith({ source: 'questions.enqueue' })
    );
    await vi.waitFor(() => expect(failing).toHaveBeenCalledTimes(1));
  });
});
