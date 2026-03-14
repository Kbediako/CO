import { beforeEach, describe, expect, it, vi } from 'vitest';

import { routeOrchestratorExecution } from '../src/cli/services/orchestratorExecutionRouteDecisionShell.js';
import type { OrchestratorExecutionRouteOptions } from '../src/cli/services/orchestratorExecutionRouter.js';
import type { RuntimeSelection } from '../src/cli/runtime/types.js';
import type { OrchestratorExecutionRouteState } from '../src/cli/services/orchestratorExecutionRouteState.js';

const mockState = vi.hoisted(() => ({
  resolveRouteState: vi.fn(),
  cloudRouteShell: vi.fn(),
  localRouteShell: vi.fn()
}));

vi.mock('../src/cli/services/orchestratorExecutionRouteState.js', () => ({
  resolveOrchestratorExecutionRouteState: mockState.resolveRouteState
}));

vi.mock('../src/cli/services/orchestratorCloudRouteShell.js', () => ({
  executeOrchestratorCloudRouteShell: mockState.cloudRouteShell
}));

vi.mock('../src/cli/services/orchestratorLocalRouteShell.js', () => ({
  executeOrchestratorLocalRouteShell: mockState.localRouteShell
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
    cloud_fallback: null,
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

function createRouteState(
  overrides: Partial<OrchestratorExecutionRouteState> = {}
): OrchestratorExecutionRouteState {
  return {
    runtimeSelection: createRuntimeSelection(),
    effectiveEnvOverrides: {},
    effectiveMergedEnv: {},
    ...overrides
  };
}

function createResult(options: OrchestratorExecutionRouteOptions, notes: string[]) {
  return {
    success: true,
    notes,
    manifest: options.manifest,
    manifestPath: options.paths.manifestPath,
    logPath: options.paths.logPath
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
    executeCloudPipeline: vi.fn(async (cloudOptions) => createResult(cloudOptions, ['cloud'])),
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
    mockState.resolveRouteState.mockReset();
    mockState.cloudRouteShell.mockReset();
    mockState.localRouteShell.mockReset();
  });

  it('fails fast when runtime selection cannot be resolved', async () => {
    mockState.resolveRouteState.mockRejectedValue(new Error('provider missing'));

    const options = createOptions();
    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(false);
    expect(result.notes).toEqual(['Runtime selection failed: provider missing']);
    expect(options.manifest.status).toBe('failed');
    expect(options.manifest.status_detail).toBe('runtime-selection-failed');
    expect(options.manifest.summary).toBe('Runtime selection failed: provider missing');
    expect(mockState.cloudRouteShell).not.toHaveBeenCalled();
    expect(mockState.localRouteShell).not.toHaveBeenCalled();
  });

  it('forwards resolved mcp state to the local route shell', async () => {
    const state = createRouteState({
      effectiveEnvOverrides: { ROUTER_FLAG: '1' },
      effectiveMergedEnv: { ROUTER_FLAG: '1' } as NodeJS.ProcessEnv
    });
    mockState.resolveRouteState.mockResolvedValue(state);

    const options = createOptions({ mode: 'mcp' });
    const expected = createResult(options, ['local']);
    mockState.localRouteShell.mockResolvedValue(expected);

    const result = await routeOrchestratorExecution(options);

    expect(result).toBe(expected);
    expect(mockState.resolveRouteState).toHaveBeenCalledWith({
      repoRoot: options.env.repoRoot,
      manifest: options.manifest,
      mode: 'mcp',
      runtimeModeRequested: options.runtimeModeRequested,
      runtimeModeSource: options.runtimeModeSource,
      envOverrides: options.envOverrides,
      applyRuntimeSelection: options.applyRuntimeSelection
    });
    expect(mockState.localRouteShell).toHaveBeenCalledWith({ ...options, state });
    expect(mockState.cloudRouteShell).not.toHaveBeenCalled();
  });

  it('forwards resolved cloud state and callback wiring to the cloud route shell', async () => {
    const state = createRouteState({
      effectiveEnvOverrides: { ROUTER_FLAG: '1' },
      effectiveMergedEnv: { ROUTER_FLAG: '1' } as NodeJS.ProcessEnv
    });
    mockState.resolveRouteState.mockResolvedValue(state);
    mockState.cloudRouteShell.mockImplementation(async (input) => {
      expect(input.repoRoot).toBe('/tmp/repo');
      expect(input.task).toBe(options.task);
      expect(input.target).toBe(options.target);
      expect(input.manifest).toBe(options.manifest);
      expect(input.state).toBe(state);
      expect(typeof input.executeCloudPipeline).toBe('function');
      expect(typeof input.reroute).toBe('function');
      expect(typeof input.failExecutionRoute).toBe('function');
      return await input.executeCloudPipeline({ CLOUD_FLAG: '1' });
    });

    const options = createOptions({ mode: 'cloud' });
    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(true);
    expect(result.notes).toEqual(['cloud']);
    expect(mockState.cloudRouteShell).toHaveBeenCalledOnce();
    expect(options.executeCloudPipeline).toHaveBeenCalledWith({
      ...options,
      envOverrides: { CLOUD_FLAG: '1' }
    });
    expect(mockState.localRouteShell).not.toHaveBeenCalled();
  });

  it('re-enters the decision shell when the cloud route requests a fallback reroute', async () => {
    const initialState = createRouteState();
    const reroutedState = createRouteState({
      runtimeSelection: createRuntimeSelection({
        selected_mode: 'cli',
        provider: 'CliRuntimeProvider'
      }),
      effectiveEnvOverrides: { REROUTED_FLAG: '1' },
      effectiveMergedEnv: { REROUTED_FLAG: '1' } as NodeJS.ProcessEnv
    });
    mockState.resolveRouteState
      .mockResolvedValueOnce(initialState)
      .mockResolvedValueOnce(reroutedState);

    const options = createOptions({ mode: 'cloud' });
    mockState.cloudRouteShell.mockImplementation(async (input) =>
      input.reroute({
        mode: 'mcp',
        executionModeOverride: 'mcp',
        runtimeModeRequested: 'cli',
        runtimeModeSource: 'default',
        envOverrides: { REROUTED_FLAG: '1' }
      })
    );
    const expected = createResult(
      {
        ...options,
        mode: 'mcp',
        executionModeOverride: 'mcp',
        runtimeModeRequested: 'cli',
        envOverrides: { REROUTED_FLAG: '1' }
      } as OrchestratorExecutionRouteOptions,
      ['local-reroute']
    );
    mockState.localRouteShell.mockResolvedValue(expected);

    const result = await routeOrchestratorExecution(options);

    expect(result).toBe(expected);
    expect(mockState.resolveRouteState).toHaveBeenCalledTimes(2);
    expect(mockState.localRouteShell).toHaveBeenCalledWith({
      ...options,
      mode: 'mcp',
      executionModeOverride: 'mcp',
      runtimeModeRequested: 'cli',
      runtimeModeSource: 'default',
      envOverrides: { REROUTED_FLAG: '1' },
      state: reroutedState
    });
  });
});
