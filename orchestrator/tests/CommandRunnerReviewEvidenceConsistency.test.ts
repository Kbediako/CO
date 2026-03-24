import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';

const mockState = vi.hoisted(() => ({
  runImpl: null as ((input: Record<string, unknown>) => Promise<unknown>) | null
}));

vi.mock('../src/cli/services/execRuntime.js', () => {
  const listeners = new Set<
    (event: import('../../packages/shared/events/types.js').ExecEvent) => void
  >();

  const runner = {
    on(listener: (event: import('../../packages/shared/events/types.js').ExecEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async run(input: Record<string, unknown>) {
      if (mockState.runImpl) {
        return await mockState.runImpl(input);
      }
      return buildSuccessfulExecResult();
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
        id: 'handle-review-evidence',
        correlationId: 'corr-review-evidence',
        createdAt: '2026-03-24T00:00:00Z',
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
  task: process.env.MCP_RUNNER_TASK_ID
};

let workspaceRoot: string;

beforeEach(async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'cmd-review-evidence-'));
  process.env.CODEX_ORCHESTRATOR_ROOT = workspaceRoot;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = join(workspaceRoot, '.runs');
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = join(workspaceRoot, 'out');
  process.env.MCP_RUNNER_TASK_ID = 'task-review-evidence';
  mockState.runImpl = null;
});

afterEach(async () => {
  vi.restoreAllMocks();
  process.env.CODEX_ORCHESTRATOR_ROOT = ORIGINAL_ENV.root;
  process.env.CODEX_ORCHESTRATOR_RUNS_DIR = ORIGINAL_ENV.runs;
  process.env.CODEX_ORCHESTRATOR_OUT_DIR = ORIGINAL_ENV.out;
  process.env.MCP_RUNNER_TASK_ID = ORIGINAL_ENV.task;
  await rm(workspaceRoot, { recursive: true, force: true });
});

describe('runCommandStage review evidence consistency', () => {
  it('fails a succeeded review stage when telemetry reports a contradictory terminal status', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, { status: 'failed', error: 'review bounded out' });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapReviewStage();
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Review evidence mismatch');
    expect(manifest.commands[0]?.status).toBe('failed');
    expect(manifest.commands[0]?.exit_code).toBe(1);
    expect(manifest.commands[0]?.error_file).toBeTruthy();

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('review-evidence-inconsistent');
    expect(errorPayload.details?.failure_reason).toBe('review_evidence_inconsistent');
    expect(errorPayload.details?.exit_code).toBe(1);
    expect(errorPayload.details?.command_exit_code).toBe(0);
    expect(errorPayload.details?.telemetry_status).toBe('failed');
  });

  it('fails a succeeded review stage when telemetry is stale for the active run', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        generated_at: '1970-01-01T00:00:00.000Z'
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapReviewStage();
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('review telemetry is stale');
    expect(manifest.commands[0]?.status).toBe('failed');
    expect(manifest.commands[0]?.exit_code).toBe(1);

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { details?: Record<string, unknown> };
    expect(errorPayload.details?.exit_code).toBe(1);
    expect(errorPayload.details?.command_exit_code).toBe(0);
    expect(errorPayload.details?.failure_reason).toBe('review_evidence_inconsistent');
    expect(errorPayload.details?.telemetry_generated_at).toBe('1970-01-01T00:00:00.000Z');
  });

  it('records an explicit waiver and preserves stage success when the mismatch is acknowledged', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, { status: 'failed', error: 'review bounded out' });
      return buildSuccessfulExecResult();
    };

    const waiverReason = 'known transitional mismatch while telemetry contract rolls out';
    const { env, manifest, paths, stage } = await bootstrapReviewStage({
      CODEX_REVIEW_EVIDENCE_WAIVER_REASON: waiverReason
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.summary).toContain('review evidence waiver');
    expect(result.summary).toContain(waiverReason);
    expect(manifest.commands[0]?.status).toBe('succeeded');
    expect(manifest.commands[0]?.error_file).toBeNull();

    const commandLog = await readFile(join(env.repoRoot, manifest.commands[0]?.log_path as string), 'utf8');
    expect(commandLog).toContain('"type":"command:waiver"');
    expect(commandLog).toContain('"waiver":"review-evidence-consistency"');
  });

  it('preserves the original command failure artifact when review telemetry is missing', async () => {
    mockState.runImpl = async () => buildFailedExecResult('codex review unavailable\n', 2);

    const { env, manifest, paths, stage } = await bootstrapReviewStage();
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(2);
    expect(result.summary).toContain('Review evidence mismatch after command failure');
    expect(result.summary).toContain('Command result: Exited with code 2');
    expect(manifest.commands[0]?.status).toBe('failed');
    expect(manifest.commands[0]?.exit_code).toBe(2);
    expect(manifest.commands[0]?.error_file).toBeTruthy();

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('command-failed');
    expect(errorPayload.details?.failure_reason).toBe('command_failed');
    expect(errorPayload.details?.stderr).toContain('codex review unavailable');

    const commandLog = await readFile(join(env.repoRoot, manifest.commands[0]?.log_path as string), 'utf8');
    expect(commandLog).toContain('"type":"command:warning"');
    expect(commandLog).toContain('"warning":"review-evidence-inconsistent"');
  });

  it('does not enforce review telemetry consistency for non-review command stages even when the env leaks in globally', async () => {
    mockState.runImpl = async () => buildSuccessfulExecResult();

    const { manifest, stage, ...context } = await bootstrapCommandStage(
      {
        id: 'build',
        title: 'npm run build',
        command: 'npm run build'
      },
      { CODEX_REVIEW_ENFORCE_EVIDENCE_CONSISTENCY: '1' }
    );
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(manifest.commands[0]?.status).toBe('succeeded');
    expect(manifest.commands[0]?.error_file).toBeNull();
    expect(result.summary).toContain('review ok');
  });

  it('ignores inherited review evidence env for review stages unless the stage opts in explicitly', async () => {
    mockState.runImpl = async () => buildSuccessfulExecResult();
    const previous = process.env.CODEX_REVIEW_ENFORCE_EVIDENCE_CONSISTENCY;
    process.env.CODEX_REVIEW_ENFORCE_EVIDENCE_CONSISTENCY = '1';

    try {
      const { manifest, stage, ...context } = await bootstrapCommandStage({
        id: 'review',
        title: 'npm run review',
        command: 'npm run review'
      });
      const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

      expect(result.exitCode).toBe(0);
      expect(manifest.commands[0]?.status).toBe('succeeded');
      expect(manifest.commands[0]?.error_file).toBeNull();
      expect(result.summary).toContain('review ok');
    } finally {
      if (previous === undefined) {
        delete process.env.CODEX_REVIEW_ENFORCE_EVIDENCE_CONSISTENCY;
      } else {
        process.env.CODEX_REVIEW_ENFORCE_EVIDENCE_CONSISTENCY = previous;
      }
    }
  });
});

