import { describe, expect, it, vi } from 'vitest';

import { createOrchestratorRunLifecycleExecutionRegistration } from '../src/cli/services/orchestratorRunLifecycleExecutionRegistration.js';
import type { PipelineDefinition, PipelineRunExecutionResult } from '../src/cli/types.js';
import type { BuilderInput, ExecutionMode, PlanItem, PlanResult, TaskContext } from '../src/types.js';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createPipelineResult(): PipelineRunExecutionResult {
  return {
    success: true,
    notes: ['ok'],
    manifest: {
      task_id: 'task-1',
      run_id: 'run-1',
      status: 'succeeded',
      commands: [],
      child_runs: [],
      prompt_packs: [],
      heartbeat_interval_seconds: 60
    } as never,
    manifestPath: '.runs/task-1/run-1/manifest.json',
    logPath: '.runs/task-1/run-1/runner.ndjson'
  };
}

function createBuilderInput(
  overrides: Partial<BuilderInput> & { target?: Partial<PlanItem> } = {}
): BuilderInput {
  const target = {
    id: 'target-1',
    description: 'Target 1',
    metadata: {},
    ...(overrides.target ?? {})
  };

  return {
    task: overrides.task ?? ({ id: 'task-1', title: 'Task 1' } as TaskContext),
    plan: overrides.plan ?? ({ items: [target] } as PlanResult),
    target,
    mode: overrides.mode ?? 'mcp',
    runId: overrides.runId ?? 'run-1'
  };
}

function createRegistrationOptions() {
  const pipeline: PipelineDefinition = {
    id: 'pipeline-1',
    title: 'Pipeline 1',
    stages: []
  };
  const env = { repoRoot: '/tmp/repo', taskId: 'task-1' } as never;
  const manifest = { run_id: 'run-1', task_id: 'task-1' } as never;
  const paths = {
    runDir: '/tmp/repo/.runs/task-1/run-1',
    manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
    logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
  } as never;
  const planner = { label: 'planner' } as never;
  const taskContext = { id: 'task-1', title: 'Task 1' } as TaskContext;
  const runEvents = { label: 'run-events' } as never;
  const eventStream = { label: 'event-stream' } as never;
  const onEventEntry = vi.fn();
  const persister = { label: 'persister' } as never;
  const envOverrides = { TEST_ENV: '1' };
  const runtimeModeRequested = 'appserver' as const;
  const runtimeModeSource = 'default' as const;
  const executionModeOverride: ExecutionMode = 'cloud';

  return {
    pipeline,
    env,
    manifest,
    paths,
    planner,
    taskContext,
    runEvents,
    eventStream,
    onEventEntry,
    persister,
    envOverrides,
    runtimeModeRequested,
    runtimeModeSource,
    executionModeOverride
  };
}

describe('createOrchestratorRunLifecycleExecutionRegistration', () => {
  it('creates the manager with the registration callbacks and existing lifecycle inputs', () => {
    const shared = createRegistrationOptions();
    const executePipeline = vi.fn(async () => createPipelineResult());
    const result = createOrchestratorRunLifecycleExecutionRegistration({
      ...shared,
      executePipeline
    });

    expect(result.executePipeline).toEqual(expect.any(Function));
    expect(result.getResult()).toBeNull();
  });

  it('dedupes same-key executions, forwards the exact execution context, and updates getResult after success', async () => {
    const shared = createRegistrationOptions();
    const deferred = createDeferred<PipelineRunExecutionResult>();
    const executePipeline = vi.fn(async () => deferred.promise);
    const registration = createOrchestratorRunLifecycleExecutionRegistration({
      ...shared,
      executePipeline
    });

    const firstInput = createBuilderInput({ mode: 'mcp', target: { id: 'target-1' } });
    const secondInput = createBuilderInput({ mode: 'mcp', target: { id: 'target-1' }, runId: 'run-2' });

    const first = registration.executePipeline(firstInput);
    const second = registration.executePipeline(secondInput);

    expect(executePipeline).toHaveBeenCalledOnce();
    expect(executePipeline.mock.calls[0]?.[0]).toMatchObject({
      mode: 'mcp',
      runtimeModeRequested: shared.runtimeModeRequested,
      runtimeModeSource: shared.runtimeModeSource,
      executionModeOverride: shared.executionModeOverride,
      target: firstInput.target,
      task: shared.taskContext
    });
    expect(executePipeline.mock.calls[0]?.[0].env).toBe(shared.env);
    expect(executePipeline.mock.calls[0]?.[0].pipeline).toBe(shared.pipeline);
    expect(registration.getResult()).toBeNull();

    const result = createPipelineResult();
    deferred.resolve(result);

    await expect(first).resolves.toBe(result);
    await expect(second).resolves.toBe(result);
    expect(registration.getResult()).toBe(result);
  });

  it('does not dedupe across different execution keys', async () => {
    const shared = createRegistrationOptions();
    const executePipeline = vi.fn(async () => createPipelineResult());
    const registration = createOrchestratorRunLifecycleExecutionRegistration({
      ...shared,
      executePipeline
    });

    await registration.executePipeline(createBuilderInput({ mode: 'mcp', target: { id: 'target-1' } }));
    await registration.executePipeline(createBuilderInput({ mode: 'cloud', target: { id: 'target-1' } }));
    await registration.executePipeline(createBuilderInput({ mode: 'mcp', target: { id: 'target-2' } }));

    expect(executePipeline).toHaveBeenCalledTimes(3);
  });
});
