import { PassThrough } from 'node:stream';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runExecCliShell } from '../src/cli/execCliShell.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function createEnv(taskId = 'task-default'): EnvironmentPaths {
  return {
    repoRoot: '/repo',
    runsRoot: '/repo/.runs',
    outRoot: '/repo/out',
    taskId
  };
}

function createStream(isTTY: boolean): NodeJS.WritableStream & { isTTY: boolean } {
  return Object.assign(new PassThrough(), { isTTY });
}

describe('runExecCliShell', () => {
  it('rejects missing commands before invoking the exec engine', async () => {
    const executeExecCommand = vi.fn<typeof import('../src/cli/exec/command.js').executeExecCommand>();

    await expect(
      runExecCliShell(
        {
          commandTokens: [],
          notifyTargets: [],
          otelEndpoint: null,
          requestedMode: null,
          jsonPretty: true
        },
        {
          executeExecCommand
        }
      )
    ).rejects.toThrow('exec requires a command to run.');

    expect(executeExecCommand).not.toHaveBeenCalled();
  });

  it('defaults to interactive mode on a TTY, validates task overrides, and emits the adoption hint', async () => {
    const executeExecCommand = vi.fn<typeof import('../src/cli/exec/command.js').executeExecCommand>().mockResolvedValue({
      status: 'succeeded',
      exitCode: 0
    } as never);
    const maybeEmitAdoptionHint = vi.fn().mockResolvedValue(undefined);
    const setExitCode = vi.fn();
    const stdout = createStream(true);
    const stderr = createStream(true);

    await runExecCliShell(
      {
        commandTokens: ['echo', 'hello'],
        notifyTargets: ['ntfy://team'],
        otelEndpoint: 'https://otel.invalid/v1/traces',
        requestedMode: null,
        jsonPretty: false,
        cwd: '/repo/worktree',
        taskId: 'task-1270'
      },
      {
        resolveEnvironmentPaths: () => createEnv('root-task'),
        executeExecCommand,
        stdout,
        stderr,
        maybeEmitAdoptionHint,
        setExitCode
      }
    );

    expect(executeExecCommand).toHaveBeenCalledWith(
      {
        env: createEnv('task-1270'),
        stdout,
        stderr
      },
      {
        command: 'echo',
        args: ['hello'],
        cwd: '/repo/worktree',
        outputMode: 'interactive',
        notifyTargets: ['ntfy://team'],
        otelEndpoint: 'https://otel.invalid/v1/traces',
        jsonPretty: false
      }
    );
    expect(setExitCode).toHaveBeenCalledWith(0);
    expect(maybeEmitAdoptionHint).toHaveBeenCalledWith('task-1270');
  });

  it('defaults to jsonl mode off TTY and skips the adoption hint', async () => {
    const executeExecCommand = vi.fn<typeof import('../src/cli/exec/command.js').executeExecCommand>().mockResolvedValue({
      status: 'succeeded',
      exitCode: null
    } as never);
    const maybeEmitAdoptionHint = vi.fn().mockResolvedValue(undefined);
    const setExitCode = vi.fn();
    const stdout = createStream(false);
    const stderr = createStream(false);

    await runExecCliShell(
      {
        commandTokens: ['echo', 'jsonl-smoke'],
        notifyTargets: [],
        otelEndpoint: null,
        requestedMode: null,
        jsonPretty: true
      },
      {
        resolveEnvironmentPaths: () => createEnv(),
        executeExecCommand,
        stdout,
        stderr,
        maybeEmitAdoptionHint,
        setExitCode
      }
    );

    expect(executeExecCommand).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        command: 'echo',
        args: ['jsonl-smoke'],
        outputMode: 'jsonl'
      })
    );
    expect(setExitCode).not.toHaveBeenCalled();
    expect(maybeEmitAdoptionHint).not.toHaveBeenCalled();
  });

  it('maps failed null-exit executions to exit code 1 and skips adoption hints outside interactive mode', async () => {
    const executeExecCommand = vi.fn<typeof import('../src/cli/exec/command.js').executeExecCommand>().mockResolvedValue({
      status: 'failed',
      exitCode: null
    } as never);
    const maybeEmitAdoptionHint = vi.fn().mockResolvedValue(undefined);
    const setExitCode = vi.fn();
    const stdout = createStream(true);
    const stderr = createStream(true);

    await runExecCliShell(
      {
        commandTokens: ['echo', 'json-smoke'],
        notifyTargets: [],
        otelEndpoint: null,
        requestedMode: 'json',
        jsonPretty: true
      },
      {
        resolveEnvironmentPaths: () => createEnv(),
        executeExecCommand,
        stdout,
        stderr,
        maybeEmitAdoptionHint,
        setExitCode
      }
    );

    expect(executeExecCommand).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        outputMode: 'json'
      })
    );
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(maybeEmitAdoptionHint).not.toHaveBeenCalled();
  });
});
