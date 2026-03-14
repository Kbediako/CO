import { describe, expect, it, vi } from 'vitest';

import { CodexOrchestrator } from '../src/cli/orchestrator.js';
import * as taskManagerShell from '../src/cli/services/orchestratorRunLifecycleTaskManagerShell.js';
import type { TaskManager } from '../src/manager.js';
import type { TaskContext } from '../src/types.js';
import type { RunEventPublisher } from '../src/cli/events/runEvents.js';
import type { RunSummary } from '../src/cli/types.js';

function createExecutionAndRunErrorOptions() {
  return {
    env: { repoRoot: '/tmp/repo', taskId: 'task-1' } as never,
    taskContext: { id: 'task-1', title: 'Task 1' } as TaskContext,
    pipelineId: 'pipeline-1'
  };
}

function createPerformRunLifecycleOptions() {
  return {
    env: { repoRoot: '/tmp/repo', taskId: 'task-1' } as never,
    pipeline: {
      id: 'pipeline-1',
      title: 'Pipeline 1',
      stages: []
    } as never,
    manifest: { run_id: 'run-1', task_id: 'task-1' } as never,
    paths: {
      runDir: '/tmp/repo/.runs/task-1/run-1',
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
    } as never,
    planner: { label: 'planner' } as never,
    taskContext: { id: 'task-1', title: 'Task 1' } as TaskContext,
    runId: 'run-1',
    runEvents: { runError: vi.fn() } as never,
    persister: { label: 'persister' } as never,
    envOverrides: {},
    runtimeModeRequested: 'appserver' as const,
    runtimeModeSource: 'default' as const
  };
}

type ExecutionAndRunErrorHarness = {
  executeRunLifecycleTask: (
    manager: Pick<TaskManager, 'execute'>,
    taskContext: TaskContext,
    pipelineId: string,
    runEvents?: RunEventPublisher
  ) => Promise<RunSummary>;
  performRunLifecycle: (context: ReturnType<typeof createPerformRunLifecycleOptions>) => Promise<unknown>;
  runLifecycleGuardAndPlanning: (
    context: ReturnType<typeof createPerformRunLifecycleOptions>
  ) => Promise<{ controlPlaneResult: unknown; schedulerPlan: unknown }>;
  scheduler: { finalizePlan: (...args: unknown[]) => Promise<void> };
};

describe('CodexOrchestrator.executeRunLifecycleTask', () => {
  it('returns the exact run summary from manager.execute without emitting runError', async () => {
    const shared = createExecutionAndRunErrorOptions();
    const orchestrator = new CodexOrchestrator(shared.env);
    const harness = orchestrator as unknown as ExecutionAndRunErrorHarness;
    const runSummary = { label: 'run-summary' } as unknown as RunSummary;
    const execute = vi.fn(async () => runSummary);
    const runError = vi.fn();

    const result = await harness.executeRunLifecycleTask(
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
    const orchestrator = new CodexOrchestrator(shared.env);
    const harness = orchestrator as unknown as ExecutionAndRunErrorHarness;
    const executeError = new Error('execute failed');
    const execute = vi.fn(async () => {
      throw executeError;
    });
    const runError = vi.fn();

    await expect(
      harness.executeRunLifecycleTask(
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

  it('propagates the real performRunLifecycle rejection path without entering completion finalization', async () => {
    const shared = createPerformRunLifecycleOptions();
    const orchestrator = new CodexOrchestrator(shared.env);
    const harness = orchestrator as unknown as ExecutionAndRunErrorHarness;
    const executeError = new Error('execute failed');
    const manager = {
      execute: vi.fn(async () => {
        throw executeError;
      })
    };

    vi.spyOn(taskManagerShell, 'createOrchestratorRunLifecycleTaskManager').mockReturnValue(manager as never);
    vi.spyOn(harness, 'runLifecycleGuardAndPlanning').mockResolvedValue({
      controlPlaneResult: { label: 'control-plane-result' },
      schedulerPlan: { label: 'scheduler-plan' }
    });
    const finalizePlan = vi.spyOn(harness.scheduler, 'finalizePlan').mockResolvedValue(undefined);
    const runError = vi.fn();

    await expect(
      harness.performRunLifecycle({
        ...shared,
        runEvents: { runError } as never
      })
    ).rejects.toBe(executeError);

    expect(manager.execute).toHaveBeenCalledOnce();
    expect(runError).toHaveBeenCalledOnce();
    expect(runError).toHaveBeenCalledWith({
      pipelineId: shared.pipeline.id,
      message: 'execute failed',
      stageId: null
    });
    expect(finalizePlan).not.toHaveBeenCalled();
  });
});
