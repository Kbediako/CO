import { describe, expect, it, vi } from 'vitest';

import * as routeAdapterShell from '../src/cli/services/orchestratorExecutionRouteAdapterShell.js';
import * as trackerService from '../src/cli/services/orchestratorPlanTargetTracker.js';
import * as registrationService from '../src/cli/services/orchestratorRunLifecycleExecutionRegistration.js';
import { createOrchestratorRunLifecycleTaskManager } from '../src/cli/services/orchestratorRunLifecycleTaskManagerShell.js';
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

describe('createOrchestratorRunLifecycleTaskManager', () => {
  it('creates the manager with registration callbacks and attaches the plan target tracker', () => {
    const shared = createRegistrationOptions();
    const manager = { label: 'manager' } as never;
    const registration = {
      executePipeline: vi.fn(),
      getResult: vi.fn(() => null)
    };
    const createRegistration = vi
      .spyOn(registrationService, 'createOrchestratorRunLifecycleExecutionRegistration')
      .mockReturnValue(registration);
    const createTaskManager = vi
      .spyOn(routeAdapterShell, 'createOrchestratorTaskManager')
      .mockReturnValue(manager);
    const attachPlanTargetTracker = vi
      .spyOn(trackerService, 'attachOrchestratorPlanTargetTracker')
      .mockImplementation(() => undefined);
    const executePipeline = vi.fn(async () => {
      throw new Error('not used');
    });

    const result = createOrchestratorRunLifecycleTaskManager({
      runId: shared.runId,
      env: shared.env,
      pipeline: shared.pipeline,
      manifest: shared.manifest,
      paths: shared.paths,
      planner: shared.planner,
      taskContext: shared.taskContext,
      runEvents: shared.runEvents,
      eventStream: shared.eventStream,
      onEventEntry: shared.onEventEntry,
      persister: shared.persister,
      envOverrides: shared.envOverrides,
      runtimeModeRequested: shared.runtimeModeRequested,
      runtimeModeSource: shared.runtimeModeSource,
      executionModeOverride: shared.executionModeOverride,
      executePipeline
    });

    expect(result).toBe(manager);
    expect(createRegistration).toHaveBeenCalledOnce();
    expect(createRegistration).toHaveBeenCalledWith({
      env: shared.env,
      pipeline: shared.pipeline,
      manifest: shared.manifest,
      paths: shared.paths,
      taskContext: shared.taskContext,
      runEvents: shared.runEvents,
      eventStream: shared.eventStream,
      onEventEntry: shared.onEventEntry,
      persister: shared.persister,
      envOverrides: shared.envOverrides,
      runtimeModeRequested: shared.runtimeModeRequested,
      runtimeModeSource: shared.runtimeModeSource,
      executionModeOverride: shared.executionModeOverride,
      executePipeline
    });
    expect(createTaskManager).toHaveBeenCalledOnce();
    expect(createTaskManager).toHaveBeenCalledWith({
      runId: 'run-1',
      pipeline: shared.pipeline,
      executePipeline: registration.executePipeline,
      getResult: registration.getResult,
      plannerInstance: shared.planner,
      env: shared.env,
      modeOverride: shared.executionModeOverride
    });
    expect(attachPlanTargetTracker).toHaveBeenCalledOnce();
    expect(attachPlanTargetTracker).toHaveBeenCalledWith({
      manager,
      manifest: shared.manifest,
      paths: shared.paths,
      persister: shared.persister
    });
  });

  it('does not attach the plan target tracker when task manager creation fails', () => {
    const shared = createRegistrationOptions();
    const createTaskManagerError = new Error('task manager failed');
    vi.spyOn(registrationService, 'createOrchestratorRunLifecycleExecutionRegistration').mockReturnValue({
      executePipeline: vi.fn(),
      getResult: vi.fn(() => null)
    });
    vi.spyOn(routeAdapterShell, 'createOrchestratorTaskManager').mockImplementation(() => {
      throw createTaskManagerError;
    });
    const attachPlanTargetTracker = vi
      .spyOn(trackerService, 'attachOrchestratorPlanTargetTracker')
      .mockImplementation(() => undefined);

    expect(() =>
      createOrchestratorRunLifecycleTaskManager({
        runId: shared.runId,
        env: shared.env,
        pipeline: shared.pipeline,
        manifest: shared.manifest,
        paths: shared.paths,
        planner: shared.planner,
        taskContext: shared.taskContext,
        runEvents: shared.runEvents,
        eventStream: shared.eventStream,
        onEventEntry: shared.onEventEntry,
        persister: shared.persister,
        envOverrides: shared.envOverrides,
        runtimeModeRequested: shared.runtimeModeRequested,
        runtimeModeSource: shared.runtimeModeSource,
        executionModeOverride: shared.executionModeOverride,
        executePipeline: vi.fn(async () => {
          throw new Error('not used');
        })
      })
    ).toThrow('task manager failed');

    expect(attachPlanTargetTracker).not.toHaveBeenCalled();
  });
});
