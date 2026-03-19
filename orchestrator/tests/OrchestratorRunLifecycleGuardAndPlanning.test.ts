import { describe, expect, it, vi } from 'vitest';

import { runOrchestratorRunLifecycleGuardAndPlanning } from '../src/cli/services/orchestratorRunLifecycleOrchestrationShell.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import type { TaskContext } from '../src/types.js';

function createGuardAndPlanningOptions() {
  const pipeline: PipelineDefinition = {
    id: 'pipeline-1',
    title: 'Pipeline 1',
    stages: []
  };

  return {
    env: { repoRoot: '/tmp/repo', taskId: 'task-1' } as never,
    pipeline,
    manifest: { run_id: 'run-1', task_id: 'task-1' } as never,
    paths: {
      runDir: '/tmp/repo/.runs/task-1/run-1',
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
    } as never,
    taskContext: { id: 'task-1', title: 'Task 1' } as TaskContext,
    runId: 'run-1',
    persister: { label: 'persister' } as never
  };
}

describe('runOrchestratorRunLifecycleGuardAndPlanning', () => {
  it('guards before planning, forwards the lifecycle inputs, and returns both results', async () => {
    const shared = createGuardAndPlanningOptions();
    const controlPlaneResult = { label: 'control-plane-result' } as never;
    const schedulerPlan = { label: 'scheduler-plan' } as never;

    const guard = vi.fn(async () => controlPlaneResult);
    const createPlanForRun = vi.fn(async () => schedulerPlan);

    const result = await runOrchestratorRunLifecycleGuardAndPlanning({
      ...shared,
      controlPlaneGuard: guard,
      createSchedulerPlan: createPlanForRun
    });

    expect(result).toEqual({ controlPlaneResult, schedulerPlan });
    expect(guard).toHaveBeenCalledOnce();
    expect(createPlanForRun).toHaveBeenCalledOnce();
    expect(guard).toHaveBeenCalledWith({
      env: shared.env,
      manifest: shared.manifest,
      paths: shared.paths,
      pipeline: shared.pipeline,
      task: shared.taskContext,
      runId: shared.runId,
      requestedBy: { actorId: 'codex-cli', channel: 'cli', name: 'Codex CLI' },
      persister: shared.persister
    });
    expect(createPlanForRun).toHaveBeenCalledWith({
      env: shared.env,
      manifest: shared.manifest,
      paths: shared.paths,
      controlPlaneResult,
      persister: shared.persister
    });
    expect(guard.mock.invocationCallOrder[0]).toBeLessThan(createPlanForRun.mock.invocationCallOrder[0]);
  });

  it('does not invoke scheduler planning when control-plane guard throws', async () => {
    const shared = createGuardAndPlanningOptions();
    const guardError = new Error('guard failed');

    const guard = vi.fn(async () => {
      throw guardError;
    });
    const createPlanForRun = vi.fn(async () => ({ label: 'scheduler-plan' } as never));

    await expect(
      runOrchestratorRunLifecycleGuardAndPlanning({
        ...shared,
        controlPlaneGuard: guard,
        createSchedulerPlan: createPlanForRun
      })
    ).rejects.toThrow('guard failed');

    expect(createPlanForRun).not.toHaveBeenCalled();
  });
});
