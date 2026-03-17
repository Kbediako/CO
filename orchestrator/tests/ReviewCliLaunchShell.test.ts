import { afterEach, describe, expect, it, vi } from 'vitest';

import { runReviewCliLaunchShell } from '../src/cli/reviewCliLaunchShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runReviewCliLaunchShell', () => {
  it('launches the source review runner when running from source', async () => {
    const runPassthroughCommand = vi.fn().mockResolvedValue(0);
    const setExitCode = vi.fn();

    await runReviewCliLaunchShell(
      {
        rawArgs: ['--manifest', 'sample.json']
      },
      {
        runningFromSourceRuntime: () => true,
        getPackageRoot: () => '/repo',
        fileExists: (path) => path === '/repo/scripts/run-review.ts',
        execPath: '/node',
        getCwd: () => '/cwd',
        getEnv: () => ({ TEST_ENV: '1' }),
        runPassthroughCommand,
        setExitCode
      }
    );

    expect(runPassthroughCommand).toHaveBeenCalledWith(
      '/node',
      ['--loader', 'ts-node/esm', '/repo/scripts/run-review.ts', '--manifest', 'sample.json'],
      {
        cwd: '/cwd',
        env: { TEST_ENV: '1' }
      }
    );
    expect(setExitCode).not.toHaveBeenCalled();
  });

  it('prefers the dist review runner when available outside source runtime', async () => {
    const runPassthroughCommand = vi.fn().mockResolvedValue(0);

    await runReviewCliLaunchShell(
      {
        rawArgs: []
      },
      {
        runningFromSourceRuntime: () => false,
        getPackageRoot: () => '/repo',
        fileExists: (path) => path === '/repo/dist/scripts/run-review.js' || path === '/repo/scripts/run-review.ts',
        execPath: '/node',
        runPassthroughCommand
      }
    );

    expect(runPassthroughCommand).toHaveBeenCalledWith('/node', ['/repo/dist/scripts/run-review.js'], {
      cwd: process.cwd(),
      env: process.env
    });
  });

  it('falls back to the source review runner when dist output is absent', async () => {
    const runPassthroughCommand = vi.fn().mockResolvedValue(0);

    await runReviewCliLaunchShell(
      {
        rawArgs: []
      },
      {
        runningFromSourceRuntime: () => false,
        getPackageRoot: () => '/repo',
        fileExists: (path) => path === '/repo/scripts/run-review.ts',
        execPath: '/node',
        runPassthroughCommand
      }
    );

    expect(runPassthroughCommand).toHaveBeenCalledWith(
      '/node',
      ['--loader', 'ts-node/esm', '/repo/scripts/run-review.ts'],
      {
        cwd: process.cwd(),
        env: process.env
      }
    );
  });

  it('propagates a non-zero exit code via process.exitCode', async () => {
    const runPassthroughCommand = vi.fn().mockResolvedValue(3);
    const setExitCode = vi.fn();

    await runReviewCliLaunchShell(
      {
        rawArgs: []
      },
      {
        runningFromSourceRuntime: () => false,
        getPackageRoot: () => '/repo',
        fileExists: (path) => path === '/repo/dist/scripts/run-review.js',
        execPath: '/node',
        runPassthroughCommand,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(3);
  });

  it('throws when no review runner can be resolved', async () => {
    const runPassthroughCommand = vi.fn();

    await expect(
      runReviewCliLaunchShell(
        {
          rawArgs: []
        },
        {
          runningFromSourceRuntime: () => false,
          getPackageRoot: () => '/repo',
          fileExists: () => false,
          runPassthroughCommand
        }
      )
    ).rejects.toThrow(
      'Unable to locate review runner. Expected dist/scripts/run-review.js (npm) or scripts/run-review.ts (source checkout).'
    );

    expect(runPassthroughCommand).not.toHaveBeenCalled();
  });
});
