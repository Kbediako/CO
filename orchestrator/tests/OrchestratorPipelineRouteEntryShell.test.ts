import { describe, expect, it, vi } from 'vitest';

import type { PipelineRunExecutionResult } from '../src/cli/types.js';
import type { TaskContext } from '../src/types.js';
import {
  runOrchestratorPipelineRouteEntryShell,
  type RunOrchestratorPipelineRouteEntryShellOptions
} from '../src/cli/services/orchestratorPipelineRouteEntryShell.js';
import type { ExecutePipelineOptions } from '../src/cli/services/orchestratorExecutionRouteAdapterShell.js';

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

describe('orchestratorPipelineRouteEntryShell', () => {
  it('forwards route-entry callbacks and composes the cloud lifecycle handoff with the shared auto-scout callback', async () => {
    const options = createExecutePipelineOptions();
    const applyRuntimeSelection = vi.fn();
    const runAutoScout = vi.fn(async () => ({ status: 'timeout', message: 'noop' as const }));
    const startSubpipeline = vi.fn(async () => createPipelineResult());
    const runCloudExecutionLifecycleShell = vi.fn(async () => createPipelineResult());
    const executePipelineWithRouteAdapter = vi.fn(
      async (
        params: RunOrchestratorPipelineRouteEntryShellOptions['executePipelineWithRouteAdapter'] extends (
          input: infer T
        ) => Promise<PipelineRunExecutionResult>
          ? T
          : never
      ) => {
        expect(params.options).toBe(options);
        expect(params.applyRuntimeSelection).toBe(applyRuntimeSelection);
        expect(params.runAutoScout).toBe(runAutoScout);
        expect(params.startSubpipeline).toBe(startSubpipeline);

        await params.executeCloudPipeline({
          ...options,
          mode: 'cloud'
        });

        return createPipelineResult();
      }
    );

    const result = await runOrchestratorPipelineRouteEntryShell({
      options,
      applyRuntimeSelection,
      runAutoScout,
      startSubpipeline,
      executePipelineWithRouteAdapter,
      runCloudExecutionLifecycleShell
    });

    expect(result.success).toBe(true);
    expect(executePipelineWithRouteAdapter).toHaveBeenCalledOnce();
    expect(runCloudExecutionLifecycleShell).toHaveBeenCalledOnce();
    expect(runCloudExecutionLifecycleShell.mock.calls[0]?.[0]).toMatchObject({
      ...options,
      mode: 'cloud',
      runAutoScout
    });
  });
});
