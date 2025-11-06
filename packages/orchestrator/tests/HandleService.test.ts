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
});
