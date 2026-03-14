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

function createOptions(overrides: Record<string, unknown> = {}) {
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
    },
    ...overrides
  };
}

describe('runOrchestratorCloudExecutionLifecycleShell', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockState.lifecycleRunner.mockReset();
    mockState.cloudExecutor.mockReset();
  });

  it('forwards the lifecycle contract with merged advanced decision env state', async () => {
    const previousProcessOnly = process.env.CLOUD_SHELL_PROCESS_ONLY;
    const previousShared = process.env.CLOUD_SHELL_SHARED;
    process.env.CLOUD_SHELL_PROCESS_ONLY = 'process-only';
    process.env.CLOUD_SHELL_SHARED = 'process-value';

    try {
      const autoScoutOutcome = { status: 'recorded' as const, path: 'out/auto-scout.json' };
      const runAutoScout = vi.fn(async () => autoScoutOutcome);
      const options = createOptions({
        envOverrides: {
          OUTER_FLAG: '1',
          CLOUD_SHELL_SHARED: 'override-value'
        },
        runAutoScout
      });
      mockState.lifecycleRunner.mockImplementation(async (input) => ({
        success: true,
        notes: ['lifecycle note'],
        manifest: input.manifest,
        manifestPath: input.paths.manifestPath,
        logPath: input.paths.logPath
      }));

      const result = await runOrchestratorCloudExecutionLifecycleShell(options);

      expect(result.success).toBe(true);
      expect(result.notes).toEqual(['lifecycle note']);
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
        runAutoScout
      });
      expect(lifecycleInput.advancedDecisionEnv).toMatchObject({
        CLOUD_SHELL_PROCESS_ONLY: 'process-only',
        CLOUD_SHELL_SHARED: 'override-value',
        OUTER_FLAG: '1'
      });

      const autoScoutInput = {
        env: options.env,
        paths: options.paths,
        manifest: options.manifest,
        mode: options.mode,
        pipeline: options.pipeline,
        target: options.target,
        task: options.task,
        advancedDecision: { mode: 'auto' } as never
      };
      const actualAutoScoutOutcome = await lifecycleInput.runAutoScout(autoScoutInput);

      expect(runAutoScout).toHaveBeenCalledOnce();
      expect(runAutoScout).toHaveBeenCalledWith(autoScoutInput);
      expect(actualAutoScoutOutcome).toBe(autoScoutOutcome);
      expect(mockState.cloudExecutor).not.toHaveBeenCalled();
    } finally {
      if (previousProcessOnly === undefined) {
        delete process.env.CLOUD_SHELL_PROCESS_ONLY;
      } else {
        process.env.CLOUD_SHELL_PROCESS_ONLY = previousProcessOnly;
      }

      if (previousShared === undefined) {
        delete process.env.CLOUD_SHELL_SHARED;
      } else {
        process.env.CLOUD_SHELL_SHARED = previousShared;
      }
    }
  });

  it('passes the cloud executor through executeBody and appends notes after lifecycle notes', async () => {
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
