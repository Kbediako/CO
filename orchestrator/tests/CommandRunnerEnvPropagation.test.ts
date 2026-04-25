import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';

const mockState = vi.hoisted(() => ({
  lastRunInput: null as {
    command?: string;
    args?: string[];
    env?: NodeJS.ProcessEnv;
  } | null,
  providerWorkerProofTokens: null as {
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
    reasoning_output_tokens?: number | null;
  } | null
}));

vi.mock('../src/cli/services/execRuntime.js', () => {
  const listeners = new Set<(event: import('../../packages/shared/events/types.js').ExecEvent) => void>();

  const runner = {
    on(listener: (event: import('../../packages/shared/events/types.js').ExecEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async run(input: { command?: string; args?: string[]; env?: NodeJS.ProcessEnv }) {
      mockState.lastRunInput = input;
      if (mockState.providerWorkerProofTokens && input.env?.CODEX_ORCHESTRATOR_MANIFEST_PATH) {
        const [{ dirname, join }, { mkdir, writeFile }] = await Promise.all([
          import('node:path'),
          import('node:fs/promises')
        ]);
        const runDir = dirname(input.env.CODEX_ORCHESTRATOR_MANIFEST_PATH);
        await mkdir(runDir, { recursive: true });
        await writeFile(
          join(runDir, 'provider-linear-worker-proof.json'),
          `${JSON.stringify({
            issue_id: 'issue-provider-worker',
            issue_identifier: 'CO-999',
            attempt_started_at: '2030-01-01T00:00:00.000Z',
            current_turn_started_at: '2030-01-01T00:00:00.000Z',
            pid: 'pid-provider-worker',
            thread_id: 'thread-provider-worker',
            latest_turn_id: 'turn-provider-worker',
            latest_session_id: 'session-provider-worker',
            latest_session_id_source: 'derived_from_thread_and_turn',
            turn_count: 1,
            last_event: 'turn.completed',
            last_message: 'done',
            last_event_at: '2030-01-01T00:00:00.000Z',
            tokens: mockState.providerWorkerProofTokens,
            rate_limits: null,
            owner_phase: 'ended',
            owner_status: 'succeeded',
            workspace_path: null,
            linear_audit: null,
            end_reason: 'done',
            updated_at: '2030-01-01T00:00:00.000Z'
          })}\n`,
          'utf8'
        );
      }
      return {
        correlationId: 'corr-env-propagation',
        stdout: 'ok\n',
        stderr: '',
        exitCode: 0,
        signal: null,
        durationMs: 5,
        status: 'succeeded' as const,
        sandboxState: 'sandboxed' as const,
        record: {
          id: 'tool-run-env-propagation',
          tool: 'exec',
          approvalSource: 'not-required',
          retryCount: 0,
          sandboxState: 'sandboxed',
          status: 'succeeded',
          startedAt: '2026-01-01T00:00:00Z',
          completedAt: '2026-01-01T00:00:00Z',
          attemptCount: 1,
          metadata: {},
          events: []
        },
        events: []
      } satisfies import('../../packages/orchestrator/src/exec/unified-exec.js').UnifiedExecRunResult;
    }
  };

  return {
    getCliExecRunner: () => runner,
    getPrivacyGuard: () => ({
      getMetrics: () => ({
        mode: 'shadow' as const,
        totalFrames: 0,
        redactedFrames: 0,
        blockedFrames: 0,
        allowedFrames: 0,
        decisions: []
      })
    }),
    getExecHandleService: () => ({
      getDescriptor: () => ({
        id: 'handle-env-propagation',
        correlationId: 'corr-env-propagation',
        createdAt: '2026-01-01T00:00:00Z',
        frameCount: 0,
        status: 'closed' as const,
        latestSequence: 0
      })
    })
  };
});

import { resolveEnvironmentPaths } from '../../scripts/lib/run-manifests.js';
import { normalizeEnvironmentPaths } from '../src/cli/run/environment.js';
import { bootstrapManifest } from '../src/cli/run/manifest.js';
import type { CommandStage, PipelineDefinition } from '../src/cli/types.js';
import { runCommandStage } from '../src/cli/services/commandRunner.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'cmd-runner-env-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = 'top-level-parent-task';
  mockState.lastRunInput = null;
  mockState.providerWorkerProofTokens = null;
});