function buildSuccessfulExecResult() {
  return {
    correlationId: 'corr-review-evidence',
    stdout: 'review ok\n',
    stderr: '',
    exitCode: 0,
    signal: null,
    durationMs: 5,
    status: 'succeeded' as const,
    sandboxState: 'sandboxed' as const,
    record: {
      id: 'tool-run-review-evidence',
      tool: 'exec',
      approvalSource: 'not-required',
      retryCount: 0,
      sandboxState: 'sandboxed',
      status: 'succeeded',
      startedAt: '2026-03-24T00:00:00Z',
      completedAt: '2026-03-24T00:00:01Z',
      attemptCount: 1,
      metadata: {},
      events: []
    },
    events: []
  } satisfies import('../../packages/orchestrator/src/exec/unified-exec.js').UnifiedExecRunResult;
}

function buildFailedExecResult(stderr: string, exitCode = 1) {
  return {
    correlationId: 'corr-review-evidence',
    stdout: '',
    stderr,
    exitCode,
    signal: null,
    durationMs: 5,
    status: 'failed' as const,
    sandboxState: 'sandboxed' as const,
    record: {
      id: 'tool-run-review-evidence',
      tool: 'exec',
      approvalSource: 'not-required',
      retryCount: 0,
      sandboxState: 'sandboxed',
      status: 'failed',
      startedAt: '2026-03-24T00:00:00Z',
      completedAt: '2026-03-24T00:00:01Z',
      attemptCount: 1,
      metadata: {},
      events: []
    },
    events: []
  } satisfies import('../../packages/orchestrator/src/exec/unified-exec.js').UnifiedExecRunResult;
}

