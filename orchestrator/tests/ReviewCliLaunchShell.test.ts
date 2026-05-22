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

  it('prefers the source review runner outside source runtime when ts-node is available', async () => {
    const runPassthroughCommand = vi.fn().mockResolvedValue(0);

    await runReviewCliLaunchShell(
      {
        rawArgs: []
      },
      {
        runningFromSourceRuntime: () => false,
        getPackageRoot: () => '/repo',
        fileExists: (path) => path === '/repo/dist/scripts/run-review.js' || path === '/repo/scripts/run-review.ts',
        resolveModule: (specifier) =>
          specifier === 'ts-node/esm' ? '/repo/node_modules/ts-node/esm.mjs' : null,
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

  it('fails closed when source exists but ts-node is unavailable from production deps', async () => {
    const runPassthroughCommand = vi.fn();
    const productionFiles = new Set(['/repo/dist/scripts/run-review.js', '/repo/scripts/run-review.ts']);

    await expect(
      runReviewCliLaunchShell(
        {
          rawArgs: ['--non-interactive']
        },
        {
          runningFromSourceRuntime: () => false,
          getPackageRoot: () => '/repo',
          fileExists: (path) => productionFiles.has(path),
          resolveModule: () => null,
          execPath: '/node',
          getCwd: () => '/package',
          getEnv: () => ({ NODE_ENV: 'production' }),
          runPassthroughCommand
        }
      )
    ).rejects.toThrow(
      'Unable to launch source review runner because ts-node/esm is unavailable; refusing to run dist/scripts/run-review.js while scripts/run-review.ts is present because generated runtime freshness is unproven.'
    );

    expect(runPassthroughCommand).not.toHaveBeenCalled();
  });

  it('uses the dist review runner in a packaged install without the source runner', async () => {
    const runPassthroughCommand = vi.fn().mockResolvedValue(0);

    await runReviewCliLaunchShell(
      {
        rawArgs: ['--non-interactive']
      },
      {
        runningFromSourceRuntime: () => false,
        getPackageRoot: () => '/repo',
        fileExists: (path) => path === '/repo/dist/scripts/run-review.js',
        execPath: '/node',
        getCwd: () => '/package',
        getEnv: () => ({ NODE_ENV: 'production' }),
        runPassthroughCommand
      }
    );

    expect(runPassthroughCommand).toHaveBeenCalledWith(
      '/node',
      ['/repo/dist/scripts/run-review.js', '--non-interactive'],
      {
        cwd: '/package',
        env: { NODE_ENV: 'production' }
      }
    );
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
        resolveModule: (specifier) =>
          specifier === 'ts-node/esm' ? '/repo/node_modules/ts-node/esm.mjs' : null,
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

  it('throws an actionable error when only the source runner exists but ts-node is unavailable', async () => {
    const runPassthroughCommand = vi.fn();

    await expect(
      runReviewCliLaunchShell(
        {
          rawArgs: []
        },
        {
          runningFromSourceRuntime: () => false,
          getPackageRoot: () => '/repo',
          fileExists: (path) => path === '/repo/scripts/run-review.ts',
          resolveModule: () => null,
          runPassthroughCommand
        }
      )
    ).rejects.toThrow('Unable to launch source review runner because ts-node/esm is unavailable');

    expect(runPassthroughCommand).not.toHaveBeenCalled();
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
