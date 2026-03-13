import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  routeOrchestratorExecution,
  type OrchestratorExecutionRouteOptions
} from '../src/cli/services/orchestratorExecutionRouter.js';
import type { RuntimeSelection } from '../src/cli/runtime/types.js';
import * as runtimeIndex from '../src/cli/runtime/index.js';
import * as cloudPreflight from '../src/cli/utils/cloudPreflight.js';

const mockState = vi.hoisted(() => ({
  lifecycleRunner: vi.fn(),
  localExecutor: vi.fn()
}));

vi.mock('../src/cli/services/orchestratorExecutionLifecycle.js', () => ({
  runOrchestratorExecutionLifecycle: mockState.lifecycleRunner
}));

vi.mock('../src/cli/services/orchestratorLocalPipelineExecutor.js', () => ({
  executeOrchestratorLocalPipeline: mockState.localExecutor
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

function createRuntimeSelection(overrides: Partial<RuntimeSelection> = {}): RuntimeSelection {
  return {
    requested_mode: 'appserver',
    selected_mode: 'appserver',
    source: 'default',
    provider: 'AppServerRuntimeProvider',
    runtime_session_id: null,
    fallback: {
      occurred: false,
      code: null,
      reason: null,
      from_mode: null,
      to_mode: null,
      checked_at: '2026-03-13T00:00:00.000Z'
    },
    env_overrides: {},
    ...overrides
  };
}

function createOptions(
  overrides: Partial<OrchestratorExecutionRouteOptions> = {}
): OrchestratorExecutionRouteOptions {
  const manifest = overrides.manifest ?? createManifest();
  return {
    env: { repoRoot: '/tmp/repo', taskId: 'task-1' } as never,
    pipeline: { id: 'pipeline-1', title: 'Pipeline', stages: [] } as never,
    manifest,
    paths: createPaths(),
    mode: 'mcp',
    runtimeModeRequested: 'appserver',
    runtimeModeSource: 'default',
    target: { id: 'target-1', description: 'Target', metadata: {} } as never,
    task: { id: 'task-1', title: 'Task', metadata: {} } as never,
    applyRuntimeSelection: vi.fn((currentManifest, selection) => {
      currentManifest.runtime_mode_requested = selection.requested_mode;
      currentManifest.runtime_mode = selection.selected_mode;
      currentManifest.runtime_provider = selection.provider;
      currentManifest.runtime_fallback = selection.fallback;
    }),
    executeCloudPipeline: vi.fn(async (cloudOptions) => ({
      success: true,
      notes: ['cloud'],
      manifest: cloudOptions.manifest,
      manifestPath: cloudOptions.paths.manifestPath,
      logPath: cloudOptions.paths.logPath
    })),
    runAutoScout: vi.fn(async () => ({ status: 'recorded', path: 'auto-scout.json' })),
    startSubpipeline: vi.fn(async () => ({
      success: true,
      runSummary: { review: { summary: 'child ok' } },
      manifest: { run_id: 'child-run', status: 'succeeded' }
    })),
    ...overrides
  };
}

describe('routeOrchestratorExecution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockState.lifecycleRunner.mockReset();
    mockState.localExecutor.mockReset();
    mockState.lifecycleRunner.mockImplementation(async (input) => ({
      success: true,
      notes: ['local'],
      manifest: input.manifest,
      manifestPath: input.paths.manifestPath,
      logPath: input.paths.logPath
    }));
    mockState.localExecutor.mockImplementation(async () => ({
      success: true,
      notes: ['local']
    }));
  });

  it('fails fast on runtime selection errors without invoking downstream execution', async () => {
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockRejectedValue(new Error('provider missing'));

    const options = createOptions();
    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(false);
    expect(result.notes).toEqual(['Runtime selection failed: provider missing']);
    expect(options.manifest.status).toBe('failed');
    expect(options.manifest.status_detail).toBe('runtime-selection-failed');
    expect(options.executeCloudPipeline).not.toHaveBeenCalled();
    expect(mockState.lifecycleRunner).not.toHaveBeenCalled();
  });

  it('falls back from cloud preflight failure to the local execution route when allowed', async () => {
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockResolvedValue(createRuntimeSelection());
    vi.spyOn(cloudPreflight, 'runCloudPreflight').mockResolvedValue({
      ok: false,
      issues: [{ code: 'missing_environment', message: 'CODEX_CLOUD_ENV_ID is not configured.' }],
      details: {
        codexBin: 'codex',
        environmentId: null,
        branch: null
      }
    });

    const options = createOptions({ mode: 'cloud' });
    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(true);
    expect(result.notes[0]).toContain('Cloud preflight failed; falling back to mcp.');
    expect(options.manifest.cloud_fallback?.mode_used).toBe('mcp');
    expect(options.executeCloudPipeline).not.toHaveBeenCalled();
    expect(mockState.lifecycleRunner).toHaveBeenCalledOnce();
    expect(mockState.lifecycleRunner.mock.calls[0]?.[0].mode).toBe('mcp');
  });

  it('forwards fallback-adjusted execution and runtime modes to local subpipelines', async () => {
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockResolvedValue(
      createRuntimeSelection({
        requested_mode: 'appserver',
        selected_mode: 'cli',
        source: 'fallback',
        provider: 'CliRuntimeProvider',
        fallback: {
          occurred: true,
          code: 'appserver-command-unavailable',
          reason: 'Appserver preflight failed.',
          from_mode: 'appserver',
          to_mode: 'cli',
          checked_at: '2026-03-13T00:00:00.000Z'
        }
      })
    );
    vi.spyOn(cloudPreflight, 'runCloudPreflight').mockResolvedValue({
      ok: false,
      issues: [{ code: 'missing_environment', message: 'CODEX_CLOUD_ENV_ID is not configured.' }],
      details: {
        codexBin: 'codex',
        environmentId: null,
        branch: null
      }
    });
    mockState.lifecycleRunner.mockImplementation(async (input) => {
      const notes: string[] = [];
      const success = await input.executeBody({
        notes,
        persister: { schedule: vi.fn(async () => undefined) },
        controlWatcher: {
          sync: vi.fn(async () => undefined),
          waitForResume: vi.fn(async () => undefined),
          isCanceled: vi.fn(() => false)
        },
        schedulePersist: vi.fn(async () => undefined)
      });
      return {
        success,
        notes,
        manifest: input.manifest,
        manifestPath: input.paths.manifestPath,
        logPath: input.paths.logPath
      };
    });
    mockState.localExecutor.mockImplementation(async (input) => {
      await input.startSubpipeline('child-pipeline');
      return {
        success: true,
        notes: ['local']
      };
    });

    const manifest = createManifest();
    manifest.commands = [
      {
        index: 0,
        status: 'pending',
        started_at: null,
        completed_at: null,
        summary: null,
        log_path: null,
        exit_code: null,
        command: null,
        sub_run_id: null
      }
    ];

    const options = createOptions({
      mode: 'cloud',
      executionModeOverride: 'cloud',
      runtimeModeRequested: 'appserver',
      manifest,
      pipeline: {
        id: 'pipeline-1',
        title: 'Pipeline',
        stages: [{ kind: 'subpipeline', id: 'child-stage', title: 'Child stage', pipeline: 'child-pipeline' }]
      } as never
    });

    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(true);
    expect(mockState.localExecutor).toHaveBeenCalledOnce();
    expect(mockState.localExecutor.mock.calls[0]?.[0].runtimeMode).toBe('cli');
    expect(options.startSubpipeline).toHaveBeenCalledWith({
      pipelineId: 'child-pipeline',
      executionModeOverride: 'mcp',
      runtimeModeRequested: 'cli'
    });
  });
});