afterEach(async () => {
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('runCommandStage environment propagation', () => {
  it('sets MCP_RUNNER_TASK_ID to the manifest task id', async () => {
    const baseEnv = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const env = { ...baseEnv, taskId: 'delegation-stream-task' };
    const stagePath = '/tmp/provider-worker-path';
    const pipeline: PipelineDefinition = {
      id: 'pipeline-env',
      title: 'Env Propagation',
      stages: [
        {
          kind: 'command',
          id: 'stage-env',
          title: 'Echo',
          command: 'echo ok',
          env: { PATH: stagePath }
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-env', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    const stage = pipeline.stages[0] as CommandStage;
    await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(manifest.task_id).toBe('delegation-stream-task');
    expect(mockState.lastRunInput?.env?.MCP_RUNNER_TASK_ID).toBe('delegation-stream-task');
    expect(mockState.lastRunInput?.env?.CODEX_ORCHESTRATOR_TASK_ID).toBe('delegation-stream-task');
    expect(mockState.lastRunInput?.env?.CODEX_ORCHESTRATOR_NODE_BIN).toBe(process.execPath);
    expect(mockState.lastRunInput?.env?.PATH).toBe(stagePath);
  });

  it('launches the provider worker stage with explicit node argv semantics', async () => {
    const baseEnv = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const env = { ...baseEnv, taskId: 'provider-worker-task' };
    const pipeline: PipelineDefinition = {
      id: 'provider-linear-worker',
      title: 'Provider Worker',
      stages: [
        {
          kind: 'command',
          id: 'provider-linear-worker',
          title: 'Run provider linear worker',
          command: 'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/orchestrator/src/cli/providerLinearWorkerRunner.js"'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-provider-worker', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    const stage = pipeline.stages[0] as CommandStage;
    await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(mockState.lastRunInput?.command).toBe(process.execPath);
    expect(mockState.lastRunInput?.args?.[0]).toBe('--no-warnings');
    expect(mockState.lastRunInput?.args?.[1]).toBe('--loader');
    expect(mockState.lastRunInput?.args?.[2]?.replaceAll('\\', '/')).toContain('/node_modules/ts-node/');
    expect(mockState.lastRunInput?.args?.[3]?.replaceAll('\\', '/')).toContain(
      'orchestrator/src/cli/providerLinearWorkerRunner.ts'
    );
    expect(mockState.lastRunInput?.env?.CODEX_ORCHESTRATOR_NODE_BIN).toBe(process.execPath);
  });

  it('copies provider worker reasoning-token usage into the run manifest', async () => {
    mockState.providerWorkerProofTokens = {
      input_tokens: 120,
      output_tokens: 45,
      total_tokens: 165,
      reasoning_output_tokens: 31
    };
    const baseEnv = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const env = { ...baseEnv, taskId: 'provider-worker-token-task' };
    const pipeline: PipelineDefinition = {
      id: 'provider-linear-worker',
      title: 'Provider Worker',
      stages: [
        {
          kind: 'command',
          id: 'provider-linear-worker',
          title: 'Run provider linear worker',
          command: 'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/orchestrator/src/cli/providerLinearWorkerRunner.js"'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-provider-worker-tokens', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    const stage = pipeline.stages[0] as CommandStage;
    await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(manifest.provider_linear_worker_tokens).toEqual({
      input_tokens: 120,
      output_tokens: 45,
      total_tokens: 165,
      reasoning_output_tokens: 31
    });
    const onDiskManifest = JSON.parse(await readFile(paths.manifestPath, 'utf8')) as typeof manifest;
    expect(onDiskManifest.provider_linear_worker_tokens).toEqual(manifest.provider_linear_worker_tokens);
  });

  it('honors explicit foreign package roots for provider worker stages', async () => {
    const baseEnv = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const env = { ...baseEnv, taskId: 'provider-worker-foreign-root-task' };
    const foreignRoot = join(workspaceRoot, 'foreign-package-root');
    const foreignDistPath = join(
      foreignRoot,
      'dist',
      'orchestrator',
      'src',
      'cli',
      'providerLinearWorkerRunner.js'
    );
    await mkdir(join(foreignRoot, 'dist', 'orchestrator', 'src', 'cli'), { recursive: true });
    await writeFile(foreignDistPath, 'console.log("foreign provider worker");\n', 'utf8');

    const pipeline: PipelineDefinition = {
      id: 'provider-linear-worker',
      title: 'Provider Worker Foreign Root',
      stages: [
        {
          kind: 'command',
          id: 'provider-linear-worker',
          title: 'Run provider linear worker',
          command: 'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/orchestrator/src/cli/providerLinearWorkerRunner.js"',
          env: {
            CODEX_ORCHESTRATOR_PACKAGE_ROOT: foreignRoot
          }
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-provider-worker-foreign-root', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    const stage = pipeline.stages[0] as CommandStage;
    await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(mockState.lastRunInput?.command).toBe(process.execPath);
    expect(mockState.lastRunInput?.args).toEqual([foreignDistPath]);
    expect(mockState.lastRunInput?.env?.CODEX_ORCHESTRATOR_PACKAGE_ROOT).toBe(foreignRoot);
  });

  it('rewrites package-root dist stage commands onto live source files while preserving shell tails', async () => {
    const baseEnv = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const env = { ...baseEnv, taskId: 'source-stage-task' };
    const pipeline: PipelineDefinition = {
      id: 'pipeline-source-stage',
      title: 'Source Stage',
      stages: [
        {
          kind: 'command',
          id: 'spec-guard',
          title: 'Run spec guard',
          command:
            'node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/orchestrator/src/cli/utils/specGuardRunner.js" --dry-run && printf "%s" "$EXTRA_STAGE_ARG" > result.txt'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-source-stage', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    const stage = pipeline.stages[0] as CommandStage;
    await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(mockState.lastRunInput?.args).toBeUndefined();
    expect(mockState.lastRunInput?.command).toContain('--no-warnings');
    expect(mockState.lastRunInput?.command).toContain('--loader');
    expect(mockState.lastRunInput?.command?.replaceAll('\\', '/')).toContain('/node_modules/ts-node/');
    expect(mockState.lastRunInput?.command?.replaceAll('\\', '/')).toContain(
      'orchestrator/src/cli/utils/specGuardRunner.ts'
    );
    expect(mockState.lastRunInput?.env?.TS_NODE_PROJECT?.replaceAll('\\', '/')).toBe(
      join(process.cwd(), 'tsconfig.json').replaceAll('\\', '/')
    );
    expect(mockState.lastRunInput?.command).toContain(
      '&& printf "%s" "$EXTRA_STAGE_ARG" > result.txt'
    );
  });
});
