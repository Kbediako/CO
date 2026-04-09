import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('node:child_process');
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('node:child_process');
  vi.resetModules();
});

describe('CLI exec runtime', () => {
  it('forwards args to spawned commands', async () => {
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const fakeChild = Object.assign(new EventEmitter(), { stdout, stderr });
    const actualChildProcess = await vi.importActual<typeof import('node:child_process')>('node:child_process');
    const spawnMock = vi.fn(() => fakeChild as unknown as ReturnType<typeof actualChildProcess.spawn>);
    vi.doMock('node:child_process', () => ({
      ...actualChildProcess,
      spawn: spawnMock
    }));

    const { getCliExecRunner } = await import('../src/cli/services/execRuntime.js');
    const runner = getCliExecRunner();
    const resultPromise = runner.run({
      command: process.execPath,
      args: ['-e', "process.stdout.write(process.argv.slice(1).join(' '))", 'foo', 'bar']
    });
    await new Promise((resolve) => setImmediate(resolve));
    stdout.write('foo bar');
    fakeChild.emit('exit', 0, null);

    const result = await resultPromise;

    expect(result.stdout.trim()).toBe('foo bar');
    expect(spawnMock).toHaveBeenCalledWith(process.execPath, ['-e', "process.stdout.write(process.argv.slice(1).join(' '))", 'foo', 'bar'], {
      cwd: undefined,
      env: process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  });
});
