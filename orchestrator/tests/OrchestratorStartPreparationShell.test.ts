import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ManifestPersister } from '../src/cli/run/manifestPersister.js';
import { runOrchestratorStartPreparationShell } from '../src/cli/services/orchestratorStartPreparationShell.js';

const ORIGINAL_TEST_ENV = {
  CODEX_ORCHESTRATOR_START_PREP_TEST: process.env.CODEX_ORCHESTRATOR_START_PREP_TEST,
  CODEX_ORCHESTRATOR_RUNTIME_MODE: process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE,
  CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE,
  CODEX_RUNTIME_MODE: process.env.CODEX_RUNTIME_MODE
} satisfies Partial<NodeJS.ProcessEnv>;

function restoreTestEnv(
  key: keyof typeof ORIGINAL_TEST_ENV,
  value: string | undefined
): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL_TEST_ENV)) {
    restoreTestEnv(key as keyof typeof ORIGINAL_TEST_ENV, value);
  }
  vi.restoreAllMocks();
});

describe('runOrchestratorStartPreparationShell', () => {
  it('prepares start inputs, resolves runtime mode, bootstraps the manifest, and appends config notices', async () => {
    process.env.CODEX_ORCHESTRATOR_START_PREP_TEST = 'ambient';

    const preparation = {
      env: {
        repoRoot: '/tmp/repo',
        taskId: 'task-1',
        runsRoot: '/tmp/repo/.runs',
        outRoot: '/tmp/repo/out'
      },
      pipeline: { id: 'pipeline-1', title: 'Pipeline 1', stages: [] },
      pipelineSource: null,
      runtimeModeDefault: 'appserver',
      configResolution: {
        mode: 'repo-authoritative',
        reason: 'default repo-authoritative mode',
        config_source: 'repo'
      },
      configNotice: 'repo config active',
      envOverrides: { CODEX_ORCHESTRATOR_START_PREP_OVERRIDE: '1' },
      planner: { label: 'planner' },
      plannerTargetId: 'planner-target',
      taskContext: { id: 'task-1', title: 'Task 1', metadata: {} },
      metadata: { id: 'task-1', slug: 'task-1', title: 'Task 1' },
      resolver: { label: 'resolver' },
      planPreview: { items: [], targetId: 'preview-target' }
    } as never;
    const manifest = {
      task_id: 'task-1',
      run_id: 'run-1',
      heartbeat_interval_seconds: 2
    } as never;
    const paths = {
      runDir: '/tmp/repo/.runs/task-1/run-1',
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
    } as never;
    const persister = { label: 'persister' } as ManifestPersister;

    const prepareRunImpl = vi.fn(async () => preparation);
    const generateRunIdImpl = vi.fn(() => 'run-1');
    const resolveRuntimeModeImpl = vi.fn(() => ({ mode: 'cli', source: 'flag' as const }));
    const bootstrapManifestImpl = vi.fn(async () => ({ manifest, paths }));
    const appendSummaryImpl = vi.fn();
    const applyRequestedRuntimeMode = vi.fn();
    const createPersister = vi.fn(() => persister);

    const result = await runOrchestratorStartPreparationShell({
      baseEnv: preparation.env,
      options: {
        taskId: 'task-override',
        pipelineId: 'pipeline-override',
        targetStageId: 'stage-1',
        parentRunId: 'parent-1',
        approvalPolicy: 'never',
        issueProvider: 'linear',
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-2',
        issueUpdatedAt: '2026-03-19T03:45:00.000Z',
        runtimeMode: 'cli'
      },
      applyRequestedRuntimeMode,
      prepareRunImpl,
      generateRunIdImpl,
      resolveRuntimeModeImpl,
      bootstrapManifestImpl,
      appendSummaryImpl,
      createPersister
    });

    expect(prepareRunImpl).toHaveBeenCalledWith({
      baseEnv: preparation.env,
      taskIdOverride: 'task-override',
      pipelineId: 'pipeline-override',
      targetStageId: 'stage-1',
      planTargetFallback: null
    });
    expect(resolveRuntimeModeImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        flag: 'cli',
        configDefault: 'appserver',
        env: expect.objectContaining({
          CODEX_ORCHESTRATOR_START_PREP_TEST: 'ambient',
          CODEX_ORCHESTRATOR_START_PREP_OVERRIDE: '1'
        })
      })
    );
    expect(bootstrapManifestImpl).toHaveBeenCalledWith('run-1', {
      env: preparation.env,
      pipeline: preparation.pipeline,
      parentRunId: 'parent-1',
      taskSlug: 'task-1',
      approvalPolicy: 'never',
      planTargetId: 'preview-target',
      issueProvider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T03:45:00.000Z',
      configResolution: preparation.configResolution
    });
    expect(applyRequestedRuntimeMode).toHaveBeenCalledWith(manifest, 'cli');
    expect(appendSummaryImpl).toHaveBeenCalledWith(manifest, 'repo config active');
    expect(createPersister).toHaveBeenCalledWith({
      manifest,
      paths,
      persistIntervalMs: 2000
    });
    expect(result).toEqual({
      preparation,
      runId: 'run-1',
      runtimeModeResolution: { mode: 'cli', source: 'flag' },
      manifest,
      paths,
      persister
    });
  });

  it('falls back to the planner target, skips empty config notices, and clamps the persister interval', async () => {
    const preparation = {
      env: {
        repoRoot: '/tmp/repo',
        taskId: 'task-1',
        runsRoot: '/tmp/repo/.runs',
        outRoot: '/tmp/repo/out'
      },
      pipeline: { id: 'pipeline-1', title: 'Pipeline 1', stages: [] },
      pipelineSource: null,
      runtimeModeDefault: null,
      configResolution: null,
      configNotice: null,
      envOverrides: {},
      planner: { label: 'planner' },
      plannerTargetId: 'planner-target',
      taskContext: { id: 'task-1', title: 'Task 1', metadata: {} },
      metadata: { id: 'task-1', slug: 'task-1', title: 'Task 1' },
      resolver: { label: 'resolver' },
      planPreview: { items: [] }
    } as never;
    const manifest = {
      task_id: 'task-1',
      run_id: 'run-2',
      heartbeat_interval_seconds: 0.25
    } as never;
    const appendSummaryImpl = vi.fn();
    const createPersister = vi.fn(() => ({ label: 'persister' } as ManifestPersister));
    const bootstrapManifestImpl = vi.fn(async () => ({
      manifest,
      paths: {
        runDir: '/tmp/repo/.runs/task-1/run-2',
        manifestPath: '/tmp/repo/.runs/task-1/run-2/manifest.json',
        logPath: '/tmp/repo/.runs/task-1/run-2/runner.ndjson'
      }
    }));

    await runOrchestratorStartPreparationShell({
      baseEnv: preparation.env,
      options: {},
      applyRequestedRuntimeMode: vi.fn(),
      prepareRunImpl: vi.fn(async () => preparation),
      generateRunIdImpl: vi.fn(() => 'run-2'),
      resolveRuntimeModeImpl: vi.fn(() => ({ mode: 'appserver', source: 'default' as const })),
      bootstrapManifestImpl,
      appendSummaryImpl,
      createPersister
    });

    expect(bootstrapManifestImpl).toHaveBeenCalledWith(
      'run-2',
      expect.objectContaining({
        planTargetId: 'planner-target'
      })
    );
    expect(appendSummaryImpl).not.toHaveBeenCalled();
    expect(createPersister).toHaveBeenCalledWith(
      expect.objectContaining({
        persistIntervalMs: 1000
      })
    );
  });

  it('lets preparation env overrides beat ambient process env for runtime-mode resolution', async () => {
    process.env.CODEX_ORCHESTRATOR_RUNTIME_MODE = 'appserver';

    const preparation = {
      env: {
        repoRoot: '/tmp/repo',
        taskId: 'task-1',
        runsRoot: '/tmp/repo/.runs',
        outRoot: '/tmp/repo/out'
      },
      pipeline: { id: 'pipeline-1', title: 'Pipeline 1', stages: [] },
      pipelineSource: null,
      runtimeModeDefault: null,
      configResolution: null,
      configNotice: null,
      envOverrides: { CODEX_ORCHESTRATOR_RUNTIME_MODE: 'cli' },
      planner: { label: 'planner' },
      plannerTargetId: null,
      taskContext: { id: 'task-1', title: 'Task 1', metadata: {} },
      metadata: { id: 'task-1', slug: 'task-1', title: 'Task 1' },
      resolver: { label: 'resolver' },
      planPreview: { items: [] }
    } as never;
    const manifest = {
      task_id: 'task-1',
      run_id: 'run-3',
      heartbeat_interval_seconds: 1
    } as never;
    const applyRequestedRuntimeMode = vi.fn();

    const result = await runOrchestratorStartPreparationShell({
      baseEnv: preparation.env,
      options: {},
      applyRequestedRuntimeMode,
      prepareRunImpl: vi.fn(async () => preparation),
      generateRunIdImpl: vi.fn(() => 'run-3'),
      bootstrapManifestImpl: vi.fn(async () => ({
        manifest,
        paths: {
          runDir: '/tmp/repo/.runs/task-1/run-3',
          manifestPath: '/tmp/repo/.runs/task-1/run-3/manifest.json',
          logPath: '/tmp/repo/.runs/task-1/run-3/runner.ndjson'
        }
      })),
      appendSummaryImpl: vi.fn(),
      createPersister: vi.fn(() => ({ label: 'persister' } as unknown as ManifestPersister))
    });

    expect(result.runtimeModeResolution).toEqual({ mode: 'cli', source: 'env' });
    expect(applyRequestedRuntimeMode).toHaveBeenCalledWith(manifest, 'cli');
  });
});
