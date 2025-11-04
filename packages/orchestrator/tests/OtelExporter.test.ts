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
