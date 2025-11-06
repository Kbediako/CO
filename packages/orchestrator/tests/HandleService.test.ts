import { describe, expect, it } from 'vitest';

import { RemoteExecHandleService } from '../src/exec/handle-service.js';
import type {
  ExecBeginEvent,
  ExecChunkEvent,
  ExecEndEvent,
  ExecEvent,
  ExecRetryEvent
} from '../../shared/events/types.js';

function createEvent(type: ExecEvent['type'], correlationId: string, attempt = 1): ExecEvent {
  const timestamp = new Date('2025-11-05T00:00:00Z').toISOString();
  switch (type) {
    case 'exec:begin': {
      const event: ExecBeginEvent = {
        type: 'exec:begin',
        correlationId,
        attempt,
        timestamp,
        payload: {
          command: 'echo',
          args: [],
          cwd: '/tmp',
          sandboxState: 'sandboxed',
          sessionId: 'session',
          persisted: false
        }
      };
      return event;
    }
    case 'exec:chunk': {
      const event: ExecChunkEvent = {
        type: 'exec:chunk',
        correlationId,
        attempt,
        timestamp,
        payload: {
          stream: 'stdout',
          sequence: attempt,
          bytes: 5,
          data: `frame-${attempt}`
        }
      };
      return event;
    }
    case 'exec:end': {
      const event: ExecEndEvent = {
        type: 'exec:end',
        correlationId,
        attempt,
        timestamp,
        payload: {
          exitCode: 0,
          signal: null,
          durationMs: 10,
          stdout: 'frame-1frame-2',
          stderr: '',
          sandboxState: 'sandboxed',
          sessionId: 'session',
          status: 'succeeded'
        }
      };
      return event;
    }
    case 'exec:retry': {
      const event: ExecRetryEvent = {
        type: 'exec:retry',
        correlationId,
        attempt,
        timestamp,
        payload: {
          delayMs: 10,
          sandboxState: 'sandboxed',
          errorMessage: 'retry'
        }
      };
      return event;
    }
  }
  throw new Error(`Unsupported exec event type: ${type}`);
}

describe('RemoteExecHandleService', () => {
  it('stores frames and replays from offsets', async () => {
    const service = new RemoteExecHandleService({ now: () => new Date('2025-11-05T00:00:00Z') });
    const descriptor = service.issueHandle('corr-1');
    await service.append(descriptor.id, createEvent('exec:begin', 'corr-1'));
    await service.append(descriptor.id, createEvent('exec:chunk', 'corr-1', 1));
    await service.append(descriptor.id, createEvent('exec:chunk', 'corr-1', 2));

    const snapshot = service.getSnapshot(descriptor.id, 2);
    expect(snapshot).toHaveLength(2);
    expect(snapshot[0]?.event.type).toBe('exec:chunk');

    const received: string[] = [];
    const subscription = service.subscribe(
      descriptor.id,
      'observer-1',
      { fromSequence: 2, maxQueueSize: 2 },
      (frame) => {
        received.push(frame.event.type);
      }
    );

    await service.append(descriptor.id, createEvent('exec:end', 'corr-1'));
    service.close(descriptor.id);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(received).toContain('exec:chunk');
    expect(received).toContain('exec:end');

    subscription.unsubscribe();

    const finalDescriptor = service.getDescriptor(descriptor.id);
    expect(finalDescriptor.status).toBe('closed');
    expect(finalDescriptor.frameCount).toBeGreaterThanOrEqual(4);
  });

  it('prunes guard decisions in lockstep with the frame buffer', async () => {
    const service = new RemoteExecHandleService({
      now: () => new Date('2025-11-05T00:00:00Z'),
      maxStoredFrames: 3,
      guard: {
        async process(frame) {
          if (frame.sequence % 2 === 0) {
            return { frame, decision: { action: 'allow' as const, rule: 'even' } };
          }
          return { frame: null, decision: { action: 'block' as const, rule: 'odd' } };
        }
      }
    });

    const descriptor = service.issueHandle('corr-guard');
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      await service.append(descriptor.id, createEvent('exec:chunk', 'corr-guard', attempt));
    }

    const frames = service.getSnapshot(descriptor.id, 1);
    expect(frames.map((frame) => frame.sequence)).toEqual([4, 6, 8]);

    const tailFrames = service.getSnapshot(descriptor.id, 7);
    expect(tailFrames.map((frame) => frame.sequence)).toEqual([8]);

    const decisions = service.getDecisions(descriptor.id);
    expect(decisions.map((entry) => entry.sequence)).toEqual([4, 6, 7, 8]);

    const replayed: number[] = [];
    const subscription = service.subscribe(
      descriptor.id,
      'observer-prune',
      { fromSequence: 7, maxQueueSize: 2 },
      (frame) => {
        replayed.push(frame.sequence);
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(replayed).toEqual([8]);

    subscription.unsubscribe();
  });

  it('keeps guard decisions for buffered frames even when the guard blocks long stretches', async () => {
    const service = new RemoteExecHandleService({
      now: () => new Date('2025-11-05T00:00:00Z'),
      maxStoredFrames: 3,
      guard: {
        async process(frame) {
          if ((frame.sequence - 1) % 4 === 0) {
            return { frame, decision: { action: 'allow' as const, rule: 'window' } };
          }
          return { frame: null, decision: { action: 'block' as const, rule: 'window' } };
        }
      }
    });

    const descriptor = service.issueHandle('corr-window');

    for (let sequence = 1; sequence <= 8; sequence += 1) {
      await service.append(descriptor.id, createEvent('exec:chunk', 'corr-window', sequence));
    }

    const initialDecisions = service.getDecisions(descriptor.id);
    expect(initialDecisions.some((entry) => entry.sequence === 1)).toBe(true);
    expect(initialDecisions.some((entry) => entry.sequence === 2)).toBe(false);

    for (let sequence = 9; sequence <= 13; sequence += 1) {
      await service.append(descriptor.id, createEvent('exec:chunk', 'corr-window', sequence));
    }

    const frames = service.getSnapshot(descriptor.id, 1);
    expect(frames.map((frame) => frame.sequence)).toEqual([5, 9, 13]);

    const finalDecisions = service.getDecisions(descriptor.id);
    expect(finalDecisions.some((entry) => entry.sequence === 1)).toBe(false);
    expect(finalDecisions.some((entry) => entry.sequence === 5)).toBe(true);
  });
});
