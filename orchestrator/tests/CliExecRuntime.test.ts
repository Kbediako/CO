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

  it('captures stdout that arrives shortly after exit without waiting for close', async () => {
    const { getCliExecRunner } = await import('../src/cli/services/execRuntime.js');
    const runner = getCliExecRunner();
    const result = await runner.run({
      command: process.execPath,
      args: [
        '-e',
        [
          "const { spawn } = require('node:child_process');",
          "spawn(process.execPath, ['-e', \"setTimeout(() => { process.stdout.write('after\\\\n'); }, 150)\"], {",
          "  detached: true,",
          "  stdio: 'inherit'",
          '}).unref();',
          "process.stdout.write('before\\n');"
        ].join('')
      ],
      cwd: process.cwd(),
      env: process.env
    });

    expect(result).toMatchObject({
      exitCode: 0,
      stdout: 'before\nafter\n',
      stderr: ''
    });
  });

  it('does not wait forever for background children that keep stdio open', async () => {
    const { getCliExecRunner } = await import('../src/cli/services/execRuntime.js');
    const runner = getCliExecRunner();
    const startedAt = performance.now();
    const result = await runner.run({
      command: process.execPath,
      args: [
        '-e',
        [
          "const { spawn } = require('node:child_process');",
          "spawn(process.execPath, ['-e', 'setTimeout(() => {}, 2000)'], {",
          "  detached: true,",
          "  stdio: 'inherit'",
          '}).unref();',
          "process.stdout.write('ready\\n');"
        ].join('')
      ],
      cwd: process.cwd(),
      env: process.env
    });

    expect(performance.now() - startedAt).toBeLessThan(1800);
    expect(result).toMatchObject({
      exitCode: 0,
      stdout: 'ready\n',
      stderr: ''
    });
  });
});
