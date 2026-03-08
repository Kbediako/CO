import http from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import { logger } from '../src/logger.js';
import { createControlEventTransport } from '../src/cli/control/controlEventTransport.js';

function createEventEntry(
  overrides: Partial<{
    seq: number;
    event: string;
    actor: string;
    payload: Record<string, unknown>;
    ts: string;
  }> = {}
) {
  return {
    seq: 1,
    event: 'control_action_applied',
    actor: 'runner',
    payload: { action: 'pause' },
    ts: '2026-03-08T15:20:00.000Z',
    ...overrides
  };
}

function createClient(
  onWrite?: (payload: string, callback?: (error?: Error | null) => void) => void
): http.ServerResponse {
  return {
    write: vi.fn((payload: string, callback?: (error?: Error | null) => void) => {
      onWrite?.(payload, callback);
      callback?.(null);
      return true;
    })
  } as unknown as http.ServerResponse;
}

describe('createControlEventTransport', () => {
  it('appends events and fans them out over SSE without runtime publish', async () => {
    const clients = new Set<http.ServerResponse>();
    const payloads: string[] = [];
    clients.add(
      createClient((payload) => {
        payloads.push(payload);
      })
    );
    const runtime = { publish: vi.fn() };
    const entry = createEventEntry({ seq: 7, event: 'dispatch_pilot_viewed' });
    const append = vi.fn(async () => entry);
    const transport = createControlEventTransport({
      eventStream: { append },
      clients,
      runtime
    });

    await transport.emitControlEvent({
      event: 'dispatch_pilot_viewed',
      actor: 'runner',
      payload: { status: 'blocked' }
    });

    expect(append).toHaveBeenCalledWith({
      event: 'dispatch_pilot_viewed',
      actor: 'runner',
      payload: { status: 'blocked' }
    });
    expect(payloads).toEqual([`data: ${JSON.stringify(entry)}\n\n`]);
    expect(runtime.publish).not.toHaveBeenCalled();
  });

  it('treats append failures as non-fatal and skips fan-out', async () => {
    const clients = new Set<http.ServerResponse>([createClient()]);
    const runtime = { publish: vi.fn() };
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const transport = createControlEventTransport({
      eventStream: {
        append: vi.fn(async () => {
          throw new Error('append_failed');
        })
      },
      clients,
      runtime
    });

    await expect(
      transport.emitControlEvent({
        event: 'control_action_applied',
        actor: 'runner',
        payload: { action: 'pause' }
      })
    ).resolves.toBeUndefined();

    expect(runtime.publish).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('Failed to append control event control_action_applied: append_failed');
  });

  it('broadcasts entries to SSE clients and publishes runtime updates', () => {
    const clients = new Set<http.ServerResponse>();
    const payloads: string[] = [];
    const client = createClient((payload) => {
      payloads.push(payload);
    });
    clients.add(client);
    const runtime = { publish: vi.fn() };
    const transport = createControlEventTransport({
      clients,
      runtime
    });
    const entry = createEventEntry({ seq: 9, event: 'question_closed' });

    transport.broadcast(entry);

    expect(payloads).toEqual([`data: ${JSON.stringify(entry)}\n\n`]);
    expect(runtime.publish).toHaveBeenCalledWith({
      eventSeq: 9,
      source: 'question_closed'
    });
  });

  it('prunes dead SSE clients and keeps surviving clients on later broadcasts', () => {
    const clients = new Set<http.ServerResponse>();
    const livePayloads: string[] = [];
    const liveClient = createClient((payload) => {
      livePayloads.push(payload);
    });
    const deadClient = {
      write: vi.fn((payload: string, callback?: (error?: Error | null) => void) => {
        callback?.(new Error('socket_closed'));
        return true;
      })
    } as unknown as http.ServerResponse;
    clients.add(liveClient);
    clients.add(deadClient);
    const transport = createControlEventTransport({
      clients,
      runtime: { publish: vi.fn() }
    });
    const firstEntry = createEventEntry({ seq: 11, event: 'confirmation_required' });
    const secondEntry = createEventEntry({ seq: 12, event: 'question_closed' });

    transport.broadcast(firstEntry);
    transport.broadcast(secondEntry);

    expect(livePayloads).toEqual([
      `data: ${JSON.stringify(firstEntry)}\n\n`,
      `data: ${JSON.stringify(secondEntry)}\n\n`
    ]);
    expect(clients.has(liveClient)).toBe(true);
    expect(clients.has(deadClient)).toBe(false);
  });

  it('no-ops when no event stream is configured', async () => {
    const runtime = { publish: vi.fn() };
    const transport = createControlEventTransport({
      clients: new Set<http.ServerResponse>(),
      runtime
    });

    await expect(
      transport.emitControlEvent({
        event: 'confirmation_required',
        actor: 'runner',
        payload: { request_id: 'req-1' }
      })
    ).resolves.toBeUndefined();

    expect(runtime.publish).not.toHaveBeenCalled();
  });
});
