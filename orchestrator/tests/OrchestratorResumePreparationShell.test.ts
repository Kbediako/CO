import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PipelineResolver } from '../src/cli/services/pipelineResolver.js';
import type { ManifestPersister } from '../src/cli/run/manifestPersister.js';
import { runOrchestratorResumePreparationShell } from '../src/cli/services/orchestratorResumePreparationShell.js';

afterEach(() => {
  delete process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE;
  delete process.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED;
  vi.restoreAllMocks();
});

describe('runOrchestratorResumePreparationShell', () => {
  it('prepares resume inputs, mutates the manifest in order, and schedules persistence', async () => {
    const baseEnv = {
      repoRoot: '/tmp/repo',
      taskId: 'task-base',
      runsRoot: '/tmp/repo/.runs',
      outRoot: '/tmp/repo/out'
    } as never;
    const actualEnv = {
      repoRoot: '/tmp/repo',
      taskId: 'task-1',
      runsRoot: '/tmp/repo/.runs',
      outRoot: '/tmp/repo/out'
    } as never;
    const manifest = {
      task_id: 'task-1',
      pipeline_id: 'pipeline-1',
      plan_target_id: 'manifest-target',
      runtime_mode_requested: 'appserver',
      runtime_mode: 'appserver',
      heartbeat_interval_seconds: 2,
      summary: 'existing summary',
      run_id: 'run-1'
    } as never;
    const paths = {
      runDir: '/tmp/repo/.runs/task-1/run-1',
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
    } as never;
    const pipeline = { id: 'pipeline-1', title: 'Pipeline 1', stages: [] } as never;
    const resolver = {
      loadDesignConfig: vi.fn(async () => ({ label: 'design-config' })),
      resolveDesignEnvOverrides: vi.fn(() => ({ DESIGN_PIPELINE: '1' }))
    } as unknown as PipelineResolver;
    const preparation = {
      env: actualEnv,
      pipeline,
      pipelineSource: null,
      runtimeModeDefault: 'appserver',
      configNotice: 'repo config active',
      envOverrides: { RESUME_OVERRIDE: '1' },
      planner: { label: 'planner' },
      plannerTargetId: 'planner-target',
      taskContext: { id: 'task-1', title: 'Task 1', metadata: {} },
      metadata: { id: 'task-1', slug: 'task-1', title: 'Task 1' },
      resolver,
      planPreview: { items: [], targetId: 'preview-target' }
    } as never;
    const persistOrder: string[] = [];
    const validateResumeToken = vi.fn(async () => {
      persistOrder.push('validate');
    });
    const recordResumeEventImpl = vi.fn(() => {
      persistOrder.push('record');
    });
    const resetForResumeImpl = vi.fn(() => {
      persistOrder.push('reset');
    });
    const updateHeartbeatImpl = vi.fn(() => {
      persistOrder.push('heartbeat');
    });
    const schedule = vi.fn(async () => {
      persistOrder.push('schedule');
    });
    const persister = { schedule } as unknown as ManifestPersister;
    const appendSummaryImpl = vi.fn();
    const applyRequestedRuntimeMode = vi.fn();
    const prepareRunImpl = vi.fn(async () => preparation);
    const resolveRuntimeModeImpl = vi.fn(() => ({ mode: 'cli', source: 'flag' as const }));

    const result = await runOrchestratorResumePreparationShell({
      baseEnv,
      options: {
        runId: 'run-1',
        resumeToken: 'token-1',
        actor: 'operator',
        reason: 'manual-resume',
        targetStageId: 'stage-1',
        runtimeMode: 'cli'
      },
      validateResumeToken,
      applyRequestedRuntimeMode,
      loadManifestImpl: vi.fn(async () => ({ manifest, paths })),
      overrideTaskEnvironmentImpl: vi.fn(() => actualEnv),
      createResolver: () => resolver,
      isRepoConfigRequiredImpl: vi.fn(() => false),
      loadUserConfigImpl: vi.fn(async () => ({ source: 'repo', runtimeMode: 'appserver' })),
      loadPackageConfigImpl: vi.fn(async () => null),
      resolvePipelineForResumeImpl: vi.fn(() => pipeline),
      recordResumeEventImpl,
      resetForResumeImpl,
      updateHeartbeatImpl,
      prepareRunImpl,
      resolveRuntimeModeImpl,
      appendSummaryImpl,
      createPersister: vi.fn(() => persister)
    });

    expect(validateResumeToken).toHaveBeenCalledWith(paths, manifest, 'token-1');
    expect(persistOrder).toEqual(['validate', 'record', 'reset', 'heartbeat', 'schedule']);
    expect(prepareRunImpl).toHaveBeenCalledWith({
      baseEnv: actualEnv,
      pipeline,
      runtimeModeDefault: 'appserver',
      resolver,
      taskIdOverride: 'task-1',
      targetStageId: 'stage-1',
      planTargetFallback: 'manifest-target',
      envOverrides: { DESIGN_PIPELINE: '1' }
    });
    expect(resolveRuntimeModeImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        flag: 'cli',
        configDefault: 'appserver',
        manifestMode: 'appserver',
        preferManifest: true,
        env: expect.objectContaining({ RESUME_OVERRIDE: '1' })
      })
    );
    expect(applyRequestedRuntimeMode).toHaveBeenCalledWith(manifest, 'cli');
    expect(appendSummaryImpl).toHaveBeenCalledWith(manifest, 'repo config active');
    expect(schedule).toHaveBeenCalledWith({ manifest: true, heartbeat: true, force: true });
    expect(manifest.plan_target_id).toBe('preview-target');
    expect(result).toEqual({
      preparation,
      runtimeModeResolution: { mode: 'cli', source: 'flag' },
      manifest,
      paths,
      persister
    });
  });

  it('aborts before resume mutation when token validation fails', async () => {
    const manifest = {
      task_id: 'task-1',
      pipeline_id: 'pipeline-1',
      plan_target_id: null,
      runtime_mode_requested: 'appserver',
      runtime_mode: 'appserver',
      heartbeat_interval_seconds: 1,
      run_id: 'run-1'
    } as never;
    const paths = {
      runDir: '/tmp/repo/.runs/task-1/run-1',
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
    } as never;
    const resolver = {
      loadDesignConfig: vi.fn(async () => ({ label: 'design-config' })),
      resolveDesignEnvOverrides: vi.fn(() => ({}))
    } as unknown as PipelineResolver;
    const validateResumeToken = vi.fn(async () => {
      throw new Error('token mismatch');
    });
    const recordResumeEventImpl = vi.fn();
    const resetForResumeImpl = vi.fn();
    const updateHeartbeatImpl = vi.fn();
    const prepareRunImpl = vi.fn();
    const createPersister = vi.fn();

    await expect(
      runOrchestratorResumePreparationShell({
        baseEnv: {
          repoRoot: '/tmp/repo',
          taskId: 'task-base',
          runsRoot: '/tmp/repo/.runs',
          outRoot: '/tmp/repo/out'
        } as never,
        options: { runId: 'run-1' },
        validateResumeToken,
        applyRequestedRuntimeMode: vi.fn(),
        loadManifestImpl: vi.fn(async () => ({ manifest, paths })),
        overrideTaskEnvironmentImpl: vi.fn((env) => ({ ...env, taskId: 'task-1' })),
        createResolver: () => resolver,
        isRepoConfigRequiredImpl: vi.fn(() => false),
        loadUserConfigImpl: vi.fn(async () => ({ source: 'repo', runtimeMode: 'appserver' })),
        loadPackageConfigImpl: vi.fn(async () => null),
        resolvePipelineForResumeImpl: vi.fn(() => ({ id: 'pipeline-1', title: 'Pipeline 1', stages: [] } as never)),
        recordResumeEventImpl,
        resetForResumeImpl,
        updateHeartbeatImpl,
        prepareRunImpl,
        createPersister
      })
    ).rejects.toThrow('token mismatch');

    expect(recordResumeEventImpl).not.toHaveBeenCalled();
    expect(resetForResumeImpl).not.toHaveBeenCalled();
    expect(updateHeartbeatImpl).not.toHaveBeenCalled();
    expect(prepareRunImpl).not.toHaveBeenCalled();
    expect(createPersister).not.toHaveBeenCalled();
  });

  it('uses manifest-preferred runtime mode, skips duplicate config notices, and clamps the persister interval', async () => {
    delete process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE;

    const manifest = {
      task_id: 'task-1',
      pipeline_id: 'pipeline-1',
      plan_target_id: null,
      runtime_mode_requested: 'cli',
      runtime_mode: 'appserver',
      heartbeat_interval_seconds: 0.25,
      summary: 'repo config active',
      run_id: 'run-2'
    } as never;
    const paths = {
      runDir: '/tmp/repo/.runs/task-1/run-2',
      manifestPath: '/tmp/repo/.runs/task-1/run-2/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-2/runner.ndjson'
    } as never;
    const resolver = {
      loadDesignConfig: vi.fn(async () => ({ label: 'design-config' })),
      resolveDesignEnvOverrides: vi.fn(() => ({}))
    } as unknown as PipelineResolver;
    const pipeline = { id: 'pipeline-1', title: 'Pipeline 1', stages: [] } as never;
    const preparation = {
      env: {
        repoRoot: '/tmp/repo',
        taskId: 'task-1',
        runsRoot: '/tmp/repo/.runs',
        outRoot: '/tmp/repo/out'
      },
      pipeline,
      pipelineSource: null,
      runtimeModeDefault: null,
      configNotice: 'repo config active',
      envOverrides: {},
      planner: { label: 'planner' },
      plannerTargetId: 'planner-target',
      taskContext: { id: 'task-1', title: 'Task 1', metadata: {} },
      metadata: { id: 'task-1', slug: 'task-1', title: 'Task 1' },
      resolver,
      planPreview: { items: [] }
    } as never;
    const appendSummaryImpl = vi.fn();
    const applyRequestedRuntimeMode = vi.fn();
    const createPersister = vi.fn(() => ({
      schedule: vi.fn(async () => undefined)
    } as unknown as ManifestPersister));

    const result = await runOrchestratorResumePreparationShell({
      baseEnv: preparation.env,
      options: { runId: 'run-2' },
      validateResumeToken: vi.fn(async () => undefined),
      applyRequestedRuntimeMode,
      loadManifestImpl: vi.fn(async () => ({ manifest, paths })),
      overrideTaskEnvironmentImpl: vi.fn(() => preparation.env),
      createResolver: () => resolver,
      isRepoConfigRequiredImpl: vi.fn(() => false),
      loadUserConfigImpl: vi.fn(async () => ({ source: 'repo', runtimeMode: null })),
      loadPackageConfigImpl: vi.fn(async () => null),
      resolvePipelineForResumeImpl: vi.fn(() => pipeline),
      recordResumeEventImpl: vi.fn(),
      resetForResumeImpl: vi.fn(),
      updateHeartbeatImpl: vi.fn(),
      prepareRunImpl: vi.fn(async () => preparation),
      appendSummaryImpl,
      createPersister
    });

    expect(result.runtimeModeResolution).toEqual({ mode: 'cli', source: 'manifest' });
    expect(applyRequestedRuntimeMode).toHaveBeenCalledWith(manifest, 'cli');
    expect(appendSummaryImpl).not.toHaveBeenCalled();
    expect(manifest.plan_target_id).toBe('planner-target');
    expect(createPersister).toHaveBeenCalledWith(
      expect.objectContaining({
        persistIntervalMs: 1000
      })
    );
  });

  it('lets preparation env overrides beat ambient env even when manifest preference is enabled', async () => {
    process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE = 'appserver';

    const manifest = {
      task_id: 'task-1',
      pipeline_id: 'pipeline-1',
      plan_target_id: null,
      runtime_mode_requested: 'cli',
      runtime_mode: 'cli',
      heartbeat_interval_seconds: 1,
      run_id: 'run-3'
    } as never;
    const paths = {
      runDir: '/tmp/repo/.runs/task-1/run-3',
      manifestPath: '/tmp/repo/.runs/task-1/run-3/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-3/runner.ndjson'
    } as never;
    const resolver = {
      loadDesignConfig: vi.fn(async () => ({ label: 'design-config' })),
      resolveDesignEnvOverrides: vi.fn(() => ({}))
    } as unknown as PipelineResolver;
    const pipeline = { id: 'pipeline-1', title: 'Pipeline 1', stages: [] } as never;
    const preparation = {
      env: {
        repoRoot: '/tmp/repo',
        taskId: 'task-1',
        runsRoot: '/tmp/repo/.runs',
        outRoot: '/tmp/repo/out'
      },
      pipeline,
      pipelineSource: null,
      runtimeModeDefault: null,
      configNotice: null,
      envOverrides: { CODEX_ORCHESTRATOR_RUNTIME_MODE: 'cli' },
      planner: { label: 'planner' },
      plannerTargetId: null,
      taskContext: { id: 'task-1', title: 'Task 1', metadata: {} },
      metadata: { id: 'task-1', slug: 'task-1', title: 'Task 1' },
      resolver,
      planPreview: { items: [] }
    } as never;
    const applyRequestedRuntimeMode = vi.fn();

    const result = await runOrchestratorResumePreparationShell({
      baseEnv: preparation.env,
      options: { runId: 'run-3' },
      validateResumeToken: vi.fn(async () => undefined),
      applyRequestedRuntimeMode,
      loadManifestImpl: vi.fn(async () => ({ manifest, paths })),
      overrideTaskEnvironmentImpl: vi.fn(() => preparation.env),
      createResolver: () => resolver,
      isRepoConfigRequiredImpl: vi.fn(() => false),
      loadUserConfigImpl: vi.fn(async () => ({ source: 'repo', runtimeMode: null })),
      loadPackageConfigImpl: vi.fn(async () => null),
      resolvePipelineForResumeImpl: vi.fn(() => pipeline),
      recordResumeEventImpl: vi.fn(),
      resetForResumeImpl: vi.fn(),
      updateHeartbeatImpl: vi.fn(),
      prepareRunImpl: vi.fn(async () => preparation),
      createPersister: vi.fn(() => ({
        schedule: vi.fn(async () => undefined)
      } as unknown as ManifestPersister))
    });

    expect(result.runtimeModeResolution).toEqual({ mode: 'cli', source: 'env' });
    expect(applyRequestedRuntimeMode).toHaveBeenCalledWith(manifest, 'cli');
  });
});
