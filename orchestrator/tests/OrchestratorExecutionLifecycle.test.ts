import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runOrchestratorExecutionLifecycle } from '../src/cli/services/orchestratorExecutionLifecycle.js';

const controlWatcher = {
  sync: vi.fn(async () => undefined),
  waitForResume: vi.fn(async () => undefined),
  isCanceled: vi.fn(() => false)
};

vi.mock('../src/cli/control/controlWatcher.js', () => ({
  ControlWatcher: vi.fn().mockImplementation(() => controlWatcher)
}));

vi.mock('../src/cli/events/runEvents.js', () => ({
  snapshotStages: vi.fn(() => [{ id: 'stage-1', status: 'pending' }])
}));

vi.mock('../src/cli/metrics/metricsRecorder.js', () => ({
  appendMetricsEntry: vi.fn(async () => undefined)
}));

vi.mock('../src/cli/services/pipelineExperience.js', () => ({
  persistPipelineExperience: vi.fn(async () => undefined)
}));

vi.mock('../src/cli/utils/advancedAutopilot.js', () => ({
  resolveAdvancedAutopilotDecision: vi.fn(() => ({
    mode: 'auto',
    source: 'default',
    enabled: false,
    autoScout: false,
    reason: 'default'
  }))
}));

function createManifest() {
  return {
    task_id: 'task-1',
    run_id: 'run-1',
    status: 'pending',
    status_detail: null,
    summary: null,
    commands: [],
    child_runs: [],
    prompt_packs: [],
    heartbeat_interval_seconds: 60,
    heartbeat_at: null,
    guardrail_status: undefined
  } as never;
}

function createPaths() {
  return {
    runDir: '/tmp/repo/.runs/task-1/run-1',
    manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
    logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
  } as never;
}

