import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';

const mockState = vi.hoisted(() => ({
  lastRunInput: null as {
    env?: NodeJS.ProcessEnv;
  } | null
}));

vi.mock('../src/cli/services/execRuntime.js', () => {
  const listeners = new Set<(event: import('../../packages/shared/events/types.js').ExecEvent) => void>();

  const runner = {
    on(listener: (event: import('../../packages/shared/events/types.js').ExecEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async run(input: { env?: NodeJS.ProcessEnv }) {
      mockState.lastRunInput = input;
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
    const pipeline: PipelineDefinition = {
      id: 'pipeline-env',
      title: 'Env Propagation',
      stages: [
        {
          kind: 'command',
          id: 'stage-env',
          title: 'Echo',
          command: 'echo ok'
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
  });
});
