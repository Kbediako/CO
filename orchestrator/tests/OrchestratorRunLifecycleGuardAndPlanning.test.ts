import { describe, expect, it, vi } from 'vitest';

import { CodexOrchestrator } from '../src/cli/orchestrator.js';
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

type GuardAndPlanningHarness = {
  controlPlane: { guard: (...args: unknown[]) => Promise<unknown> };
  scheduler: { createPlanForRun: (...args: unknown[]) => Promise<unknown> };
  runLifecycleGuardAndPlanning: (
    context: ReturnType<typeof createGuardAndPlanningOptions>
  ) => Promise<{ controlPlaneResult: unknown; schedulerPlan: unknown }>;
};

describe('CodexOrchestrator.runLifecycleGuardAndPlanning', () => {
  it('guards before planning, forwards the lifecycle inputs, and returns both results', async () => {
    const shared = createGuardAndPlanningOptions();
    const orchestrator = new CodexOrchestrator(shared.env);
    const harness = orchestrator as unknown as GuardAndPlanningHarness;
    const controlPlaneResult = { label: 'control-plane-result' } as never;
    const schedulerPlan = { label: 'scheduler-plan' } as never;

    const guard = vi.spyOn(harness.controlPlane, 'guard').mockResolvedValue(controlPlaneResult);
    const createPlanForRun = vi
      .spyOn(harness.scheduler, 'createPlanForRun')
      .mockResolvedValue(schedulerPlan);

    const result = await harness.runLifecycleGuardAndPlanning(shared);

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
    const orchestrator = new CodexOrchestrator(shared.env);
    const harness = orchestrator as unknown as GuardAndPlanningHarness;
    const guardError = new Error('guard failed');

    vi.spyOn(harness.controlPlane, 'guard').mockRejectedValue(guardError);
    const createPlanForRun = vi
      .spyOn(harness.scheduler, 'createPlanForRun')
      .mockResolvedValue({ label: 'scheduler-plan' } as never);

    await expect(harness.runLifecycleGuardAndPlanning(shared)).rejects.toThrow('guard failed');

    expect(createPlanForRun).not.toHaveBeenCalled();
  });
});
