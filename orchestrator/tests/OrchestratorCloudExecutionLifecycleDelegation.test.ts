import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  runCloudLifecycleShell: vi.fn()
}));

vi.mock('../src/cli/services/orchestratorCloudExecutionLifecycleShell.js', () => ({
  runOrchestratorCloudExecutionLifecycleShell: mockState.runCloudLifecycleShell
}));

import { CodexOrchestrator } from '../src/cli/orchestrator.js';

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
    envOverrides: {
      OUTER_FLAG: '1'
    }
  };
}

type CloudExecutionDelegationHarness = {
  executeCloudPipeline: (options: ReturnType<typeof createOptions>) => Promise<unknown>;
  runAutoScout: (params: { probe: string }) => Promise<unknown>;
};

describe('CodexOrchestrator.executeCloudPipeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockState.runCloudLifecycleShell.mockReset();
  });

  it('delegates to the extracted cloud execution lifecycle helper', async () => {
    const options = createOptions();
    const orchestrator = new CodexOrchestrator(options.env);
    const harness = orchestrator as unknown as CloudExecutionDelegationHarness;
    const expectedResult = {
      success: true,
      notes: ['delegated'],
      manifest: options.manifest,
      manifestPath: options.paths.manifestPath,
      logPath: options.paths.logPath
    };
    mockState.runCloudLifecycleShell.mockResolvedValue(expectedResult);
    const autoScoutSpy = vi
      .spyOn(harness, 'runAutoScout')
      .mockResolvedValue({ status: 'recorded', path: 'out/auto-scout.json' });

    const result = await harness.executeCloudPipeline(options);

    expect(result).toBe(expectedResult);
    expect(mockState.runCloudLifecycleShell).toHaveBeenCalledOnce();
    const helperInput = mockState.runCloudLifecycleShell.mock.calls[0]?.[0];
    expect(helperInput).toMatchObject(options);
    expect(helperInput.runAutoScout).toEqual(expect.any(Function));
    await helperInput.runAutoScout({ probe: 'value' });
    expect(autoScoutSpy).toHaveBeenCalledOnce();
    expect(autoScoutSpy).toHaveBeenCalledWith({ probe: 'value' });
  });
});
