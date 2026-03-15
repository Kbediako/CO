import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';

import { normalizeEnvironmentPaths } from '../src/cli/run/environment.js';
import { bootstrapManifest } from '../src/cli/run/manifest.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import { resolveEnvironmentPaths } from '../../scripts/lib/run-manifests.js';
import { recordOrchestratorAutoScoutEvidence } from '../src/cli/services/orchestratorAutoScoutEvidenceRecorder.js';
import * as fsUtils from '../src/cli/utils/fs.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID,
  autoScoutTimeout: process.env.CODEX_ORCHESTRATOR_AUTO_SCOUT_TIMEOUT_MS
};

let workspaceRoot = '';

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'orchestrator-auto-scout-recorder-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = 'task-auto-scout-recorder';
});

afterEach(async () => {
  vi.restoreAllMocks();
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  process.env.CODEX_ORCHESTRATOR_AUTO_SCOUT_TIMEOUT_MS = ORIGINAL_ENV.autoScoutTimeout;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('recordOrchestratorAutoScoutEvidence', () => {
  async function createContext() {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'docs-review',
      title: 'Docs Review',
      stages: [{ kind: 'command', id: 'stage-1', title: 'Stage 1', command: 'echo ok' }]
    };
    const { manifest, paths } = await bootstrapManifest('run-auto-scout-recorder', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    return {
      env,
      pipeline,
      manifest,
      paths,
      target: {
        id: 'docs-review:stage-1',
        description: 'Stage 1',
        metadata: { stageId: 'stage-1', cloudEnvId: 'env-123' }
      },
      task: { id: env.taskId, title: 'Task' },
      advancedDecision: {
        mode: 'on',
        source: 'env',
        enabled: true,
        autoScout: true,
        reason: 'forced on via env'
      } as const
    };
  }

  it('writes auto-scout evidence and returns the repo-relative path', async () => {
    const context = await createContext();

    const result = await recordOrchestratorAutoScoutEvidence({
      ...context,
      mode: 'cloud',
      envOverrides: { CODEX_CLOUD_BRANCH: 'main' }
    });

    expect(result).toEqual({
      status: 'recorded',
      path: `${context.manifest.artifact_root}/auto-scout.json`
    });

    const autoScoutRaw = await readFile(join(context.paths.runDir, 'auto-scout.json'), 'utf8');
    const autoScout = JSON.parse(autoScoutRaw) as {
      execution_mode: string;
      pipeline_id: string;
      advanced_mode_enabled: boolean;
      cloud: { branch: string | null };
    };
    expect(autoScout.execution_mode).toBe('cloud');
    expect(autoScout.pipeline_id).toBe('docs-review');
    expect(autoScout.advanced_mode_enabled).toBe(true);
    expect(autoScout.cloud.branch).toBe('main');
  });

  it('returns timeout instead of throwing when the write exceeds the configured timeout', async () => {
    const context = await createContext();
    process.env.CODEX_ORCHESTRATOR_AUTO_SCOUT_TIMEOUT_MS = '1';

    vi.spyOn(fsUtils, 'writeJsonAtomic').mockImplementation(
      async () => await new Promise((resolve) => setTimeout(resolve, 10))
    );

    await expect(
      recordOrchestratorAutoScoutEvidence({
        ...context,
        mode: 'cloud'
      })
    ).resolves.toEqual({
      status: 'timeout',
      message: 'timed out after 0s'
    });
  });

  it('marks cloud as requested when execution fell back from cloud to mcp', async () => {
    const context = await createContext();
    context.manifest.cloud_fallback = {
      occurred: true,
      mode_requested: 'cloud',
      mode_used: 'mcp',
      reason: 'preflight failed'
    };

    const result = await recordOrchestratorAutoScoutEvidence({
      ...context,
      mode: 'mcp'
    });

    expect(result).toEqual({
      status: 'recorded',
      path: `${context.manifest.artifact_root}/auto-scout.json`
    });

    const autoScoutRaw = await readFile(join(context.paths.runDir, 'auto-scout.json'), 'utf8');
    const autoScout = JSON.parse(autoScoutRaw) as {
      execution_mode: string;
      cloud: { requested: boolean };
    };
    expect(autoScout.execution_mode).toBe('mcp');
    expect(autoScout.cloud.requested).toBe(true);
  });

  it('returns error instead of throwing when evidence persistence fails', async () => {
    const context = await createContext();

    vi.spyOn(fsUtils, 'writeJsonAtomic').mockRejectedValue(new Error('disk full'));

    await expect(
      recordOrchestratorAutoScoutEvidence({
        ...context,
        mode: 'cloud'
      })
    ).resolves.toEqual({
      status: 'error',
      message: 'disk full'
    });
  });
});
