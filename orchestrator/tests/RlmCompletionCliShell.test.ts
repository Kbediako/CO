import { describe, expect, it, vi } from 'vitest';

import { runRlmCompletionCliShell } from '../src/cli/rlmCompletionCliShell.js';

describe('runRlmCompletionCliShell', () => {
  it('waits for a terminal manifest and reports the final RLM state', async () => {
    const readFile = vi
      .fn<(path: string, encoding: BufferEncoding) => Promise<string>>()
      .mockImplementationOnce(async () => JSON.stringify({ status: 'queued' }))
      .mockImplementationOnce(async () => JSON.stringify({ status: 'succeeded' }))
      .mockImplementationOnce(
        async () => JSON.stringify({ final: { exitCode: 3, status: 'failed' } })
      );
    const delay = vi.fn(async () => undefined);
    const log = vi.fn();
    const error = vi.fn();
    const setExitCode = vi.fn();

    await runRlmCompletionCliShell(
      {
        repoRoot: '/repo',
        artifactRoot: '.runs/task/cli/run-1',
        log,
        error,
        setExitCode
      },
      { readFile, delay }
    );

    expect(readFile).toHaveBeenCalledTimes(3);
    expect(delay).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('RLM status: failed');
    expect(error).not.toHaveBeenCalled();
    expect(setExitCode).toHaveBeenCalledWith(3);
  });

  it('falls back to the manifest status when the state file is missing', async () => {
    const readFile = vi
      .fn<(path: string, encoding: BufferEncoding) => Promise<string>>()
      .mockImplementationOnce(async () => JSON.stringify({ status: 'succeeded' }))
      .mockImplementationOnce(async () => {
        throw new Error('missing');
      });
    const log = vi.fn();
    const error = vi.fn();
    const setExitCode = vi.fn();

    await runRlmCompletionCliShell(
      {
        repoRoot: '/repo',
        artifactRoot: '.runs/task/cli/run-2',
        log,
        error,
        setExitCode
      },
      { readFile }
    );

    expect(log).toHaveBeenCalledWith('RLM status: succeeded');
    expect(error).toHaveBeenCalledWith('RLM state file missing; treating as internal error.');
    expect(setExitCode).toHaveBeenCalledWith(10);
  });

  it('treats a state file without final status as missing state', async () => {
    const readFile = vi
      .fn<(path: string, encoding: BufferEncoding) => Promise<string>>()
      .mockImplementationOnce(async () => JSON.stringify({ status: 'cancelled' }))
      .mockImplementationOnce(async () => JSON.stringify({ final: null }));
    const log = vi.fn();
    const error = vi.fn();
    const setExitCode = vi.fn();

    await runRlmCompletionCliShell(
      {
        repoRoot: '/repo',
        artifactRoot: '.runs/task/cli/run-3',
        log,
        error,
        setExitCode
      },
      { readFile }
    );

    expect(log).toHaveBeenCalledWith('RLM status: cancelled');
    expect(error).toHaveBeenCalledWith('RLM state file missing; treating as internal error.');
    expect(setExitCode).toHaveBeenCalledWith(10);
  });
});
