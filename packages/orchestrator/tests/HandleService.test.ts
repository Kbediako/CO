import { describe, expect, it } from 'vitest';

import { RemoteExecHandleService } from '../src/exec/handle-service.js';
import type { ExecEvent } from '../../shared/events/types.js';

function createEvent(type: ExecEvent['type'], correlationId: string, attempt = 1): ExecEvent {
  const base = {
    type,
    correlationId,
    attempt,
    timestamp: new Date('2025-11-05T00:00:00Z').toISOString()
  } as const;
  switch (type) {
    case 'exec:begin':
      return {
        ...base,
        payload: {
          command: 'echo',
          args: [],
          cwd: '/tmp',
          sandboxState: 'sandboxed',
          sessionId: 'session',
          persisted: false
        }
      };
    case 'exec:chunk':
      return {
        ...base,
        payload: {
          stream: 'stdout',
          sequence: attempt,
          bytes: 5,
          data: `frame-${attempt}`
        }
      };
    case 'exec:end':
      return {
        ...base,
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
    case 'exec:retry':
      return {
        ...base,
        payload: {
          delayMs: 10,
          sandboxState: 'sandboxed',
          errorMessage: 'retry'
        }
      };
  }
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
