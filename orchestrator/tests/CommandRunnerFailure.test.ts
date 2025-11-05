import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { ToolInvocationFailedError } from '../../packages/orchestrator/src/index.js';

vi.mock('../src/cli/services/execRuntime.js', () => {
  const listeners = new Set<(event: unknown) => void>();

  const privacyGuardMetrics = {
    mode: 'enforce' as const,
    totalFrames: 3,
    redactedFrames: 1,
    blockedFrames: 0,
    allowedFrames: 2,
    decisions: [
      {
        handleId: 'handle-failure',
        sequence: 3,
        action: 'redact' as const,
        rule: 'sensitive-token',
        reason: 'detected high-risk token',
        timestamp: '2025-11-05T13:30:05Z'
      }
    ]
  };

  const runner = {
    on(listener: (event: unknown) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async run() {
      const record = {
        id: 'tool-run-failure',
        tool: 'exec',
        approvalSource: 'not-required' as const,
        retryCount: 0,
        sandboxState: 'sandboxed' as const,
        status: 'failed' as const,
        startedAt: '2025-11-05T13:30:01Z',
        completedAt: '2025-11-05T13:30:05Z',
        attemptCount: 1,
        metadata: {
          exec: {
            handleId: 'handle-failure',
            correlationId: 'corr-failure'
          }
        },
        events: []
      } satisfies import('../../packages/shared/manifest/types.js').ToolRunRecord;

      throw new ToolInvocationFailedError('simulated failure', record, new Error('exec failed'));
    }
  };

  const handleDescriptor = {
    id: 'handle-failure',
    correlationId: 'corr-failure',
    createdAt: '2025-11-05T13:30:01Z',
    frameCount: 4,
    status: 'closed' as const,
    latestSequence: 4
  };

  return {
    getCliExecRunner: () => runner,
    getPrivacyGuard: () => ({
      getMetrics: () => privacyGuardMetrics
    }),
    getExecHandleService: () => ({
      getDescriptor: () => handleDescriptor
    })
  };
});

import { runCommandStage } from '../src/cli/services/commandRunner.js';
import { resolveEnvironment } from '../src/cli/run/environment.js';
import { bootstrapManifest } from '../src/cli/run/manifest.js';
import type { CommandStage } from '../src/cli/types.js';
import type { PipelineDefinition } from '../src/cli/types.js';

const ORIGINAL_ENV = {
  root: process.env.CODEX_ORCHESTRATOR_ROOT,
  runs: process.env.CODEX_ORCHESTRATOR_RUNS_DIR,
  out: process.env.CODEX_ORCHESTRATOR_OUT_DIR,
  task: process.env.MCP_RUNNER_TASK_ID
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'cmd-runner-fail-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = 'autonomy-upgrade';
});

afterEach(async () => {
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('runCommandStage failure handling', () => {
  it('records handle descriptors and privacy decisions on failure', async () => {
    const env = resolveEnvironment();
    const pipeline: PipelineDefinition = {
      id: 'pipeline-failure',
      title: 'Failure Pipeline',
      stages: [
        {
          kind: 'command',
          id: 'fail-stage',
          title: 'Failing Stage',
          command: 'echo failing'
        }
      ]
    };

    const runId = 'run-failure';
    const { manifest, paths } = await bootstrapManifest(runId, {
      env,
      pipeline,
      parentRunId: null,
      taskSlug: env.taskId,
      approvalPolicy: null
    });

    const stage = pipeline.stages[0] as CommandStage;

    await expect(
      runCommandStage({ env, paths, manifest, stage, index: 1 })
    ).rejects.toBeInstanceOf(ToolInvocationFailedError);

    expect(manifest.handles).toBeDefined();
    expect(manifest.handles?.[0]?.handle_id).toBe('handle-failure');
    expect(manifest.handles?.[0]?.status).toBe('closed');

    expect(manifest.privacy).toBeDefined();
    expect(manifest.privacy?.decisions?.[0]?.handle_id).toBe('handle-failure');
    expect(manifest.privacy?.totals.redacted_frames).toBe(1);
  });
});
