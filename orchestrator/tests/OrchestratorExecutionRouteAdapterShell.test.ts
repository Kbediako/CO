import { describe, expect, it, vi } from 'vitest';

import type { PipelineDefinition, PipelineRunExecutionResult } from '../src/cli/types.js';
import type { TaskContext } from '../src/types.js';
import {
  buildOrchestratorTaskManagerOptions,
  executeOrchestratorPipelineWithRouteAdapter,
  type ExecutePipelineOptions
} from '../src/cli/services/orchestratorExecutionRouteAdapterShell.js';

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

function createExecutePipelineOptions(): ExecutePipelineOptions {
  return {
    env: { repoRoot: '/tmp/repo', taskId: 'task-1', runsRoot: '/tmp/repo/.runs', outRoot: '/tmp/repo/out' } as never,
    pipeline: { id: 'pipeline-1', title: 'Pipeline 1', stages: [] } as never,
    manifest: { run_id: 'run-1', task_id: 'task-1' } as never,
    paths: {
      runDir: '/tmp/repo/.runs/task-1/run-1',
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
    } as never,
    mode: 'mcp',
    runtimeModeRequested: 'appserver',
    runtimeModeSource: 'default',
    target: { id: 'target-1', description: 'Target 1', metadata: {} },
    task: { id: 'task-1', title: 'Task 1' } as TaskContext,
    runEvents: { label: 'run-events' } as never,
    eventStream: { label: 'event-stream' } as never,
    onEventEntry: vi.fn(),
    persister: { label: 'persister' } as never,
    envOverrides: { TEST_ENV: '1' }
  };
}

describe('orchestratorExecutionRouteAdapterShell', () => {
  it('builds manager options with the expected run id, persistence roots, and mode policy', () => {
    const pipeline: PipelineDefinition = {
      id: 'pipeline-1',
      title: 'Pipeline 1',
      stages: []
    };
    const executePipeline = vi.fn(async () => createPipelineResult());
    const getResult = vi.fn(() => createPipelineResult());
    const options = buildOrchestratorTaskManagerOptions({
      runId: 'run-1',
      pipeline,
      executePipeline,
      getResult,
      plannerInstance: undefined,
      env: { repoRoot: '/tmp/repo', taskId: 'task-1', runsRoot: '/tmp/repo/.runs', outRoot: '/tmp/repo/out' } as never,
      modeOverride: 'cloud'
    });

    expect(options.runIdFactory()).toBe('run-1');
    expect(options.persistence?.autoStart).toBe(true);
    expect(options.persistence?.stateStore).toBeDefined();
    expect(options.persistence?.manifestWriter).toBeDefined();
    expect(
      options.modePolicy?.(
        { id: 'task-1', title: 'Task 1', metadata: { execution: { parallel: false } } } as TaskContext,
        { id: 'target-1', description: 'Target 1', metadata: { executionMode: 'mcp' } } as never
      )
    ).toBe('cloud');
  });

  it('forwards the exact route-adapter callbacks into routeOrchestratorExecution', async () => {
    const routeExecution = vi.fn(async () => createPipelineResult());
    const options = createExecutePipelineOptions();
    const applyRuntimeSelection = vi.fn();
    const executeCloudPipeline = vi.fn(async () => createPipelineResult());
    const runAutoScout = vi.fn(async () => ({ status: 'timeout', message: 'noop' }));
    const startSubpipeline = vi.fn(async () => createPipelineResult());

    const result = await executeOrchestratorPipelineWithRouteAdapter({
      options,
      applyRuntimeSelection,
      executeCloudPipeline,
      runAutoScout,
      startSubpipeline,
      routeExecution
    });

    expect(result.success).toBe(true);
    expect(routeExecution).toHaveBeenCalledOnce();
    expect(routeExecution.mock.calls[0]?.[0]).toMatchObject({
      ...options,
      applyRuntimeSelection,
      runAutoScout,
      startSubpipeline
    });
    expect(typeof routeExecution.mock.calls[0]?.[0].executeCloudPipeline).toBe('function');
  });
});
