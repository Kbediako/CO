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
    const { getCliExecRunner } = await import('../src/cli/services/execRuntime.js');
    const runner = getCliExecRunner();
    const result = await runner.run({
      command: process.execPath,
      args: ['-e', "process.stdout.write(process.argv.slice(1).join(' '))", 'foo', 'bar']
    });

    expect(result.stdout.trim()).toBe('foo bar');
  });
});
