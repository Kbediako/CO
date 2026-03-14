import { describe, expect, it, vi } from 'vitest';

import { CodexOrchestrator } from '../src/cli/orchestrator.js';
import * as trackerService from '../src/cli/services/orchestratorPlanTargetTracker.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import type { ExecutionMode, TaskContext } from '../src/types.js';

function createRegistrationOptions() {
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
    planner: { label: 'planner' } as never,
    taskContext: { id: 'task-1', title: 'Task 1' } as TaskContext,
    runId: 'run-1',
    runEvents: { label: 'run-events' } as never,
    eventStream: { label: 'event-stream' } as never,
    onEventEntry: vi.fn(),
    persister: { label: 'persister' } as never,
    envOverrides: { TEST_ENV: '1' },
    runtimeModeRequested: 'appserver' as const,
    runtimeModeSource: 'default' as const,
    executionModeOverride: 'cloud' as ExecutionMode
  };
}

describe('CodexOrchestrator.createRunLifecycleTaskManager', () => {
  it('creates the manager with registration callbacks and attaches the plan target tracker', () => {
    const shared = createRegistrationOptions();
    const orchestrator = new CodexOrchestrator(shared.env);
    const manager = { label: 'manager' } as never;
    const createTaskManager = vi
      .spyOn(orchestrator as unknown as {
        createTaskManager: (...args: unknown[]) => typeof manager;
      }, 'createTaskManager')
      .mockReturnValue(manager);
    const attachPlanTargetTracker = vi
      .spyOn(trackerService, 'attachOrchestratorPlanTargetTracker')
      .mockImplementation(() => undefined);

    const result = (
      orchestrator as unknown as {
        createRunLifecycleTaskManager: (context: ReturnType<typeof createRegistrationOptions>) => typeof manager;
      }
    ).createRunLifecycleTaskManager(shared);

    expect(result).toBe(manager);
    expect(createTaskManager).toHaveBeenCalledOnce();
    expect(attachPlanTargetTracker).toHaveBeenCalledTimes(1);
    expect(createTaskManager).toHaveBeenCalledWith(
      'run-1',
      shared.pipeline,
      expect.any(Function),
      expect.any(Function),
      shared.planner,
      shared.env,
      shared.executionModeOverride
    );
    const capturedGetResult = createTaskManager.mock.calls[0]?.[3] as (() => unknown) | undefined;
    expect(capturedGetResult?.()).toBeNull();
    expect(attachPlanTargetTracker).toHaveBeenCalledWith({
      manager,
      manifest: shared.manifest,
      paths: shared.paths,
      persister: shared.persister
    });
  });

  it('does not attach the plan target tracker when task manager creation fails', () => {
    const shared = createRegistrationOptions();
    const orchestrator = new CodexOrchestrator(shared.env);
    const createTaskManagerError = new Error('task manager failed');
    vi.spyOn(orchestrator as unknown as {
      createTaskManager: (...args: unknown[]) => never;
    }, 'createTaskManager').mockImplementation(() => {
      throw createTaskManagerError;
    });
    const attachPlanTargetTracker = vi
      .spyOn(trackerService, 'attachOrchestratorPlanTargetTracker')
      .mockImplementation(() => undefined);

    expect(() =>
      (
        orchestrator as unknown as {
          createRunLifecycleTaskManager: (context: ReturnType<typeof createRegistrationOptions>) => unknown;
        }
      ).createRunLifecycleTaskManager(shared)
    ).toThrow('task manager failed');

    expect(attachPlanTargetTracker).not.toHaveBeenCalled();
  });
});
