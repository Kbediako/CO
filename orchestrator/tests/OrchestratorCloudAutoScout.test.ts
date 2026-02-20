import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';

import { CodexOrchestrator } from '../src/cli/orchestrator.js';
import { normalizeEnvironmentPaths } from '../src/cli/run/environment.js';
import { bootstrapManifest } from '../src/cli/run/manifest.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import { CodexCloudTaskExecutor } from '../src/cloud/CodexCloudTaskExecutor.js';
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

  it('persists cloud execution metadata during in-progress cloud runs', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'docs-review',
      title: 'Docs Review',
      stages: [{ kind: 'command', id: 'stage-1', title: 'Stage 1', command: 'echo ok' }]
    };
    const statusUrl = 'https://chatgpt.com/codex/tasks/task_e_1234567890abcdef1234567890abcdef';

    const { manifest, paths } = await bootstrapManifest('run-cloud-progress-manifest', {
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

    let persistedDuringExecution: Record<string, unknown> | null = null;
    vi.spyOn(CodexCloudTaskExecutor.prototype, 'execute').mockImplementationOnce(async (input) => {
      const inProgressCloudExecution = {
        task_id: 'task_e_1234567890abcdef1234567890abcdef',
        environment_id: 'env-123',
        status: 'running' as const,
        status_url: statusUrl,
        submitted_at: '2026-02-19T00:00:00.000Z',
        completed_at: null,
        last_polled_at: '2026-02-19T00:00:05.000Z',
        poll_count: 1,
        poll_interval_seconds: 5,
        timeout_seconds: 120,
        attempts: 1,
        diff_path: null,
        diff_url: null,
        diff_status: 'pending' as const,
        apply_status: 'not_requested' as const,
        log_path: '.runs/task-cloud-scout/cli/run-cloud-progress-manifest/cloud/commands.ndjson',
        error: null
      };
      await input.onUpdate?.(inProgressCloudExecution);
      const persistedRaw = await readFile(paths.manifestPath, 'utf8');
      persistedDuringExecution = (JSON.parse(persistedRaw) as { cloud_execution?: Record<string, unknown> })
        .cloud_execution ?? null;

      return {
        success: true,
        summary: 'Cloud task completed.',
        notes: [],
        cloudExecution: {
          ...inProgressCloudExecution,
          status: 'ready',
          completed_at: '2026-02-19T00:00:10.000Z',
          diff_status: 'unavailable'
        }
      };
    });

    const orchestrator = new CodexOrchestrator(env);
    const result = await (
      orchestrator as unknown as {
        executePipeline: (options: unknown) => Promise<{
          notes: string[];
          success: boolean;
          manifest: { cloud_execution?: { status?: string; completed_at?: string | null } | null };
        }>;
      }
    ).executePipeline({
      env,
      pipeline,
      manifest,
      paths,
      mode: 'cloud',
      task: { id: env.taskId, title: 'Task' },
      target: {
        id: 'docs-review:stage-1',
        description: 'Stage 1',
        metadata: { stageId: 'stage-1', cloudEnvId: 'env-123' }
      }
    });

    expect(result.success).toBe(true);
    expect(persistedDuringExecution).toBeTruthy();
    expect(persistedDuringExecution?.task_id).toBe('task_e_1234567890abcdef1234567890abcdef');
    expect(persistedDuringExecution?.status).toBe('running');
    expect(persistedDuringExecution?.status_url).toBe(statusUrl);
    expect(persistedDuringExecution?.completed_at).toBeNull();
    expect(result.manifest.cloud_execution?.status).toBe('ready');
    expect(result.manifest.cloud_execution?.completed_at).toBe('2026-02-19T00:00:10.000Z');
  });

  it('falls back to mcp on preflight failure when fallback policy allows it', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'docs-review',
      title: 'Docs Review',
      stages: [{ kind: 'command', id: 'stage-1', title: 'Stage 1', command: 'echo ok' }]
    };

    const { manifest, paths } = await bootstrapManifest('run-cloud-fallback-ok', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });
    manifest.heartbeat_interval_seconds = 1;
    manifest.heartbeat_stale_after_seconds = 2;

    vi.spyOn(cloudPreflight, 'runCloudPreflight').mockResolvedValue({
      ok: false,
      issues: [{ code: 'missing_environment', message: 'CODEX_CLOUD_ENV_ID is not configured.' }],
      details: {
        codexBin: 'codex',
        environmentId: null,
        branch: null
      }
    });

    const orchestrator = new CodexOrchestrator(env);
    const result = await (
      orchestrator as unknown as {
        executePipeline: (options: unknown) => Promise<{ notes: string[]; success: boolean; manifest: { cloud_fallback?: { mode_used?: string } } }>;
      }
    ).executePipeline({
      env,
      pipeline,
      manifest,
      paths,
      mode: 'cloud',
      task: { id: env.taskId, title: 'Task' },
      target: {
        id: 'docs-review:stage-1',
        description: 'Stage 1',
        metadata: { stageId: 'stage-1' }
      }
    });

    expect(result.success).toBe(true);
    expect(result.notes[0]).toContain('Cloud preflight failed; falling back to mcp.');
    expect(result.manifest.cloud_fallback?.mode_used).toBe('mcp');
  });

  it('fails fast on preflight failure when cloud fallback is disabled', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'docs-review',
      title: 'Docs Review',
      stages: [{ kind: 'command', id: 'stage-1', title: 'Stage 1', command: 'echo ok' }]
    };

    const { manifest, paths } = await bootstrapManifest('run-cloud-fallback-deny', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });
    manifest.heartbeat_interval_seconds = 1;
    manifest.heartbeat_stale_after_seconds = 2;

    vi.spyOn(cloudPreflight, 'runCloudPreflight').mockResolvedValue({
      ok: false,
      issues: [{ code: 'missing_environment', message: 'CODEX_CLOUD_ENV_ID is not configured.' }],
      details: {
        codexBin: 'codex',
        environmentId: null,
        branch: null
      }
    });

    const orchestrator = new CodexOrchestrator(env);
    const result = await (
      orchestrator as unknown as {
        executePipeline: (options: unknown) => Promise<{
          notes: string[];
          success: boolean;
          manifest: { status?: string; status_detail?: string; completed_at?: string | null; cloud_fallback?: unknown };
        }>;
      }
    ).executePipeline({
      env,
      pipeline,
      manifest,
      paths,
      mode: 'cloud',
      envOverrides: { CODEX_ORCHESTRATOR_CLOUD_FALLBACK: 'deny' },
      task: { id: env.taskId, title: 'Task' },
      target: {
        id: 'docs-review:stage-1',
        description: 'Stage 1',
        metadata: { stageId: 'stage-1' }
      }
    });

    expect(result.success).toBe(false);
    expect(result.notes[0]).toContain('cloud fallback is disabled');
    expect(result.manifest.status).toBe('failed');
    expect(result.manifest.status_detail).toBe('cloud-preflight-failed');
    expect(result.manifest.completed_at).toBeTruthy();
    expect(result.manifest.cloud_fallback).toBeFalsy();
  });
});
