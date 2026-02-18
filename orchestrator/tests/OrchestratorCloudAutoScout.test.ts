import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';

import { CodexOrchestrator } from '../src/cli/orchestrator.js';
import { normalizeEnvironmentPaths } from '../src/cli/run/environment.js';
import { bootstrapManifest } from '../src/cli/run/manifest.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import { resolveEnvironmentPaths } from '../../scripts/lib/run-manifests.js';
import * as cloudPreflight from '../src/cli/utils/cloudPreflight.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID
};

let workspaceRoot = '';

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'orchestrator-cloud-scout-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = 'task-cloud-scout';
});

afterEach(async () => {
  vi.restoreAllMocks();
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('CodexOrchestrator cloud auto scout', () => {
  it('records auto scout evidence for cloud-mode non-trivial runs', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'docs-review',
      title: 'Docs Review',
      stages: [{ kind: 'command', id: 'stage-1', title: 'Stage 1', command: 'echo ok' }]
    };

    const { manifest, paths } = await bootstrapManifest('run-cloud-scout', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });
    manifest.heartbeat_interval_seconds = 1;
    manifest.heartbeat_stale_after_seconds = 2;

    vi.spyOn(cloudPreflight, 'runCloudPreflight').mockResolvedValue({
      ok: true,
      issues: [],
      details: {
        codexBin: 'codex',
        environmentId: 'env-123',
        branch: null
      }
    });

    const orchestrator = new CodexOrchestrator(env);
    const result = await (
      orchestrator as unknown as {
        executePipeline: (options: unknown) => Promise<{ notes: string[]; success: boolean }>;
      }
    ).executePipeline({
      env,
      pipeline,
      manifest,
      paths,
      mode: 'cloud',
      task: { id: env.taskId, title: 'Task' },
      target: {
        id: 'docs-review:missing-stage',
        description: 'Missing stage',
        metadata: { stageId: 'missing-stage', cloudEnvId: 'env-123' }
      }
    });

    expect(result.success).toBe(false);
    expect(result.notes.some((note) => note.startsWith('Auto scout: evidence recorded at'))).toBe(true);

    const autoScoutPath = join(paths.runDir, 'auto-scout.json');
    const autoScoutRaw = await readFile(autoScoutPath, 'utf8');
    const autoScout = JSON.parse(autoScoutRaw) as {
      execution_mode: string;
      pipeline_id: string;
      advanced_mode_enabled: boolean;
    };
    expect(autoScout.execution_mode).toBe('cloud');
    expect(autoScout.pipeline_id).toBe('docs-review');
    expect(autoScout.advanced_mode_enabled).toBe(true);
  });
});
