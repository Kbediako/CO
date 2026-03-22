import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProviderIssueRetryQueue } from '../src/cli/control/providerIssueRetryQueue.js';

describe('provider issue retry queue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('re-arms a queued retry after the callback rejects', async () => {
    vi.useFakeTimers();
    const queue = createProviderIssueRetryQueue();
    const fire = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('transient failure'))
      .mockResolvedValueOnce(undefined);

    queue.sync([
      {
        key: 'linear:issue-1',
        dueAt: new Date(Date.now()).toISOString(),
        fire
      }
    ]);

    await vi.advanceTimersByTimeAsync(0);
    expect(fire).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(fire).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(fire).toHaveBeenCalledTimes(2);
  });

  it('does not fire again after a rejection-driven re-arm is desynced', async () => {
    vi.useFakeTimers();
    const queue = createProviderIssueRetryQueue();
    const fire = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('transient failure'));

    queue.sync([
      {
        key: 'linear:issue-1',
        dueAt: new Date(Date.now()).toISOString(),
        fire
      }
    ]);

    await vi.advanceTimersByTimeAsync(0);
    expect(fire).toHaveBeenCalledTimes(1);

    queue.sync([]);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(fire).toHaveBeenCalledTimes(1);
  });
});
