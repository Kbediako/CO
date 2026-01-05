import { describe, expect, it, vi } from 'vitest';

import { createTelemetrySink } from '../src/telemetry/otel-exporter.js';

const okResponse = { ok: true, status: 200 } as Response;

describe('OtelTelemetrySink', () => {
  it('sends queued events on flush and summary', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse);
    const sink = createTelemetrySink({ endpoint: 'https://telemetry.example', fetch: fetchMock });

    await sink.record({
      type: 'exec:begin',
      timestamp: '2025-11-04T00:00:00.000Z',
      payload: {
        attempt: 1,
        correlationId: 'corr',
        command: 'npm',
        args: [],
        cwd: null,
        sessionId: 's',
        sandboxState: 'sandboxed',
        persisted: false
      }
    });

    await sink.flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await getPostedKind(fetchMock, 0)).toBe('events');

    await sink.recordSummary({
      type: 'run:summary',
      timestamp: '2025-11-04T00:00:01.000Z',
      payload: {
        status: 'succeeded',
        run: {
          id: 'run-1',
          taskId: 'task',
          pipelineId: 'exec',
          manifest: 'manifest.json',
          artifactRoot: '.runs',
          summary: 'done'
        },
        result: {
          exitCode: 0,
          signal: null,
          durationMs: 1000,
          status: 'succeeded',
          sandboxState: 'sandboxed',
          correlationId: 'corr',
          attempts: 1
        },
        command: {
          argv: ['npm'],
          shell: 'npm',
          cwd: null,
          sessionId: 's',
          persisted: false
        },
        outputs: { stdout: '', stderr: '' },
        logs: { runner: 'runner.ndjson', command: 'command.ndjson' },
        toolRun: null,
        notifications: { targets: [], delivered: [], failures: [] }
      }
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await getPostedKind(fetchMock, 1)).toBe('summary');
  });

  it('drops oldest events when queue exceeds max', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse);
    const sink = createTelemetrySink({
      endpoint: 'https://telemetry.example',
      fetch: fetchMock,
      maxQueueSize: 2
    });

    await sink.record({
      type: 'exec:chunk',
      timestamp: '2025-11-04T00:00:00.000Z',
      payload: {
        attempt: 1,
        correlationId: 'corr',
        stream: 'stdout',
        sequence: 1,
        bytes: 4,
        data: 'one'
      }
    });
    await sink.record({
      type: 'exec:chunk',
      timestamp: '2025-11-04T00:00:00.050Z',
      payload: {
        attempt: 1,
        correlationId: 'corr',
        stream: 'stdout',
        sequence: 2,
        bytes: 4,
        data: 'two'
      }
    });
    await sink.record({
      type: 'exec:chunk',
      timestamp: '2025-11-04T00:00:00.100Z',
      payload: {
        attempt: 1,
        correlationId: 'corr',
        stream: 'stdout',
        sequence: 3,
        bytes: 5,
        data: 'three'
      }
    });

    await sink.flush();

    const payload = await getPostedPayload(fetchMock, 0);
    const events = (payload?.events ?? []) as Array<{ payload?: { sequence?: number } }>;
    expect(events.length).toBe(2);
    const sequences = events.map((event) => event.payload?.sequence);
    expect(sequences).toEqual([2, 3]);
  });

  it('caps the queue after flush failures while recording new events', async () => {
    let rejectFetch: (error: Error) => void = () => undefined;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((_resolve, reject) => {
          rejectFetch = reject;
        })
    );
    const sink = createTelemetrySink({
      endpoint: 'https://telemetry.example',
      fetch: fetchMock,
      maxQueueSize: 2,
      backoffMs: 0
    });

    await sink.record(buildChunkEvent(1, 'one'));
    await sink.record(buildChunkEvent(2, 'two'));

    const flushPromise = sink.flush();

    await sink.record(buildChunkEvent(3, 'three'));
    await sink.record(buildChunkEvent(4, 'four'));

    rejectFetch(new Error('offline'));
    await flushPromise;

    fetchMock.mockResolvedValueOnce(okResponse);
    await sink.flush();

    const payload = await getPostedPayload(fetchMock, 1);
    const events = (payload?.events ?? []) as Array<{ payload?: { sequence?: number } }>;
    expect(events.length).toBe(2);
    expect(events.map((event) => event.payload?.sequence)).toEqual([3, 4]);
  });

  it('includes tfgrpo dimensions when metrics are present', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse);
    const sink = createTelemetrySink({ endpoint: 'https://telemetry.example', fetch: fetchMock });

    await sink.recordSummary({
      type: 'run:summary',
      timestamp: '2025-11-04T00:00:02.000Z',
      payload: {
        status: 'succeeded',
        run: {
          id: 'run-2',
          taskId: 'task',
          pipelineId: 'exec',
          manifest: 'manifest.json',
          artifactRoot: '.runs',
          summary: 'done'
        },
        result: {
          exitCode: 0,
          signal: null,
          durationMs: 900,
          status: 'succeeded',
          sandboxState: 'sandboxed',
          correlationId: 'corr',
          attempts: 1
        },
        command: {
          argv: ['npm'],
          shell: 'npm',
          cwd: null,
          sessionId: 's',
          persisted: false
        },
        outputs: { stdout: '', stderr: '' },
        logs: { runner: 'runner.ndjson', command: 'command.ndjson' },
        toolRun: null,
        metrics: {
          toolCalls: 1,
          tokenTotal: 120,
          costUsd: 0.003,
          latencyMs: 900,
          perTool: [
            {
              tool: 'cli:command',
              tokens: 120,
              costUsd: 0.003,
              latencyMs: 900,
              attempts: 1,
              status: 'succeeded',
              sandboxState: 'sandboxed'
            }
          ],
          tfgrpo: {
            epoch: 1,
            groupSize: 2,
            groupId: 'group-a'
          }
        },
        notifications: { targets: [], delivered: [], failures: [] }
      }
    });

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const body = call?.[1]?.body as string;
    const parsed = typeof body === 'string' ? JSON.parse(body) : null;
    expect(parsed?.dimensions?.tfgrpo_epoch).toBe(1);
    expect(parsed?.dimensions?.tool_costs?.['cli:command']).toBeCloseTo(0.003);
  });

  it('disables after exceeding failure threshold', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    const logger = { warn: vi.fn() };
    const sink = createTelemetrySink({ endpoint: 'https://telemetry.example', fetch: fetchMock, logger, maxFailures: 2, backoffMs: 0 });

    await sink.record({
      type: 'exec:begin',
      timestamp: '2025-11-04T00:00:00.000Z',
      payload: {
        attempt: 1,
        correlationId: 'corr',
        command: 'npm',
        args: [],
        cwd: null,
        sessionId: 's',
        sandboxState: 'sandboxed',
        persisted: false
      }
    });

    await expect(sink.flush()).resolves.toBeUndefined();
    await expect(sink.flush()).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalled();

    fetchMock.mockClear();
    await sink.record({
      type: 'exec:chunk',
      timestamp: '2025-11-04T00:00:00.100Z',
      payload: {
        attempt: 1,
        correlationId: 'corr',
        stream: 'stdout',
        sequence: 1,
        bytes: 4,
        data: 'data'
      }
    });
    await sink.flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

async function getPostedKind(fetchMock: ReturnType<typeof vi.fn>, index: number): Promise<string | undefined> {
  const call = fetchMock.mock.calls[index];
  if (!call) {
    return undefined;
  }
  const requestInit = call[1] as RequestInit;
  const body = requestInit?.body;
  if (typeof body === 'string') {
    return JSON.parse(body).kind;
  }
  if (body instanceof Buffer) {
    return JSON.parse(body.toString()).kind;
  }
  return undefined;
}

async function getPostedPayload(
  fetchMock: ReturnType<typeof vi.fn>,
  index: number
): Promise<Record<string, unknown> | undefined> {
  const call = fetchMock.mock.calls[index];
  if (!call) {
    return undefined;
  }
  const requestInit = call[1] as RequestInit;
  const body = requestInit?.body;
  if (typeof body === 'string') {
    return JSON.parse(body) as Record<string, unknown>;
  }
  if (body instanceof Buffer) {
    return JSON.parse(body.toString()) as Record<string, unknown>;
  }
  return undefined;
}

function buildChunkEvent(sequence: number, data: string) {
  return {
    type: 'exec:chunk',
    timestamp: '2025-11-04T00:00:00.000Z',
    payload: {
      attempt: 1,
      correlationId: 'corr',
      stream: 'stdout',
      sequence,
      bytes: data.length,
      data
    }
  };
}
