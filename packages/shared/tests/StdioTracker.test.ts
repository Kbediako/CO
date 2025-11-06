import { describe, expect, it } from 'vitest';
import { createStdioTracker } from '../streams/stdio.js';

describe('createStdioTracker', () => {
  it('increments sequence numbers across streams with timestamps', () => {
    let clock = 0;
    const tracker = createStdioTracker({
      now: () => new Date(1730678400000 + clock++ * 1000),
      startSequence: 0
    });

    const first = tracker.push('stdout', 'hello');
    const second = tracker.push('stderr', 'oops');
    const third = tracker.push('stdout', 'world');

    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(third.sequence).toBe(3);
    expect(first.timestamp).toBe('2024-11-04T00:00:00.000Z');
    expect(second.timestamp).toBe('2024-11-04T00:00:01.000Z');
    expect(third.timestamp).toBe('2024-11-04T00:00:02.000Z');
    expect(first.data).toBe('hello');
    expect(second.data).toBe('oops');
    expect(third.data).toBe('world');
  });

  it('caps buffered output at the configured byte limit', () => {
    const tracker = createStdioTracker({
      maxBufferBytes: 8
    });

    tracker.push('stdout', '1234');
    tracker.push('stdout', '5678');
    tracker.push('stdout', '90ab');

    expect(tracker.getBuffered('stdout')).toBe('567890ab');
    expect(tracker.getBufferedBytes('stdout')).toBe(8);
  });

  it('resets buffered state and sequence when requested', () => {
    const tracker = createStdioTracker({
      startSequence: 5
    });
    tracker.push('stdout', 'a');
    expect(tracker.getBuffered('stdout')).toBe('a');
    expect(tracker.push('stderr', 'b').sequence).toBe(7);

    tracker.reset();
    expect(tracker.getBuffered('stdout')).toBe('');
    expect(tracker.getBuffered('stderr')).toBe('');
    expect(tracker.push('stdout', 'c').sequence).toBe(6);
  });

  it('retains only the newest bytes when a single chunk exceeds the limit', () => {
    const tracker = createStdioTracker({
      maxBufferBytes: 4
    });

    tracker.push('stderr', 'abcdef');

    expect(tracker.getBuffered('stderr')).toBe('cdef');
    expect(tracker.getBufferedBytes('stderr')).toBe(4);
  });

  it('drops only the overflow bytes when advancing the sliding window', () => {
    const tracker = createStdioTracker({
      maxBufferBytes: 5
    });

    tracker.push('stdout', 'abc');
    tracker.push('stdout', 'de');
    tracker.push('stdout', 'f');

    expect(tracker.getBuffered('stdout')).toBe('bcdef');
    expect(tracker.getBufferedBytes('stdout')).toBe(5);
  });
});