async function bootstrapReviewStage(stageEnv: Record<string, string> = {}) {
  return await bootstrapCommandStage(
    {
      id: 'review',
      title: 'npm run review',
      command: 'npm run review'
    },
    {
      CODEX_REVIEW_ENFORCE_EVIDENCE_CONSISTENCY: '1',
      ...stageEnv
    }
  );
}

async function bootstrapCommandStage(
  stageSeed: Pick<CommandStage, 'id' | 'title' | 'command'>,
  stageEnv: Record<string, string> = {}
) {
  const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
  const stage: CommandStage = {
    kind: 'command',
    id: stageSeed.id,
    title: stageSeed.title,
    command: stageSeed.command,
    env: {
      ...stageEnv
    }
  };
  const pipeline: PipelineDefinition = {
    id: 'review-evidence-pipeline',
    title: 'Review Evidence Pipeline',
    stages: [stage]
  };

  const { manifest, paths } = await bootstrapManifest('run-review-evidence', {
    env,
    pipeline,
    parentRunId: null,
    taskSlug: env.taskId,
    approvalPolicy: null
  });

  return {
    env,
    manifest,
    paths,
    stage
  };
}

async function writeReviewArtifacts(
  input: Record<string, unknown>,
  overrides: Partial<{
    generated_at: string;
    status: 'succeeded' | 'failed';
    error: string | null;
    output_log_path: string;
  }>
): Promise<void> {
  const execEnv = (input.env ?? {}) as NodeJS.ProcessEnv;
  const repoRoot = String(execEnv.CODEX_ORCHESTRATOR_ROOT);
  const runDir = String(execEnv.CODEX_ORCHESTRATOR_RUN_DIR);
  const reviewDir = join(runDir, 'review');
  const outputLogPath = join(reviewDir, 'output.log');
  await mkdir(reviewDir, { recursive: true });
  await writeFile(outputLogPath, 'review output\n', 'utf8');
  await writeFile(
    join(reviewDir, 'telemetry.json'),
    `${JSON.stringify(
      {
        version: 1,
        generated_at: new Date().toISOString(),
        status: 'succeeded',
        error: null,
        output_log_path: relative(repoRoot, outputLogPath),
        termination_boundary: null,
        summary: {
          lineCount: 1,
          commandStarts: [],
          completionCount: 0,
          startupEvents: 0,
          reviewProgressSignals: 1,
          thinkingBlocks: 0,
          heavyCommandStarts: [],
          distinctInspectionTargets: 0,
          maxInspectionTargetHits: 0,
          distinctInspectionSignatures: 0,
          maxInspectionSignatureHits: 0,
          outputInspectionSignals: 0,
          outputNarrativeSignals: 0,
          concreteOutputSignals: 0,
          distinctOutputInspectionTargets: 0,
          maxOutputInspectionTargetHits: 0,
          distinctOutputNarrativeSignatures: 0,
          maxOutputNarrativeSignatureHits: 0,
          metaSurfaceSignals: 0,
          distinctMetaSurfaces: 0,
          maxMetaSurfaceHits: 0,
          metaSurfaceKinds: [],
          startupAnchorObserved: false,
          preAnchorCommandStarts: 0,
          preAnchorMetaSurfaceSignals: 0,
          preAnchorDistinctMetaSurfaces: 0,
          preAnchorMetaSurfaceKinds: [],
          commandIntentViolationCount: 0,
          commandIntentViolationKinds: [],
          commandIntentViolationSamples: [],
          shellProbeCount: 0,
          lastLines: []
        },
        ...overrides
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}
