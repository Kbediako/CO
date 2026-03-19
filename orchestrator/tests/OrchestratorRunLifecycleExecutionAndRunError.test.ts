import { describe, expect, it, vi } from 'vitest';

import { executeOrchestratorRunLifecycleTask } from '../src/cli/services/orchestratorRunLifecycleOrchestrationShell.js';
import type { TaskContext } from '../src/types.js';
import type { RunSummary } from '../src/cli/types.js';

function createExecutionAndRunErrorOptions() {
  return {
    env: { repoRoot: '/tmp/repo', taskId: 'task-1' } as never,
    taskContext: { id: 'task-1', title: 'Task 1' } as TaskContext,
    pipelineId: 'pipeline-1'
  };
}

describe('executeOrchestratorRunLifecycleTask', () => {
  it('returns the exact run summary from manager.execute without emitting runError', async () => {
    const shared = createExecutionAndRunErrorOptions();
    const runSummary = { label: 'run-summary' } as unknown as RunSummary;
    const execute = vi.fn(async () => runSummary);
    const runError = vi.fn();

    const result = await executeOrchestratorRunLifecycleTask(
      { execute },
      shared.taskContext,
      shared.pipelineId,
      { runError } as never
    );

    expect(result).toBe(runSummary);
    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith(shared.taskContext);
    expect(runError).not.toHaveBeenCalled();
  });

  it('emits runError once with the existing payload shape and rethrows the original error', async () => {
    const shared = createExecutionAndRunErrorOptions();
    const executeError = new Error('execute failed');
    const execute = vi.fn(async () => {
      throw executeError;
    });
    const runError = vi.fn();

    await expect(
      executeOrchestratorRunLifecycleTask(
        { execute },
        shared.taskContext,
        shared.pipelineId,
        { runError } as never
      )
    ).rejects.toBe(executeError);

    expect(execute).toHaveBeenCalledOnce();
    expect(runError).toHaveBeenCalledOnce();
    expect(runError).toHaveBeenCalledWith({
      pipelineId: shared.pipelineId,
      message: 'execute failed',
      stageId: null
    });
  });
});
