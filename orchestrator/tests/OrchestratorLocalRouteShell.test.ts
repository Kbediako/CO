import { beforeEach, describe, expect, it, vi } from 'vitest';

import { executeOrchestratorLocalRouteShell } from '../src/cli/services/orchestratorLocalRouteShell.js';
import type { OrchestratorExecutionRouteState } from '../src/cli/services/orchestratorExecutionRouteState.js';
import type { RuntimeSelection } from '../src/cli/runtime/types.js';

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
    cloud_fallback: null,
    heartbeat_interval_seconds: 60,
    heartbeat_at: null,
    guardrail_status: undefined
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
      checked_at: '2026-03-14T00:00:00.000Z'
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

function createOptions(overrides: Record<string, unknown> = {}) {
  const manifest = (overrides.manifest as ReturnType<typeof createManifest> | undefined) ?? createManifest();
  return {
    env: { repoRoot: '/tmp/repo', taskId: 'task-1' } as never,
    pipeline: { id: 'pipeline-1', title: 'Pipeline', stages: [] } as never,
    manifest,
    paths: {
      runDir: '/tmp/repo/.runs/task-1/run-1',
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
    } as never,
    mode: 'mcp' as const,
    target: { id: 'target-1', description: 'Target', metadata: {} } as never,
    task: { id: 'task-1', title: 'Task', metadata: {} } as never,
    runEvents: undefined,
    eventStream: undefined,
    onEventEntry: undefined,
    persister: undefined,
    state: createRouteState(),
    runAutoScout: vi.fn(async () => ({ status: 'recorded' as const, path: 'auto-scout.json' })),
    startSubpipeline: vi.fn(async () => ({
      success: true,
      runSummary: { review: { summary: 'child ok' } },
      manifest: { run_id: 'child-run', status: 'succeeded' }
    })),
    ...overrides
  };
}

describe('executeOrchestratorLocalRouteShell', () => {
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

  it('adds the runtime fallback summary during local lifecycle beforeStart', async () => {
    mockState.lifecycleRunner.mockImplementation(async (input) => {
      const notes: string[] = [];
      input.beforeStart?.({ notes });
      return {
        success: true,
        notes,
        manifest: input.manifest,
        manifestPath: input.paths.manifestPath,
        logPath: input.paths.logPath
      };
    });

    const options = createOptions({
      state: createRouteState({
        runtimeSelection: createRuntimeSelection({
          selected_mode: 'cli',
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
      })
    });

    const result = await executeOrchestratorLocalRouteShell(options);

    expect(result.success).toBe(true);
    expect(result.notes).toEqual([
      'Runtime fallback (appserver-command-unavailable): Appserver preflight failed.'
    ]);
    expect(options.manifest.summary).toBe(
      'Runtime fallback (appserver-command-unavailable): Appserver preflight failed.'
    );
  });

  it('passes local auto-scout through with effective env overrides', async () => {
    const autoScoutOutcome = { status: 'recorded' as const, path: 'auto-scout.json' };
    mockState.lifecycleRunner.mockImplementation(async (input) => {
      await input.runAutoScout({
        env: input.env,
        paths: input.paths,
        manifest: input.manifest,
        mode: input.mode,
        pipeline: input.pipeline,
        target: input.target,
        task: input.task,
        advancedDecision: { mode: 'auto' } as never
      });
      return {
        success: true,
        notes: [],
        manifest: input.manifest,
        manifestPath: input.paths.manifestPath,
        logPath: input.paths.logPath
      };
    });

    const runAutoScout = vi.fn(async () => autoScoutOutcome);
    const options = createOptions({
      state: createRouteState({
        runtimeSelection: createRuntimeSelection({
          selected_mode: 'cli',
          provider: 'CliRuntimeProvider'
        }),
        effectiveEnvOverrides: { CODEX_FAKE_ROUTER_FLAG: '1' }
      }),
      runAutoScout
    });

    const result = await executeOrchestratorLocalRouteShell(options);

    expect(result.success).toBe(true);
    expect(runAutoScout).toHaveBeenCalledOnce();
    expect(runAutoScout).toHaveBeenCalledWith(
      expect.objectContaining({
        envOverrides: expect.objectContaining({
          CODEX_FAKE_ROUTER_FLAG: '1'
        })
      })
    );
  });

  it('forwards local executor wiring, runtime selection, and child subpipeline routing', async () => {
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

    const startSubpipeline = vi.fn(async () => ({
      success: true,
      runSummary: { review: { summary: 'child ok' } },
      manifest: { run_id: 'child-run', status: 'succeeded' }
    }));
    const options = createOptions({
      executionModeOverride: 'mcp',
      state: createRouteState({
        runtimeSelection: createRuntimeSelection({
          selected_mode: 'cli',
          provider: 'CliRuntimeProvider',
          runtime_session_id: 'runtime-123'
        }),
        effectiveEnvOverrides: { CODEX_FAKE_ROUTER_FLAG: '1' },
        effectiveMergedEnv: {
          CODEX_FAKE_ROUTER_FLAG: '1',
          CODEX_CLOUD_ENV_ID: 'env-123'
        }
      }),
      startSubpipeline
    });

    const result = await executeOrchestratorLocalRouteShell(options);

    expect(result.success).toBe(true);
    expect(result.notes).toContain('local');
    expect(mockState.lifecycleRunner.mock.calls[0]?.[0].advancedDecisionEnv).toMatchObject({
      CODEX_FAKE_ROUTER_FLAG: '1',
      CODEX_CLOUD_ENV_ID: 'env-123'
    });
    expect(mockState.localExecutor).toHaveBeenCalledOnce();
    expect(mockState.localExecutor.mock.calls[0]?.[0].envOverrides).toMatchObject({
      CODEX_FAKE_ROUTER_FLAG: '1'
    });
    expect(mockState.localExecutor.mock.calls[0]?.[0].runtimeMode).toBe('cli');
    expect(mockState.localExecutor.mock.calls[0]?.[0].runtimeSessionId).toBe('runtime-123');
    expect(startSubpipeline).toHaveBeenCalledWith({
      pipelineId: 'child-pipeline',
      executionModeOverride: 'mcp',
      runtimeModeRequested: 'cli'
    });
  });

  it('appends the guardrail recommendation during local lifecycle afterFinalize', async () => {
    mockState.lifecycleRunner.mockImplementation(async (input) => {
      input.afterFinalize?.();
      return {
        success: true,
        notes: [],
        manifest: input.manifest,
        manifestPath: input.paths.manifestPath,
        logPath: input.paths.logPath
      };
    });

    const manifest = createManifest();
    manifest.guardrail_status = {
      present: true,
      recommendation: 'Guardrails: follow-up required.',
      summary: 'Guardrails: 0 succeeded, 1 failed.',
      computed_at: '2026-03-14T00:00:00.000Z',
      counts: {
        total: 1,
        succeeded: 0,
        failed: 1,
        skipped: 0,
        other: 0
      }
    };
    const options = createOptions({ manifest });

    const result = await executeOrchestratorLocalRouteShell(options);

    expect(result.success).toBe(true);
    expect(options.manifest.summary).toBe('Guardrails: follow-up required.');
  });
});
