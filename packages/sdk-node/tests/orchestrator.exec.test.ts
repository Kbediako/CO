import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';

import { ExecClient } from '../src/orchestrator.js';
import type { JsonlEvent, RunSummaryEvent } from '../../shared/events/types.js';

let spawnMock: ReturnType<typeof vi.fn>;

vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args)
}));

beforeEach(() => {
  spawnMock = vi.fn();
});

describe('ExecClient', () => {
  it('streams JSONL events and resolves summary', async () => {
    const lines = buildEventStream();
    spawnMock.mockImplementationOnce(() => createMockProcess(lines));

    const client = new ExecClient({ cliPath: 'codex-orchestrator' });
    const handle = client.run({ command: 'npm', args: ['test'], notify: ['hook'], taskId: 'task-123' });

    const result = await handle.result;

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0]?.[1]).toEqual([
      'exec',
      '--jsonl',
      '--task',
      'task-123',
      '--notify',
      'hook',
      '--',
      'npm',
      'test'
    ]);

    expect(handle.events).toHaveLength(2);
    const types = handle.events.map((event) => event.type);
    expect(types).toEqual(['exec:begin', 'run:summary']);
    expect(handle.summary?.payload.result.exitCode).toBe(0);
    expect(result.summary.payload.outputs.stdout).toBe('ok');
    expect(result.exitCode).toBe(0);
  });

  it('supports retrying with overrides', async () => {
    const first = buildEventStream();
    const second = buildEventStream({ exitCode: 1, status: 'failed' });
    spawnMock
      .mockImplementationOnce(() => createMockProcess(first))
      .mockImplementationOnce(() => createMockProcess(second));

    const client = new ExecClient({ cliPath: 'codex-orchestrator' });
    const handle = client.run({ command: 'npm', args: ['test'] });
    await handle.result;

    const retryHandle = handle.retry({ taskId: 'rerun' });
    const retryResult = await retryHandle.result;

    expect(spawnMock).toHaveBeenCalledTimes(2);
    expect(spawnMock.mock.calls[1]?.[1]).toEqual([
      'exec',
      '--jsonl',
      '--task',
      'rerun',
      '--',
      'npm',
      'test'
    ]);
    expect(retryResult.exitCode).toBe(1);
    expect(retryResult.status).toBe('failed');
  });

  it('rejects when summary is missing', async () => {
    spawnMock.mockImplementationOnce(() => createMockProcess([]));

    const client = new ExecClient({ cliPath: 'codex-orchestrator' });
    const handle = client.run({ command: 'npm' });

    await expect(handle.result).rejects.toThrow('Exec command exited without emitting a summary event');
  });
});

function buildEventStream(overrides: Partial<{ exitCode: number | null; status: 'succeeded' | 'failed' }> = {}): string[] {
  const begin: JsonlEvent = {
    type: 'exec:begin',
    timestamp: '2025-11-04T00:00:00.000Z',
    payload: {
      attempt: 1,
      correlationId: 'corr-1',
      command: 'npm',
      args: ['test'],
      cwd: '/tmp/project',
      sessionId: 'session-1',
      sandboxState: 'sandboxed',
      persisted: false
    }
  };
  const summary: RunSummaryEvent = {
    type: 'run:summary',
    timestamp: '2025-11-04T00:00:02.000Z',
    payload: {
      status: overrides.status ?? 'succeeded',
      run: {
        id: 'run-1',
        taskId: 'task-123',
        pipelineId: 'exec',
        manifest: '.runs/run-1/manifest.json',
        artifactRoot: '.runs/run-1',
        summary: 'Command completed'
      },
      result: {
        exitCode: overrides.exitCode ?? 0,
        signal: null,
        durationMs: 2000,
        status: overrides.status ?? 'succeeded',
        sandboxState: 'sandboxed',
        correlationId: 'corr-1',
        attempts: 1
      },
      command: {
        argv: ['npm', 'test'],
        shell: 'npm test',
        cwd: '/tmp/project',
        sessionId: 'session-1',
        persisted: false
      },
      outputs: {
        stdout: 'ok',
        stderr: ''
      },
      logs: {
        runner: '.runs/run-1/runner.ndjson',
        command: '.runs/run-1/commands/01-exec.ndjson'
      },
      toolRun: null,
      notifications: {
        targets: ['hook'],
        delivered: [],
        failures: []
      }
    }
  };
  return [JSON.stringify(begin), JSON.stringify(summary)];
}

function createMockProcess(lines: string[]): ChildProcessWithoutNullStreams {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const child = new EventEmitter() as ChildProcessWithoutNullStreams;
  Object.assign(child, {
    stdout,
    stderr,
    stdin: new PassThrough(),
    kill: vi.fn(() => true)
  });

  setTimeout(() => {
    for (const line of lines) {
      stdout.write(`${line}\n`);
    }
    stdout.end();
    child.emit('close', 0, null);
  }, 0);

  return child;
}
