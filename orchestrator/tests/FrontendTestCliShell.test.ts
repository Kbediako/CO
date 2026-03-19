import { afterEach, describe, expect, it, vi } from 'vitest';

import { runFrontendTestCliShell } from '../src/cli/frontendTestCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runFrontendTestCliShell', () => {
  it('runs the frontend-testing pipeline inside the UI wrapper and restores devtools env after success', async () => {
    const env: NodeJS.ProcessEnv = {};
    const runEvents = { label: 'frontend-test-events' } as never;
    const runWithUi = vi.fn(async (action: (runEvents: never) => Promise<void>) => {
      await action(runEvents);
    });
    const result = {
      manifest: {
        run_id: 'run-frontend',
        status: 'succeeded',
        task_id: 'task-frontend',
        pipeline_id: 'frontend-testing'
      }
    } as never;
    const orchestrator = {
      start: vi.fn().mockResolvedValue(result)
    } as never;
    const emitRunOutput = vi.fn();
    const setExitCode = vi.fn();

    await runFrontendTestCliShell(
      {
        orchestrator,
        format: 'json',
        devtoolsEnabled: true,
        runtimeMode: 'appserver',
        taskId: 'task-frontend',
        parentRunId: 'parent-run',
        approvalPolicy: 'never',
        targetStageId: 'target-stage',
        runWithUi,
        emitRunOutput
      },
      {
        env,
        setExitCode
      }
    );

    expect(runWithUi).toHaveBeenCalledTimes(1);
    expect(orchestrator.start).toHaveBeenCalledWith({
      pipelineId: 'frontend-testing',
      taskId: 'task-frontend',
      parentRunId: 'parent-run',
      approvalPolicy: 'never',
      targetStageId: 'target-stage',
      runtimeMode: 'appserver',
      runEvents
    });
    expect(emitRunOutput).toHaveBeenCalledWith(result, 'json', 'Run started');
    expect(setExitCode).not.toHaveBeenCalled();
    expect(env.CODEX_REVIEW_DEVTOOLS).toBeUndefined();
  });

  it('maps failed statuses to exit code 1 without mutating devtools env when not requested', async () => {
    const env: NodeJS.ProcessEnv = { CODEX_REVIEW_DEVTOOLS: 'existing' };
    const orchestrator = {
      start: vi.fn().mockResolvedValue({
        manifest: {
          run_id: 'run-failed',
          status: 'failed',
          task_id: 'task-failed',
          pipeline_id: 'frontend-testing'
        }
      })
    } as never;
    const setExitCode = vi.fn();

    await runFrontendTestCliShell(
      {
        orchestrator,
        format: 'text',
        devtoolsEnabled: false,
        runWithUi: vi.fn(async (action: (runEvents: never) => Promise<void>) => {
          await action({ label: 'run-events' } as never);
        }),
        emitRunOutput: vi.fn()
      },
      {
        env,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(env.CODEX_REVIEW_DEVTOOLS).toBe('existing');
  });

  it('restores a previous devtools env value when the run throws', async () => {
    const env: NodeJS.ProcessEnv = { CODEX_REVIEW_DEVTOOLS: 'keep-me' };

    await expect(
      runFrontendTestCliShell(
        {
          orchestrator: {
            start: vi.fn()
          } as never,
          format: 'text',
          devtoolsEnabled: true,
          runWithUi: vi.fn(async () => {
            throw new Error('frontend-test failed before completion');
          }),
          emitRunOutput: vi.fn()
        },
        {
          env,
          setExitCode: vi.fn()
        }
      )
    ).rejects.toThrow('frontend-test failed before completion');

    expect(env.CODEX_REVIEW_DEVTOOLS).toBe('keep-me');
  });
});
