import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

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
    try {
      expect(result.rawStderr).toEqual([]);
      expect(result.eventsPath).toContain('events.ndjson');
      expect(result.stderrPath).toContain('stderr.log');
      await expect(readFile(result.eventsPath, 'utf8')).resolves.toContain('"type":"run:summary"');
      await expect(readFile(result.stderrPath, 'utf8')).resolves.toBe('');
    } finally {
      await handle.cleanupArtifacts();
    }
    await expect(access(result.eventsPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(result.stderrPath)).rejects.toMatchObject({ code: 'ENOENT' });
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

  it('preserves the original spawn error when startup fails before any summary', async () => {
    const spawnError = Object.assign(new Error('spawn missing-cli ENOENT'), {
      code: 'ENOENT'
    });
    spawnMock.mockImplementationOnce(() => createMockProcess([], { error: spawnError }));

    const client = new ExecClient({ cliPath: 'missing-cli' });
    const handle = client.run({ command: 'npm' });

    await expect(handle.result).rejects.toMatchObject({
      code: 'ENOENT',
      message: 'spawn missing-cli ENOENT'
    });
  });

  it('keeps exit-time artifact cleanup registered until async removal settles', async () => {
    const exitHandlers: Array<(code?: number) => void> = [];
    const actualProcessOnce = process.once.bind(process);
    const rmGate = createDeferred<void>();
    const spawnIsolated = vi.fn(() => createMockProcess(buildEventStream()));
    const processOnceSpy = vi
      .spyOn(process, 'once')
      .mockImplementation(((event: string | symbol, listener: (...args: unknown[]) => void) => {
        if (event === 'exit') {
          exitHandlers.push(listener as (code?: number) => void);
          return process;
        }
        return actualProcessOnce(event, listener as never);
      }) as typeof process.once);

    vi.resetModules();
    vi.doMock('node:child_process', () => ({
      spawn: (...args: unknown[]) => spawnIsolated(...args)
    }));
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return {
        ...actual,
        rm: vi.fn(async (...args: Parameters<typeof actual.rm>) => {
          await rmGate.promise;
          return actual.rm(...args);
        })
      };
    });

    try {
      const { ExecClient: IsolatedExecClient } = await import('../src/orchestrator.js');
      expect(exitHandlers).toHaveLength(1);

      const client = new IsolatedExecClient({ cliPath: 'codex-orchestrator' });
      const handle = client.run({ command: 'npm', args: ['test'] });
      const result = await handle.result;
      const artifactRoot = dirname(result.eventsPath);

      const cleanupPromise = handle.cleanupArtifacts();
      await Promise.resolve();
      await expect(access(artifactRoot)).resolves.toBeUndefined();

      exitHandlers[0]?.(0);
      await expect(access(artifactRoot)).rejects.toMatchObject({ code: 'ENOENT' });

      rmGate.resolve();
      await cleanupPromise;
    } finally {
      rmGate.resolve();
      vi.doUnmock('node:child_process');
      vi.doUnmock('node:fs/promises');
      vi.resetModules();
      processOnceSpy.mockRestore();
    }
  });
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

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

function createMockProcess(
  lines: string[],
  options: { error?: Error } = {}
): ChildProcessWithoutNullStreams {
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
    if (options.error) {
      child.emit('error', options.error);
      stdout.end();
      stderr.end();
      child.emit('close', null, null);
      return;
    }
    for (const line of lines) {
      stdout.write(`${line}\n`);
    }
    stdout.end();
    child.emit('close', 0, null);
  }, 0);

  return child;
}
