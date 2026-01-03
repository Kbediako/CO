import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { CodexOrchestrator } from '../src/cli/orchestrator.js';
import * as CommandRunner from '../src/cli/services/commandRunner.js';
import { resolveEnvironmentPaths } from '../../scripts/lib/run-manifests.js';
import { normalizeEnvironmentPaths } from '../src/cli/run/environment.js';
import { bootstrapManifest, updateCommandStatus } from '../src/cli/run/manifest.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import { isoTimestamp } from '../src/cli/utils/time.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'orchestrator-subpipeline-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = 'task-subpipeline';
});

afterEach(async () => {
  vi.restoreAllMocks();
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('CodexOrchestrator subpipeline failures', () => {
  it('finalizes parent stage and manifest when subpipeline throws', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'parent',
      title: 'Parent Pipeline',
      stages: [
        {
          kind: 'subpipeline',
          id: 'child',
          title: 'Child Pipeline',
          pipeline: 'missing-child'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-parent', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });
    manifest.heartbeat_interval_seconds = 1;
    manifest.heartbeat_stale_after_seconds = 2;

    const orchestrator = new CodexOrchestrator(env);
    (orchestrator as unknown as { start: () => Promise<never> }).start = vi.fn(async () => {
      throw new Error('boom');
    });

    const result = await (orchestrator as unknown as {
      executePipeline: (options: unknown) => Promise<{ success: boolean }>;
    }).executePipeline({
      env,
      pipeline,
      manifest,
      paths
    });

    expect(result.success).toBe(false);
    expect(manifest.commands[0]?.status).toBe('failed');
    expect(manifest.status).toBe('failed');
  });

  it('finalizes command stage and manifest when command stage throws', async () => {
    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'command-parent',
      title: 'Command Parent',
      stages: [
        {
          kind: 'command',
          id: 'fail-command',
          title: 'Fail Command',
          command: 'echo fail'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-command-parent', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });
    manifest.heartbeat_interval_seconds = 1;
    manifest.heartbeat_stale_after_seconds = 2;

    vi.spyOn(CommandRunner, 'runCommandStage').mockImplementation(async ({ manifest }) => {
      updateCommandStatus(manifest, 0, {
        status: 'running',
        started_at: isoTimestamp(),
        exit_code: null,
        summary: null
      });
      throw new Error('boom');
    });

    const orchestrator = new CodexOrchestrator(env);

    const result = await (orchestrator as unknown as {
      executePipeline: (options: unknown) => Promise<{ success: boolean }>;
    }).executePipeline({
      env,
      pipeline,
      manifest,
      paths
    });

    expect(result.success).toBe(false);
    expect(manifest.commands[0]?.status).toBe('failed');
    expect(manifest.commands[0]?.completed_at).not.toBeNull();
    expect(manifest.commands[0]?.summary).toContain('Execution error: boom');
    expect(manifest.status).toBe('failed');
  });
});
