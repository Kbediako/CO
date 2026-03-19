import { afterEach, describe, expect, it, vi } from 'vitest';

import { runPrCliShell } from '../src/cli/prCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runPrCliShell', () => {
  it('rejects missing subcommands before invoking the downstream runner', async () => {
    const runPrWatchMergeMock = vi.fn<typeof import('../../scripts/lib/pr-watch-merge.js').runPrWatchMerge>();

    await expect(
      runPrCliShell(
        {
          rawArgs: []
        },
        {
          runPrWatchMerge: runPrWatchMergeMock
        }
      )
    ).rejects.toThrow('pr requires a subcommand (watch-merge|resolve-merge).');

    expect(runPrWatchMergeMock).not.toHaveBeenCalled();
  });

  it('maps watch-merge into the downstream runner without forcing resolve-merge defaults', async () => {
    const runPrWatchMergeMock = vi.fn<typeof import('../../scripts/lib/pr-watch-merge.js').runPrWatchMerge>()
      .mockResolvedValue(0);
    const setExitCode = vi.fn();

    await runPrCliShell(
      {
        rawArgs: ['watch-merge', '--pr', '211', '--dry-run']
      },
      {
        runPrWatchMerge: runPrWatchMergeMock,
        setExitCode
      }
    );

    expect(runPrWatchMergeMock).toHaveBeenCalledWith(['--pr', '211', '--dry-run'], {
      usage: 'codex-orchestrator pr watch-merge'
    });
    expect(setExitCode).not.toHaveBeenCalled();
  });

  it('maps resolve-merge into the downstream runner with exit-on-action-required enabled', async () => {
    const runPrWatchMergeMock = vi.fn<typeof import('../../scripts/lib/pr-watch-merge.js').runPrWatchMerge>()
      .mockResolvedValue(0);

    await runPrCliShell(
      {
        rawArgs: ['resolve-merge', '--pr', '211']
      },
      {
        runPrWatchMerge: runPrWatchMergeMock
      }
    );

    expect(runPrWatchMergeMock).toHaveBeenCalledWith(['--pr', '211'], {
      usage: 'codex-orchestrator pr resolve-merge',
      defaultExitOnActionRequired: true
    });
  });

  it('sets a non-zero exit code when the downstream runner fails', async () => {
    const runPrWatchMergeMock = vi.fn<typeof import('../../scripts/lib/pr-watch-merge.js').runPrWatchMerge>()
      .mockResolvedValue(3);
    const setExitCode = vi.fn();

    await runPrCliShell(
      {
        rawArgs: ['watch-merge', '--pr', '211']
      },
      {
        runPrWatchMerge: runPrWatchMergeMock,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(3);
  });

  it('rejects unknown subcommands before invoking the downstream runner', async () => {
    const runPrWatchMergeMock = vi.fn<typeof import('../../scripts/lib/pr-watch-merge.js').runPrWatchMerge>();

    await expect(
      runPrCliShell(
        {
          rawArgs: ['ship-it']
        },
        {
          runPrWatchMerge: runPrWatchMergeMock
        }
      )
    ).rejects.toThrow('Unknown pr subcommand: ship-it');

    expect(runPrWatchMergeMock).not.toHaveBeenCalled();
  });
});
