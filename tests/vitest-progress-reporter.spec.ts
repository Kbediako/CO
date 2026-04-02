import type { File, TaskResultPack } from '@vitest/runner';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_VITEST_PROGRESS_ANNOUNCE_AFTER_MS,
  DEFAULT_VITEST_PROGRESS_REPEAT_AFTER_MS,
  VitestProgressTracker
} from '../scripts/lib/vitest-progress-reporter.js';

describe('VitestProgressTracker', () => {
  it('waits for the announce threshold before logging a long-running file', () => {
    const harness = createHarness();

    harness.collect(['tests/run-review.spec.ts']);
    harness.update('file-0', 'run');

    harness.advance(DEFAULT_VITEST_PROGRESS_ANNOUNCE_AFTER_MS - 1);
    expect(harness.lines).toEqual([]);

    harness.advance(1);
    expect(harness.lines).toEqual(['[vitest-progress] still running: tests/run-review.spec.ts (30s)']);
  });

  it('repeats on the bounded cadence while the same file stays active', () => {
    const harness = createHarness();

    harness.collect(['tests/cli-command-surface.spec.ts']);
    harness.update('file-0', 'run');

    harness.advance(DEFAULT_VITEST_PROGRESS_ANNOUNCE_AFTER_MS);
    expect(harness.lines).toEqual([
      '[vitest-progress] still running: tests/cli-command-surface.spec.ts (30s)'
    ]);

    harness.advance(DEFAULT_VITEST_PROGRESS_REPEAT_AFTER_MS - 1);
    expect(harness.lines).toHaveLength(1);

    harness.advance(1);
    expect(harness.lines).toEqual([
      '[vitest-progress] still running: tests/cli-command-surface.spec.ts (30s)',
      '[vitest-progress] still running: tests/cli-command-surface.spec.ts (1m 30s)'
    ]);
  });

  it('stops logging once the file reaches a terminal state', () => {
    const harness = createHarness();

    harness.collect(['tests/run-review.spec.ts']);
    harness.update('file-0', 'run');

    harness.advance(DEFAULT_VITEST_PROGRESS_ANNOUNCE_AFTER_MS);
    expect(harness.lines).toHaveLength(1);

    harness.update('file-0', 'pass');
    expect(harness.activeTimerCount()).toBe(0);

    harness.advance(DEFAULT_VITEST_PROGRESS_REPEAT_AFTER_MS);
    expect(harness.lines).toHaveLength(1);
  });

  it('falls back to default timing values when invalid delays are provided', () => {
    const harness = createHarness({
      announceAfterMs: Number.NaN,
      repeatAfterMs: Number.POSITIVE_INFINITY,
      pollIntervalMs: -1
    });

    harness.collect(['tests/cli-command-surface.spec.ts']);
    harness.update('file-0', 'run');

    harness.advance(DEFAULT_VITEST_PROGRESS_ANNOUNCE_AFTER_MS);
    expect(harness.lines).toEqual([
      '[vitest-progress] still running: tests/cli-command-surface.spec.ts (30s)'
    ]);

    harness.advance(DEFAULT_VITEST_PROGRESS_REPEAT_AFTER_MS);
    expect(harness.lines).toEqual([
      '[vitest-progress] still running: tests/cli-command-surface.spec.ts (30s)',
      '[vitest-progress] still running: tests/cli-command-surface.spec.ts (1m 30s)'
    ]);
  });

  it('keeps tracking an active file when Vitest recollects files mid-run', () => {
    const harness = createHarness();

    harness.collect(['tests/run-review.spec.ts']);
    harness.update('file-0', 'run');
    harness.collect(['tests/run-review.spec.ts']);

    harness.advance(DEFAULT_VITEST_PROGRESS_ANNOUNCE_AFTER_MS);
    expect(harness.lines).toEqual(['[vitest-progress] still running: tests/run-review.spec.ts (30s)']);
  });
});

function createHarness(options: {
  announceAfterMs?: number;
  repeatAfterMs?: number;
  pollIntervalMs?: number;
} = {}) {
  let nowMs = 0;
  let nextTimerId = 1;

  const lines: string[] = [];
  const timerCallbacks = new Map<number, () => void>();

  const tracker = new VitestProgressTracker({
    announceAfterMs: options.announceAfterMs,
    repeatAfterMs: options.repeatAfterMs,
    pollIntervalMs: options.pollIntervalMs,
    cwd: '/repo',
    now: () => nowMs,
    setIntervalFn: ((callback: () => void) => {
      const timerId = nextTimerId++;
      timerCallbacks.set(timerId, callback);
      return timerId as unknown as ReturnType<typeof setInterval>;
    }) as (callback: () => void, delayMs: number) => ReturnType<typeof setInterval>,
    clearIntervalFn: ((timerHandle: ReturnType<typeof setInterval>) => {
      timerCallbacks.delete(timerHandle as unknown as number);
    }) as (handle: ReturnType<typeof setInterval>) => void,
    writeLine: (line) => lines.push(line)
  });

  return {
    lines,
    collect(paths: string[]) {
      tracker.onCollected(
        paths.map((filepath, index) => ({
          id: `file-${index}`,
          filepath: `/repo/${filepath}`
        })) as File[]
      );
    },
    update(id: string, state: 'run' | 'pass' | 'fail') {
      tracker.onTaskUpdate([[id, { state }, {}]] as TaskResultPack[]);
    },
    advance(durationMs: number) {
      nowMs += durationMs;
      for (const callback of Array.from(timerCallbacks.values())) {
        callback();
      }
    },
    activeTimerCount() {
      return timerCallbacks.size;
    }
  };
}
