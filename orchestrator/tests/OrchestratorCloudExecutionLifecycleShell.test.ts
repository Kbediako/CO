import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runOrchestratorCloudExecutionLifecycleShell } from '../src/cli/services/orchestratorCloudExecutionLifecycleShell.js';

const mockState = vi.hoisted(() => ({
  lifecycleRunner: vi.fn(),
  cloudExecutor: vi.fn()
}));

vi.mock('../src/cli/services/orchestratorExecutionLifecycle.js', () => ({
  runOrchestratorExecutionLifecycle: mockState.lifecycleRunner
}));

vi.mock('../src/cli/services/orchestratorCloudTargetExecutor.js', () => ({
  executeOrchestratorCloudTarget: mockState.cloudExecutor
}));

function createOptions() {
  return {
    env: { repoRoot: '/tmp/repo', taskId: 'task-1' } as never,
    pipeline: {
      id: 'pipeline-1',
      title: 'Pipeline 1',
      stages: []
    } as never,
    manifest: {
      run_id: 'run-1',
      task_id: 'task-1',
      summary: null,
      status: 'pending',
      status_detail: null,
      commands: [],
      child_runs: [],
      prompt_packs: []
    } as never,
    paths: {
      runDir: '/tmp/repo/.runs/task-1/run-1',
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
    } as never,
    mode: 'cloud' as const,
    runtimeModeRequested: 'appserver' as const,
    runtimeModeSource: 'default' as const,
    target: {
      id: 'target-1',
      description: 'Target 1',
      metadata: {}
    } as never,
    task: {
      id: 'task-1',
      title: 'Task 1'
    } as never,
    runEvents: { label: 'run-events' } as never,
    eventStream: { label: 'event-stream' } as never,
    onEventEntry: vi.fn(),
    persister: { label: 'persister' } as never,
    runAutoScout: vi.fn(async () => ({ status: 'recorded', path: 'out/auto-scout.json' })),
    envOverrides: {
      OUTER_FLAG: '1'
    }
  };
}

describe('runOrchestratorCloudExecutionLifecycleShell', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockState.lifecycleRunner.mockReset();
    mockState.cloudExecutor.mockReset();
  });

  it('preserves lifecycle contract forwarding and executeBody note and success wiring', async () => {
    const options = createOptions();
    let capturedControlWatcher: unknown;
    let capturedSchedulePersist: unknown;

    mockState.lifecycleRunner.mockImplementation(async (input) => {
      const notes = ['lifecycle note'];
      capturedControlWatcher = { label: 'control-watcher' };
      capturedSchedulePersist = vi.fn();
      const success = await input.executeBody({
        notes,
        controlWatcher: capturedControlWatcher,
        schedulePersist: capturedSchedulePersist
      });
      return {
        success,
        notes,
        manifest: input.manifest,
        manifestPath: input.paths.manifestPath,
        logPath: input.paths.logPath
      };
    });
    mockState.cloudExecutor.mockResolvedValue({
      success: false,
      notes: ['cloud note']
    });

    const result = await runOrchestratorCloudExecutionLifecycleShell(options);

    expect(mockState.lifecycleRunner).toHaveBeenCalledOnce();
    const lifecycleInput = mockState.lifecycleRunner.mock.calls[0]?.[0];
    expect(lifecycleInput).toMatchObject({
      env: options.env,
      pipeline: options.pipeline,
      manifest: options.manifest,
      paths: options.paths,
      mode: options.mode,
      target: options.target,
      task: options.task,
      runEvents: options.runEvents,
      eventStream: options.eventStream,
      onEventEntry: options.onEventEntry,
      persister: options.persister,
      envOverrides: options.envOverrides,
      defaultFailureStatusDetail: 'cloud-execution-failed',
      runAutoScout: options.runAutoScout
    });
    expect(lifecycleInput.advancedDecisionEnv).toMatchObject({
      OUTER_FLAG: '1'
    });

    expect(mockState.cloudExecutor).toHaveBeenCalledOnce();
    expect(mockState.cloudExecutor).toHaveBeenCalledWith({
      env: options.env,
      pipeline: options.pipeline,
      manifest: options.manifest,
      paths: options.paths,
      target: options.target,
      task: options.task,
      envOverrides: options.envOverrides,
      runEvents: options.runEvents,
      controlWatcher: capturedControlWatcher,
      schedulePersist: capturedSchedulePersist
    });
    expect(result.success).toBe(false);
    expect(result.notes).toEqual(['lifecycle note', 'cloud note']);
  });
});
