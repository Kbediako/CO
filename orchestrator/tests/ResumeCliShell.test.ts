import { describe, expect, it, vi } from 'vitest';

import { runResumeCliShell } from '../src/cli/resumeCliShell.js';

describe('runResumeCliShell', () => {
  it('runs resume inside the UI wrapper and emits the resumed output', async () => {
    const runEvents = { label: 'resume-events' } as never;
    const runWithUi = vi.fn(async (action: (runEvents: never) => Promise<void>) => {
      await action(runEvents);
    });
    const result = {
      manifest: {
        run_id: 'run-resumed',
        status: 'succeeded',
        task_id: 'task-resumed',
        pipeline_id: 'diagnostics'
      }
    } as never;
    const orchestrator = {
      resume: vi.fn().mockResolvedValue(result)
    } as never;
    const emitRunOutput = vi.fn();

    await runResumeCliShell({
      orchestrator,
      runId: 'run-123',
      format: 'json',
      runtimeMode: 'cli',
      resumeToken: 'token-123',
      actor: 'codex',
      reason: 'manual-resume',
      targetStageId: 'target-stage',
      runWithUi,
      emitRunOutput
    });

    expect(runWithUi).toHaveBeenCalledTimes(1);
    expect(orchestrator.resume).toHaveBeenCalledWith({
      runId: 'run-123',
      resumeToken: 'token-123',
      actor: 'codex',
      reason: 'manual-resume',
      targetStageId: 'target-stage',
      runtimeMode: 'cli',
      runEvents
    });
    expect(emitRunOutput).toHaveBeenCalledWith(result, 'json', 'Run resumed');
  });

  it('passes through optional resume fields when omitted', async () => {
    const orchestrator = {
      resume: vi.fn().mockResolvedValue({
        manifest: {
          run_id: 'run-resumed',
          status: 'succeeded',
          task_id: 'task-resumed',
          pipeline_id: 'diagnostics'
        }
      })
    } as never;

    await runResumeCliShell({
      orchestrator,
      runId: 'run-456',
      format: 'text',
      runWithUi: vi.fn(async (action: (runEvents: never) => Promise<void>) => {
        await action({ label: 'resume-events' } as never);
      }),
      emitRunOutput: vi.fn()
    });

    expect(orchestrator.resume).toHaveBeenCalledWith({
      runId: 'run-456',
      resumeToken: undefined,
      actor: undefined,
      reason: undefined,
      targetStageId: undefined,
      runtimeMode: undefined,
      runEvents: { label: 'resume-events' }
    });
  });
});