describe('runOrchestratorExecutionLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controlWatcher.sync.mockResolvedValue(undefined);
    controlWatcher.waitForResume.mockResolvedValue(undefined);
    controlWatcher.isCanceled.mockReturnValue(false);
  });

  it('runs the shared lifecycle, emits autoscout notes, and persists final experience/metrics', async () => {
    const { resolveAdvancedAutopilotDecision } = await import('../src/cli/utils/advancedAutopilot.js');
    const { appendMetricsEntry } = await import('../src/cli/metrics/metricsRecorder.js');
    const { persistPipelineExperience } = await import('../src/cli/services/pipelineExperience.js');

    vi.mocked(resolveAdvancedAutopilotDecision).mockReturnValue({
      mode: 'on',
      source: 'env',
      enabled: true,
      autoScout: true,
      reason: 'forced on via env'
    });

    const manifest = createManifest();
    const paths = createPaths();
    const persister = {
      schedule: vi.fn(async () => undefined)
    } as never;
    const runStarted = vi.fn();
    const runAutoScout = vi.fn(async () => ({
      status: 'recorded' as const,
      path: 'out/task-1/auto-scout.json'
    }));

    const result = await runOrchestratorExecutionLifecycle({
      env: { repoRoot: '/tmp/repo' } as never,
      pipeline: { id: 'docs-review', title: 'Docs Review', stages: [] } as never,
      manifest,
      paths,
      mode: 'mcp',
      target: { id: 'target-1', description: 'Target', metadata: {} } as never,
      task: { id: 'task-1', title: 'Task', metadata: {} } as never,
      runEvents: { runStarted } as never,
      persister,
      envOverrides: { FOO: 'bar' },
      advancedDecisionEnv: { CODEX_ORCHESTRATOR_ADVANCED_MODE: 'on' } as never,
      beforeStart: ({ notes }) => {
        notes.push('before-start');
      },
      executeBody: async ({ notes }) => {
        notes.push('body-ran');
        return true;
      },
      runAutoScout,
      afterFinalize: () => undefined,
      defaultFailureStatusDetail: 'pipeline-failed'
    });

    expect(result.success).toBe(true);
    expect(result.notes).toEqual([
      'before-start',
      'Advanced mode (on) enabled: forced on via env.',
      'Auto scout: evidence recorded at out/task-1/auto-scout.json.',
      'body-ran'
    ]);
    expect(runStarted).toHaveBeenCalledOnce();
    expect(runAutoScout).toHaveBeenCalledOnce();
    expect(manifest.status).toBe('succeeded');
    expect(vi.mocked(persistPipelineExperience)).toHaveBeenCalledOnce();
    expect(vi.mocked(appendMetricsEntry)).toHaveBeenCalledOnce();
    expect(persister.schedule).toHaveBeenCalled();
  });

  it('marks cloud runs in progress before persisting advanced-mode startup notes', async () => {
    const { resolveAdvancedAutopilotDecision } = await import('../src/cli/utils/advancedAutopilot.js');

    vi.mocked(resolveAdvancedAutopilotDecision).mockReturnValue({
      mode: 'on',
      source: 'env',
      enabled: true,
      autoScout: false,
      reason: 'forced on via env'
    });

    const manifest = createManifest();
    const snapshots: Array<{ status: string; summary: string | null }> = [];
    const persister = {
      schedule: vi.fn(async () => {
        snapshots.push({ status: manifest.status, summary: manifest.summary });
      })
    } as never;

    await runOrchestratorExecutionLifecycle({
      env: { repoRoot: '/tmp/repo' } as never,
      pipeline: { id: 'cloud-review', title: 'Cloud Review', stages: [] } as never,
      manifest,
      paths: createPaths(),
      mode: 'cloud',
      target: { id: 'target-1', description: 'Target', metadata: {} } as never,
      task: { id: 'task-1', title: 'Task', metadata: {} } as never,
      persister,
      advancedDecisionEnv: { CODEX_ORCHESTRATOR_ADVANCED_MODE: 'on' } as never,
      executeBody: async () => true,
      runAutoScout: vi.fn(async () => ({ status: 'error' as const, message: 'unused' })),
      defaultFailureStatusDetail: 'cloud-execution-failed'
    });

    expect(snapshots[0]).toEqual({
      status: 'in_progress',
      summary: 'Advanced mode (on) enabled: forced on via env.'
    });
  });

  it('uses the provided default failure detail when the body reports failure', async () => {
    const manifest = createManifest();

    const result = await runOrchestratorExecutionLifecycle({
      env: { repoRoot: '/tmp/repo' } as never,
      pipeline: { id: 'simple', title: 'Simple', stages: [] } as never,
      manifest,
      paths: createPaths(),
      mode: 'mcp',
      target: { id: 'target-1', description: 'Target', metadata: {} } as never,
      task: { id: 'task-1', title: 'Task', metadata: {} } as never,
      persister: { schedule: vi.fn(async () => undefined) } as never,
      advancedDecisionEnv: {} as never,
      executeBody: async () => false,
      runAutoScout: vi.fn(async () => ({ status: 'error' as const, message: 'unused' })),
      defaultFailureStatusDetail: 'pipeline-failed'
    });

    expect(result.success).toBe(false);
    expect(manifest.status).toBe('failed');
    expect(manifest.status_detail).toBe('pipeline-failed');
  });

  it('finalizes as cancelled when the control watcher reports cancellation after the body', async () => {
    controlWatcher.isCanceled.mockReturnValue(true);
    const manifest = createManifest();

    const result = await runOrchestratorExecutionLifecycle({
      env: { repoRoot: '/tmp/repo' } as never,
      pipeline: { id: 'simple', title: 'Simple', stages: [] } as never,
      manifest,
      paths: createPaths(),
      mode: 'mcp',
      target: { id: 'target-1', description: 'Target', metadata: {} } as never,
      task: { id: 'task-1', title: 'Task', metadata: {} } as never,
      persister: { schedule: vi.fn(async () => undefined) } as never,
      advancedDecisionEnv: {} as never,
      executeBody: async () => true,
      runAutoScout: vi.fn(async () => ({ status: 'error' as const, message: 'unused' })),
      defaultFailureStatusDetail: 'pipeline-failed'
    });

    expect(result.success).toBe(true);
    expect(manifest.status).toBe('cancelled');
    expect(manifest.status_detail).toBe('run-canceled');
  });
});
