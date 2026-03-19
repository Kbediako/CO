import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';

const mockState = vi.hoisted(() => ({
  lastRunInput: null as Record<string, unknown> | null,
  runImpl: null as ((input: Record<string, unknown>) => Promise<unknown>) | null
}));

vi.mock('../src/cli/services/execRuntime.js', () => {
  const listeners = new Set<(event: import('../../packages/shared/events/types.js').ExecEvent) => void>();

  const runner = {
    on(listener: (event: import('../../packages/shared/events/types.js').ExecEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async run(input: Record<string, unknown>) {
      mockState.lastRunInput = input;
      if (mockState.runImpl) {
        return await mockState.runImpl(input);
      }
      return {
        correlationId: 'corr-timeout-observability',
        stdout: 'ok\n',
        stderr: '',
        exitCode: 0,
        signal: null,
        durationMs: 5,
        status: 'succeeded' as const,
        sandboxState: 'sandboxed' as const,
        record: {
          id: 'tool-run-timeout-observability',
          tool: 'exec',
          approvalSource: 'not-required',
          retryCount: 0,
          sandboxState: 'sandboxed',
          status: 'succeeded',
          startedAt: '2026-03-05T00:00:00Z',
          completedAt: '2026-03-05T00:00:01Z',
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
        id: 'handle-timeout-observability',
        correlationId: 'corr-timeout-observability',
        createdAt: '2026-03-05T00:00:00Z',
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
import { runCommandStage } from '../src/cli/services/commandRunner.js';
import type { CommandStage, PipelineDefinition } from '../src/cli/types.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID,
  stageTimeout: process.env.CODEX_ORCHESTRATOR_STAGE_TIMEOUT_MS
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'cmd-timeout-observability-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = 'task-timeout-observability';
  delete process.env.CODEX_ORCHESTRATOR_STAGE_TIMEOUT_MS;
  mockState.lastRunInput = null;
  mockState.runImpl = null;
});

afterEach(async () => {
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  process.env.CODEX_ORCHESTRATOR_STAGE_TIMEOUT_MS = ORIGINAL_ENV.stageTimeout;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('runCommandStage timeout observability', () => {
  it('records explicit non-fatal fallback details when allowFailure stage times out', async () => {
    mockState.runImpl = async (input) =>
      ({
        correlationId: 'corr-timeout',
        stdout: '',
        stderr: 'execution exceeded bound',
        exitCode: null,
        signal: 'SIGTERM',
        durationMs: 75,
        status: 'failed',
        sandboxState: 'sandboxed',
        timedOut: true,
        timeoutMs: Number(input.timeoutMs ?? 75),
        record: {
          id: 'tool-run-timeout',
          tool: 'exec',
          approvalSource: 'not-required',
          retryCount: 0,
          sandboxState: 'sandboxed',
          status: 'failed',
          startedAt: '2026-03-05T00:00:00Z',
          completedAt: '2026-03-05T00:00:01Z',
          attemptCount: 1,
          metadata: {},
          events: []
        },
        events: []
      }) satisfies import('../../packages/orchestrator/src/exec/unified-exec.js').UnifiedExecRunResult;

    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'pipeline-timeout-fallback',
      title: 'Timeout Fallback',
      stages: [
        {
          kind: 'command',
          id: 'timeout-stage',
          title: 'Timeout Stage',
          command: 'echo timeout',
          allowFailure: true,
          timeoutMs: 75
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-timeout-fallback', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    const stage = pipeline.stages[0] as CommandStage;
    await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(mockState.lastRunInput?.timeoutMs).toBe(75);
    const command = manifest.commands[0];
    expect(command?.status).toBe('skipped');
    expect(command?.summary).toContain('Timed out after 75ms');
    expect(command?.error_file).toBeTruthy();

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, command?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('command-allow-failure');
    expect(errorPayload.details?.failure_reason).toBe('timed_out');
    expect(errorPayload.details?.non_fatal_fallback).toBe(true);
    expect(errorPayload.details?.timeout_ms).toBe(75);

    const commandLog = await readFile(join(env.repoRoot, command?.log_path as string), 'utf8');
    expect(commandLog).toContain('"type":"command:fallback"');
    expect(commandLog).toContain('"reason":"timed_out"');
  });

  it('uses CODEX_ORCHESTRATOR_STAGE_TIMEOUT_MS when stage timeout is unset', async () => {
    process.env.CODEX_ORCHESTRATOR_STAGE_TIMEOUT_MS = '1234';

    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const pipeline: PipelineDefinition = {
      id: 'pipeline-timeout-env-default',
      title: 'Timeout Env Default',
      stages: [
        {
          kind: 'command',
          id: 'timeout-env-stage',
          title: 'Timeout Env Stage',
          command: 'echo ok'
        }
      ]
    };

    const { manifest, paths } = await bootstrapManifest('run-timeout-env-default', {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    const stage = pipeline.stages[0] as CommandStage;
    await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(mockState.lastRunInput?.timeoutMs).toBe(1234);
    expect(manifest.commands[0]?.status).toBe('succeeded');
  });
});
