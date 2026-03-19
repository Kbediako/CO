import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runOrchestratorRunLifecycle } from '../src/cli/services/orchestratorRunLifecycleOrchestrationShell.js';
import type { RunSummary } from '../src/cli/types.js';

const mockState = vi.hoisted(() => ({
  createTaskManager: vi.fn(),
  completeLifecycle: vi.fn(),
  resetPrivacyGuard: vi.fn()
}));

vi.mock('../src/cli/services/orchestratorRunLifecycleTaskManagerShell.js', () => ({
  createOrchestratorRunLifecycleTaskManager: mockState.createTaskManager
}));

vi.mock('../src/cli/services/orchestratorRunLifecycleCompletion.js', () => ({
  completeOrchestratorRunLifecycle: mockState.completeLifecycle
}));

vi.mock('../src/cli/services/execRuntime.js', () => ({
  getPrivacyGuard: () => ({ reset: mockState.resetPrivacyGuard })
}));

function createOptions(overrides: Record<string, unknown> = {}) {
  return {
    env: { repoRoot: '/tmp/repo', taskId: 'task-1' } as never,
    pipeline: { id: 'pipeline-1', title: 'Pipeline 1', stages: [] } as never,
    manifest: { run_id: 'run-1', task_id: 'task-1' } as never,
    paths: {
      runDir: '/tmp/repo/.runs/task-1/run-1',
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
    } as never,
    planner: { label: 'planner' } as never,
    taskContext: { id: 'task-1', title: 'Task 1' } as never,
    runId: 'run-1',
    runEvents: {
      runError: vi.fn(),
      runCompleted: vi.fn()
    } as never,
    eventStream: undefined,
    onEventEntry: undefined,
    persister: { label: 'persister' } as never,
    envOverrides: {},
    runtimeModeRequested: 'appserver' as const,
    runtimeModeSource: 'default' as const,
    executionModeOverride: undefined,
    executePipeline: vi.fn(async () => ({ success: true })) as never,
    controlPlaneGuard: vi.fn(async () => ({ label: 'control-plane-result' })) as never,
    createSchedulerPlan: vi.fn(async () => ({ label: 'scheduler-plan' })) as never,
    finalizePlan: vi.fn(async () => undefined),
    applySchedulerToRunSummary: vi.fn(),
    applyControlPlaneToRunSummary: vi.fn(),
    ...overrides
  };
}

describe('runOrchestratorRunLifecycle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockState.createTaskManager.mockReset();
    mockState.completeLifecycle.mockReset();
    mockState.resetPrivacyGuard.mockReset();
    mockState.completeLifecycle.mockImplementation(async (input) => {
      await input.finalizePlan({
        env: input.env,
        manifest: input.manifest,
        paths: input.paths,
        schedulerPlan: input.schedulerPlan,
        controlPlaneResult: input.controlPlaneResult,
        persister: input.persister
      });
      return {
        manifest: input.manifest,
        runSummary: input.runSummary
      };
    });
  });

  it('resets privacy guard and preserves the lifecycle ordering on the happy path', async () => {
    const runSummary = { label: 'run-summary' } as unknown as RunSummary;
    const manager = { execute: vi.fn(async () => runSummary) };
    mockState.createTaskManager.mockReturnValue(manager);

    const options = createOptions();

    const result = await runOrchestratorRunLifecycle(options);

    expect(mockState.createTaskManager).toHaveBeenCalledOnce();
    expect(mockState.resetPrivacyGuard).toHaveBeenCalledOnce();
    expect(options.controlPlaneGuard).toHaveBeenCalledOnce();
    expect(options.createSchedulerPlan).toHaveBeenCalledOnce();
    expect(manager.execute).toHaveBeenCalledOnce();
    expect(options.finalizePlan).toHaveBeenCalledOnce();
    expect(mockState.completeLifecycle).toHaveBeenCalledOnce();
    expect(mockState.resetPrivacyGuard.mock.invocationCallOrder[0]).toBeLessThan(
      options.controlPlaneGuard.mock.invocationCallOrder[0]
    );
    expect(options.controlPlaneGuard.mock.invocationCallOrder[0]).toBeLessThan(
      options.createSchedulerPlan.mock.invocationCallOrder[0]
    );
    expect(options.createSchedulerPlan.mock.invocationCallOrder[0]).toBeLessThan(
      manager.execute.mock.invocationCallOrder[0]
    );
    expect(manager.execute.mock.invocationCallOrder[0]).toBeLessThan(
      options.finalizePlan.mock.invocationCallOrder[0]
    );
    expect(result).toEqual({ manifest: options.manifest, runSummary });
  });

  it('propagates execute failures through runError without entering completion finalization', async () => {
    const executeError = new Error('execute failed');
    const manager = {
      execute: vi.fn(async () => {
        throw executeError;
      })
    };
    mockState.createTaskManager.mockReturnValue(manager);
    const runError = vi.fn();
    const options = createOptions({
      runEvents: { runError } as never
    });

    await expect(runOrchestratorRunLifecycle(options)).rejects.toBe(executeError);

    expect(manager.execute).toHaveBeenCalledOnce();
    expect(runError).toHaveBeenCalledOnce();
    expect(runError).toHaveBeenCalledWith({
      pipelineId: options.pipeline.id,
      message: 'execute failed',
      stageId: null
    });
    expect(options.finalizePlan).not.toHaveBeenCalled();
    expect(mockState.completeLifecycle).not.toHaveBeenCalled();
  });
});
