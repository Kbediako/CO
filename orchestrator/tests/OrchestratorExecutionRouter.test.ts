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
    const resolveRuntimeSelectionSpy = vi
      .spyOn(runtimeIndex, 'resolveRuntimeSelection')
      .mockResolvedValue(
        createRuntimeSelection({
          requested_mode: 'appserver',
          selected_mode: 'cli',
          source: 'default',
          provider: 'CliRuntimeProvider',
          fallback: {
            occurred: true,
            code: 'appserver-command-unavailable',
            reason: 'Appserver preflight failed.',
            from_mode: 'appserver',
            to_mode: 'cli',
            checked_at: '2026-03-13T00:00:00.000Z'
          },
          env_overrides: { CODEX_FAKE_ROUTER_FLAG: '1' }
        })
      );
    vi.spyOn(cloudPreflight, 'runCloudPreflight').mockResolvedValue({
      ok: false,
      issues: [
        { code: 'missing_environment', message: 'CODEX_CLOUD_ENV_ID is not configured.' },
        { code: 'missing_branch', message: 'CODEX_CLOUD_BRANCH is not configured.' }
      ],
      details: {
        codexBin: 'codex',
        environmentId: null,
        branch: null
      }
    });

    const expectedDetail =
      'Cloud preflight failed; falling back to mcp. ' +
      'CODEX_CLOUD_ENV_ID is not configured. CODEX_CLOUD_BRANCH is not configured.';
    const options = createOptions({
      mode: 'cloud',
      envOverrides: { OUTER_FLAG: '1' }
    });
    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(true);
    expect(result.notes[0]).toBe(expectedDetail);
    expect(result.notes.filter((note) => note === expectedDetail)).toHaveLength(1);
    expect(options.manifest.summary).toContain('Cloud preflight failed; falling back to mcp.');
    expect(options.manifest.status_detail).toBeNull();
    expect(options.manifest.cloud_fallback).toMatchObject({
      mode_requested: 'cloud',
      mode_used: 'mcp',
      reason: expectedDetail,
      issues: [
        { code: 'missing_environment', message: 'CODEX_CLOUD_ENV_ID is not configured.' },
        { code: 'missing_branch', message: 'CODEX_CLOUD_BRANCH is not configured.' }
      ]
    });
    expect(options.manifest.cloud_fallback?.checked_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(options.executeCloudPipeline).not.toHaveBeenCalled();
    expect(mockState.lifecycleRunner).toHaveBeenCalledOnce();
    expect(mockState.lifecycleRunner.mock.calls[0]?.[0].mode).toBe('mcp');
    expect(mockState.lifecycleRunner.mock.calls[0]?.[0].envOverrides).toMatchObject({
      OUTER_FLAG: '1',
      CODEX_FAKE_ROUTER_FLAG: '1'
    });
    expect(resolveRuntimeSelectionSpy).toHaveBeenCalledTimes(2);
    expect(resolveRuntimeSelectionSpy.mock.calls[1]?.[0]).toMatchObject({
      requestedMode: 'cli',
      source: 'default',
      executionMode: 'mcp',
      env: expect.objectContaining({
        OUTER_FLAG: '1',
        CODEX_FAKE_ROUTER_FLAG: '1'
      })
    });
  });

  it('fails fast when cloud preflight fails and fallback is disabled', async () => {
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockResolvedValue(createRuntimeSelection());
    vi.spyOn(cloudPreflight, 'runCloudPreflight').mockResolvedValue({
      ok: false,
      issues: [
        { code: 'missing_environment', message: 'CODEX_CLOUD_ENV_ID is not configured.' },
        { code: 'missing_branch', message: 'CODEX_CLOUD_BRANCH is not configured.' }
      ],
      details: {
        codexBin: 'codex',
        environmentId: null,
        branch: null
      }
    });

    const options = createOptions({
      mode: 'cloud',
      envOverrides: { CODEX_ORCHESTRATOR_CLOUD_FALLBACK: 'deny' }
    });
    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(false);
    expect(result.notes).toEqual([
      'Cloud preflight failed and cloud fallback is disabled. ' +
        'CODEX_CLOUD_ENV_ID is not configured. CODEX_CLOUD_BRANCH is not configured.'
    ]);
    expect(options.manifest.status).toBe('failed');
    expect(options.manifest.status_detail).toBe('cloud-preflight-failed');
    expect(options.manifest.summary).toContain('Cloud preflight failed and cloud fallback is disabled.');
    expect(options.manifest.cloud_fallback).toBeNull();
    expect(options.executeCloudPipeline).not.toHaveBeenCalled();
    expect(mockState.lifecycleRunner).not.toHaveBeenCalled();
    expect(mockState.localExecutor).not.toHaveBeenCalled();
  });

  it('forwards resolved env overrides to the cloud execution route after successful preflight', async () => {
    const runCloudPreflightSpy = vi.spyOn(cloudPreflight, 'runCloudPreflight').mockResolvedValue({
      ok: true,
      issues: [],
      details: {
        codexBin: '/tmp/fake-codex',
        environmentId: 'env-123',
        branch: 'feature/router-preflight'
      }
    });
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockResolvedValue(
      createRuntimeSelection({
        env_overrides: {
          CODEX_FAKE_ROUTER_FLAG: '1',
          CODEX_CLI_BIN: '/tmp/fake-codex',
          CODEX_CLOUD_BRANCH: 'refs/heads/runtime/router-preflight'
        }
      })
    );

    const options = createOptions({
      mode: 'cloud',
      envOverrides: {
        CODEX_CLOUD_BRANCH: 'refs/heads/outer/router-preflight',
        CODEX_CLOUD_ENV_ID: 'env-123'
      }
    });
    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(true);
    expect(runCloudPreflightSpy).toHaveBeenCalledOnce();
    expect(runCloudPreflightSpy).toHaveBeenCalledWith(
      expect.objectContaining({
      repoRoot: '/tmp/repo',
      codexBin: '/tmp/fake-codex',
      environmentId: 'env-123',
      branch: 'refs/heads/runtime/router-preflight',
      env: expect.objectContaining({
        CODEX_FAKE_ROUTER_FLAG: '1',
        CODEX_CLI_BIN: '/tmp/fake-codex',
        CODEX_CLOUD_BRANCH: 'refs/heads/runtime/router-preflight',
        CODEX_CLOUD_ENV_ID: 'env-123'
      })
      })
    );
    expect(options.executeCloudPipeline).toHaveBeenCalledOnce();
    expect(options.executeCloudPipeline.mock.calls[0]?.[0].envOverrides).toMatchObject({
      CODEX_FAKE_ROUTER_FLAG: '1'
    });
    expect(mockState.lifecycleRunner).not.toHaveBeenCalled();
    expect(mockState.localExecutor).not.toHaveBeenCalled();
  });

  it('routes direct mcp execution through the local lifecycle with resolved env overrides', async () => {
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockResolvedValue(
      createRuntimeSelection({
        selected_mode: 'cli',
        provider: 'CliRuntimeProvider',
        env_overrides: { CODEX_FAKE_ROUTER_FLAG: '1' }
      })
    );

    const options = createOptions({ mode: 'mcp' });
    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(true);
    expect(options.executeCloudPipeline).not.toHaveBeenCalled();
    expect(mockState.lifecycleRunner).toHaveBeenCalledOnce();
    expect(mockState.lifecycleRunner.mock.calls[0]?.[0].mode).toBe('mcp');
    expect(mockState.lifecycleRunner.mock.calls[0]?.[0].envOverrides).toMatchObject({
      CODEX_FAKE_ROUTER_FLAG: '1'
    });
    expect(mockState.localExecutor).not.toHaveBeenCalled();
  });

  it('forwards resolved runtime mode and env overrides into the direct local execution body', async () => {
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockResolvedValue(
      createRuntimeSelection({
        selected_mode: 'cli',
        provider: 'CliRuntimeProvider',
        runtime_session_id: 'runtime-123',
        env_overrides: { CODEX_FAKE_ROUTER_FLAG: '1' }
      })
    );
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

    const options = createOptions({ mode: 'mcp' });
    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(true);
    expect(mockState.localExecutor).toHaveBeenCalledOnce();
    expect(mockState.localExecutor.mock.calls[0]?.[0].envOverrides).toMatchObject({
      CODEX_FAKE_ROUTER_FLAG: '1'
    });
    expect(mockState.localExecutor.mock.calls[0]?.[0].runtimeMode).toBe('cli');
    expect(mockState.localExecutor.mock.calls[0]?.[0].runtimeSessionId).toBe('runtime-123');
  });

  it('forwards fallback-adjusted execution and runtime modes to local subpipelines', async () => {
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockResolvedValue(
      createRuntimeSelection({
        requested_mode: 'appserver',
        selected_mode: 'cli',
        source: 'default',
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

  it('adds the runtime fallback summary during local lifecycle beforeStart', async () => {
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockResolvedValue(
      createRuntimeSelection({
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
    );
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

    const options = createOptions({ mode: 'mcp' });
    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(true);
    expect(result.notes).toEqual([
      'Runtime fallback (appserver-command-unavailable): Appserver preflight failed.'
    ]);
    expect(options.manifest.summary).toBe(
      'Runtime fallback (appserver-command-unavailable): Appserver preflight failed.'
    );
  });

  it('passes local auto-scout through with effective env overrides', async () => {
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockResolvedValue(
      createRuntimeSelection({
        selected_mode: 'cli',
        provider: 'CliRuntimeProvider',
        env_overrides: { CODEX_FAKE_ROUTER_FLAG: '1' }
      })
    );
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

    const options = createOptions({
      mode: 'mcp',
      runAutoScout: vi.fn(async () => autoScoutOutcome)
    });
    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(true);
    expect(options.runAutoScout).toHaveBeenCalledOnce();
    expect(options.runAutoScout).toHaveBeenCalledWith(
      expect.objectContaining({
        envOverrides: expect.objectContaining({
          CODEX_FAKE_ROUTER_FLAG: '1'
        })
      })
    );
  });

  it('appends the guardrail recommendation during local lifecycle afterFinalize', async () => {
    vi.spyOn(runtimeIndex, 'resolveRuntimeSelection').mockResolvedValue(
      createRuntimeSelection({
        selected_mode: 'cli',
        provider: 'CliRuntimeProvider'
      })
    );
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

    const options = createOptions({ mode: 'mcp', manifest });
    const result = await routeOrchestratorExecution(options);

    expect(result.success).toBe(true);
    expect(options.manifest.summary).toBe('Guardrails: follow-up required.');
  });
});
