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
import { deriveReviewOutcomeDisposition } from '../../scripts/lib/review-execution-telemetry.js';
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
const THREAD_NOT_FOUND_ROLLOUT_NOISE_MESSAGE =
  'codex_core::session: failed to record rollout items: thread 019de1d2-3b27-7193-8330-0ed726e28044 not found';
const THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE = `WARN ${THREAD_NOT_FOUND_ROLLOUT_NOISE_MESSAGE}`;

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

  it('ignores inherited review evidence waiver env unless the review stage declares it explicitly', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, { status: 'failed', error: 'review bounded out' });
      return buildSuccessfulExecResult();
    };

    const previous = process.env.CODEX_REVIEW_EVIDENCE_WAIVER_REASON;
    process.env.CODEX_REVIEW_EVIDENCE_WAIVER_REASON =
      'leaked global waiver should not downgrade enforced review stages';

    try {
      const { env, manifest, paths, stage } = await bootstrapReviewStage();
      const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

      expect(result.exitCode).toBe(1);
      expect(result.summary).toContain('Review evidence mismatch');
      expect(result.summary).not.toContain('review evidence waiver');
      expect(manifest.commands[0]?.status).toBe('failed');
    } finally {
      if (previous === undefined) {
        delete process.env.CODEX_REVIEW_EVIDENCE_WAIVER_REASON;
      } else {
        process.env.CODEX_REVIEW_EVIDENCE_WAIVER_REASON = previous;
      }
    }
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

  it('annotates succeeded review summaries with bounded-success review outcomes', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        review_outcome: 'bounded-success',
        termination_boundary: {
          kind: 'relevant-reinspection-dwell',
          provenance: 'post-startup-anchor',
          reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
          sample: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'review',
      title: 'npm run review',
      command: 'npm run review'
    });
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain('review ok');
    expect(result.summary).toContain(
      'review outcome: bounded success via relevant-reinspection-dwell; not a wrapper failure'
    );
    expect(manifest.commands[0]?.summary).toContain(
      'review outcome: bounded success via relevant-reinspection-dwell; not a wrapper failure'
    );
  });

  it('classifies rollout-item thread-not-found review log noise only after successful telemetry', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        review_outcome: 'bounded-success',
        outputLogContent: `review output\n${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`,
        termination_boundary: {
          kind: 'relevant-reinspection-dwell',
          provenance: 'post-startup-anchor',
          reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
          sample: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'review',
      title: 'npm run review',
      command: 'npm run review'
    });
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain(
      'review log note: Codex rollout-item thread-not-found session cleanup noise observed; successful review telemetry remains authoritative'
    );
    expect(manifest.commands[0]?.summary).toContain(
      'review log note: Codex rollout-item thread-not-found session cleanup noise observed; successful review telemetry remains authoritative'
    );

    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, {
        status: 'failed',
        review_outcome: 'failed-other',
        error: 'codex review exited with code 2',
        outputLogContent: `review output\n${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`,
        termination_boundary: null
      });
      return buildFailedExecResult('codex review exited with code 2\n', 2);
    };

    const failedContext = await bootstrapCommandStage({
      id: 'review',
      title: 'npm run review',
      command: 'npm run review'
    });
    const failedResult = await runCommandStage({
      env: failedContext.env,
      paths: failedContext.paths,
      manifest: failedContext.manifest,
      stage: failedContext.stage,
      index: 1
    });

    expect(failedResult.exitCode).toBe(2);
    expect(failedResult.summary).not.toContain('thread-not-found session cleanup noise observed');
    expect(failedContext.manifest.commands[0]?.summary).not.toContain(
      'thread-not-found session cleanup noise observed'
    );
  });

  it('does not classify rollout-item thread-not-found review log noise when successful telemetry has an error', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        review_outcome: 'clean-success',
        error: 'post-review artifact write failed',
        outputLogContent: `review output\n${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`
      });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'review',
      title: 'npm run review',
      command: 'npm run review'
    });
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain('review ok');
    expect(result.summary).not.toContain('thread-not-found session cleanup noise observed');
    expect(manifest.commands[0]?.summary).not.toContain(
      'thread-not-found session cleanup noise observed'
    );
  });

  it('does not classify rollout-item thread-not-found text quoted from review output', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        review_outcome: 'clean-success',
        outputLogContent: [
          'review output',
          THREAD_NOT_FOUND_ROLLOUT_NOISE_MESSAGE,
          `+const THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE = '${THREAD_NOT_FOUND_ROLLOUT_NOISE_MESSAGE}';`,
          `The reviewed diff contains ${THREAD_NOT_FOUND_ROLLOUT_NOISE_MESSAGE}`,
          `  '${THREAD_NOT_FOUND_ROLLOUT_NOISE_MESSAGE}';`
        ].join('\n')
      });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'review',
      title: 'npm run review',
      command: 'npm run review'
    });
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain('review ok');
    expect(result.summary).not.toContain('thread-not-found session cleanup noise observed');
    expect(manifest.commands[0]?.summary).not.toContain(
      'thread-not-found session cleanup noise observed'
    );
  });

  it('does not classify rollout-item thread-not-found review log noise without explicit matching success outcome', async () => {
    const cases = [
      {
        name: 'missing review_outcome',
        telemetry: {
          status: 'succeeded',
          omitReviewOutcome: true
        }
      },
      {
        name: 'contradictory review_outcome',
        telemetry: {
          status: 'succeeded',
          review_outcome: 'bounded-success',
          termination_boundary: null
        }
      }
    ] as const;

    for (const testCase of cases) {
      mockState.runImpl = async (input) => {
        await writeReviewArtifacts(input, {
          ...testCase.telemetry,
          outputLogContent: `review output\n${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`
        });
        return buildSuccessfulExecResult();
      };

      const { manifest, stage, ...context } = await bootstrapCommandStage({
        id: 'review',
        title: `npm run review (${testCase.name})`,
        command: 'npm run review'
      });
      const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

      expect(result.exitCode).toBe(0);
      expect(result.summary).toContain('review ok');
      expect(result.summary).not.toContain('thread-not-found session cleanup noise observed');
      expect(manifest.commands[0]?.summary).not.toContain(
        'thread-not-found session cleanup noise observed'
      );
    }
  });

  it('annotates failed review summaries with classified review-wrapper failures', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, {
        status: 'failed',
        review_outcome: 'failed-boundary',
        error: 'review crossed command-intent boundary',
        termination_boundary: {
          kind: 'command-intent',
          provenance: 'validation-suite',
          reason: 'review crossed command-intent boundary',
          sample: 'npm run test'
        }
      });
      return buildFailedExecResult('review crossed command-intent boundary\n');
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'review',
      title: 'npm run review',
      command: 'npm run review'
    });
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Exited with code 1');
    expect(result.summary).toContain('review outcome: review-wrapper failure via command-intent');
    expect(manifest.commands[0]?.summary).toContain(
      'review outcome: review-wrapper failure via command-intent'
    );
  });

  it('describes failed-other review outcomes without calling them wrapper failures', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, {
        status: 'failed',
        review_outcome: 'failed-other',
        error: 'codex review exited with code 1',
        termination_boundary: null
      });
      return buildFailedExecResult('codex review exited with code 1\n');
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'review',
      title: 'npm run review',
      command: 'npm run review'
    });
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Exited with code 1');
    expect(result.summary).toContain(
      'review outcome: review command failed without termination-boundary classification; not an explicit wrapper-boundary failure'
    );
    expect(result.summary).not.toContain('review-wrapper failure without termination-boundary classification');
    expect(manifest.commands[0]?.summary).toContain(
      'review outcome: review command failed without termination-boundary classification; not an explicit wrapper-boundary failure'
    );
  });

  it('falls back to failed-other when telemetry carries an inconsistent explicit review outcome', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, {
        status: 'failed',
        review_outcome: 'clean-success',
        error: 'codex review exited with code 1',
        termination_boundary: null
      });
      return buildFailedExecResult('codex review exited with code 1\n');
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'review',
      title: 'npm run review',
      command: 'npm run review'
    });
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain(
      'review outcome: review command failed without termination-boundary classification; not an explicit wrapper-boundary failure'
    );
    expect(result.summary).not.toContain('review outcome: clean success');
  });

  it('skips review-outcome summary annotation when telemetry is stale and evidence consistency is not enforced', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        generated_at: '1970-01-01T00:00:00.000Z',
        review_outcome: 'bounded-success',
        termination_boundary: {
          kind: 'relevant-reinspection-dwell',
          provenance: 'post-startup-anchor',
          reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
          sample: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'review',
      title: 'npm run review',
      command: 'npm run review'
    });
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toBe('review ok');
    expect(result.summary).not.toContain('review outcome:');
    expect(manifest.commands[0]?.summary).toBe('review ok');
  });

  it('does not wait for missing telemetry on prompt-only review stages when evidence consistency is not enforced', async () => {
    mockState.runImpl = async () => buildSuccessfulExecResult();

    const { manifest, stage, ...context } = await bootstrapCommandStage(
      {
        id: 'review',
        title: 'npm run review',
        command: 'npm run review'
      },
      {
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        FORCE_CODEX_REVIEW: '0'
      }
    );
    const startedAtMs = Date.now();
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });
    const elapsedMs = Date.now() - startedAtMs;

    expect(result.exitCode).toBe(0);
    expect(result.summary).toBe('review ok');
    expect(manifest.commands[0]?.summary).toBe('review ok');
    expect(elapsedMs).toBeLessThan(1_500);
  });

  it('treats piped stdin without isTTY as non-interactive for prompt-only review stages', async () => {
    mockState.runImpl = async () => buildSuccessfulExecResult();

    const stdinDescriptor = Object.getOwnPropertyDescriptor(process, 'stdin');
    const pipedStdin = Object.create(process.stdin) as NodeJS.ReadStream & { isTTY?: boolean };
    Object.defineProperty(pipedStdin, 'isTTY', {
      value: undefined,
      configurable: true
    });
    Object.defineProperty(process, 'stdin', {
      value: pipedStdin,
      configurable: true
    });

    try {
      const { manifest, stage, ...context } = await bootstrapCommandStage(
        {
          id: 'review',
          title: 'npm run review',
          command: 'npm run review'
        },
        { FORCE_CODEX_REVIEW: '0' }
      );
      const startedAtMs = Date.now();
      const result = await runCommandStage({ ...context, manifest, stage, index: 1 });
      const elapsedMs = Date.now() - startedAtMs;

      expect(result.exitCode).toBe(0);
      expect(result.summary).toBe('review ok');
      expect(manifest.commands[0]?.summary).toBe('review ok');
      expect(elapsedMs).toBeLessThan(1_500);
    } finally {
      if (stdinDescriptor) {
        Object.defineProperty(process, 'stdin', stdinDescriptor);
      } else {
        delete (process as NodeJS.Process & { stdin?: NodeJS.ReadStream }).stdin;
      }
    }
  });

  it('waits for review telemetry when FORCE_CODEX_REVIEW is supplied via envOverrides', async () => {
    mockState.runImpl = async (input) => {
      setTimeout(() => {
        void writeReviewArtifacts(input, {
          status: 'succeeded',
          review_outcome: 'bounded-success',
          termination_boundary: {
            kind: 'relevant-reinspection-dwell',
            provenance: 'post-startup-anchor',
            reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
            sample: null
          }
        });
      }, 50);
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'review',
      title: 'npm run review',
      command: 'npm run review'
    });
    const result = await runCommandStage({
      ...context,
      manifest,
      stage,
      index: 1,
      envOverrides: {
        FORCE_CODEX_REVIEW: '1'
      }
    });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain(
      'review outcome: bounded success via relevant-reinspection-dwell; not a wrapper failure'
    );
    expect(manifest.commands[0]?.summary).toContain(
      'review outcome: bounded success via relevant-reinspection-dwell; not a wrapper failure'
    );
  });

  it('waits for delayed review telemetry on interactive runs without FORCE_CODEX_REVIEW', async () => {
    const isTTYDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    const reviewInteractiveEnv = {
      CODEX_REVIEW_NON_INTERACTIVE: process.env.CODEX_REVIEW_NON_INTERACTIVE,
      CODEX_NON_INTERACTIVE: process.env.CODEX_NON_INTERACTIVE,
      CODEX_NO_INTERACTIVE: process.env.CODEX_NO_INTERACTIVE,
      FORCE_CODEX_REVIEW: process.env.FORCE_CODEX_REVIEW
    };
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true
    });
    delete process.env.CODEX_REVIEW_NON_INTERACTIVE;
    delete process.env.CODEX_NON_INTERACTIVE;
    delete process.env.CODEX_NO_INTERACTIVE;
    delete process.env.FORCE_CODEX_REVIEW;

    mockState.runImpl = async (input) => {
      setTimeout(() => {
        void writeReviewArtifacts(input, {
          status: 'succeeded',
          review_outcome: 'bounded-success',
          termination_boundary: {
            kind: 'relevant-reinspection-dwell',
            provenance: 'post-startup-anchor',
            reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
            sample: null
          }
        });
      }, 50);
      return buildSuccessfulExecResult();
    };

    try {
      const { manifest, stage, ...context } = await bootstrapCommandStage(
        {
          id: 'review',
          title: 'npm run review',
          command: 'npm run review'
        },
        {
          CODEX_REVIEW_NON_INTERACTIVE: '0',
          CODEX_NON_INTERACTIVE: '0',
          CODEX_NO_INTERACTIVE: '0',
          FORCE_CODEX_REVIEW: '0'
        }
      );
      const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

      expect(result.exitCode).toBe(0);
      expect(result.summary).toContain(
        'review outcome: bounded success via relevant-reinspection-dwell; not a wrapper failure'
      );
      expect(manifest.commands[0]?.summary).toContain(
        'review outcome: bounded success via relevant-reinspection-dwell; not a wrapper failure'
      );
    } finally {
      if (isTTYDescriptor) {
        Object.defineProperty(process.stdin, 'isTTY', isTTYDescriptor);
      } else {
        delete (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY;
      }
      for (const [key, value] of Object.entries(reviewInteractiveEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
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

  it('fails a succeeded provider-linear-worker stage when authoritative review telemetry reports terminal failure', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(input, {
        status: 'failed',
        review_outcome: 'failed-boundary',
        termination_boundary: {
          kind: 'relevant-reinspection-dwell',
          provenance: 'review-timeout',
          reason: 'bounded out',
          sample: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed');
    expect(result.summary).toContain('review outcome: review-wrapper failure via relevant-reinspection-dwell');
    expect(manifest.commands[0]?.status).toBe('failed');
    expect(manifest.commands[0]?.exit_code).toBe(1);
    expect(manifest.commands[0]?.error_file).toBeTruthy();

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_failed');
    expect(errorPayload.details?.command_exit_code).toBe(0);
  });

  it('preserves rollout-item thread-not-found review log noise notes in provider-worker terminal summaries', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        review_outcome: 'bounded-success',
        outputLogContent: `review output\n${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`,
        termination_boundary: {
          kind: 'relevant-reinspection-dwell',
          provenance: 'post-startup-anchor',
          reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
          sample: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1'
      }
    );
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain('Provider linear worker reached review handoff.');
    expect(result.summary).toContain(
      'review outcome: bounded success via relevant-reinspection-dwell; not a wrapper failure'
    );
    expect(result.summary).toContain(
      'review log note: Codex rollout-item thread-not-found session cleanup noise observed; successful review telemetry remains authoritative'
    );
    expect(manifest.commands[0]?.summary).toContain(
      'review log note: Codex rollout-item thread-not-found session cleanup noise observed; successful review telemetry remains authoritative'
    );
  });

  it('treats prior-attempt provider-worker proofs as missing authoritative proof', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        attempt_started_at: '1970-01-01T00:00:00.000Z',
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: 'codex_exit_9'
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain(
      'Provider linear worker failed because authoritative proof was missing or unreadable.'
    );
    expect(result.summary).not.toContain('Codex exit code 9');
    expect(manifest.commands[0]?.status).toBe('failed');

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_proof_missing_or_unreadable');
  });

  it('uses provider proof updated_at as the stale-proof fallback for older proofs', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        attempt_started_at: undefined,
        updated_at: '1970-01-01T00:00:00.000Z',
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: 'codex_exit_7'
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain(
      'Provider linear worker failed because authoritative proof was missing or unreadable.'
    );
    expect(result.summary).not.toContain('Codex exit code 7');

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_proof_missing_or_unreadable');
  });

  it('ignores stale provider-worker review telemetry from an earlier attempt in the same run', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(input, {
        status: 'failed',
        generated_at: '1970-01-01T00:00:00.000Z',
        review_outcome: 'failed-boundary',
        termination_boundary: {
          kind: 'startup-anchor',
          provenance: 'review-timeout',
          reason: 'stale telemetry',
          sample: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1'
      }
    );
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain('Provider linear worker reached review handoff.');
    expect(result.summary).not.toContain('review-wrapper failure');
    expect(manifest.commands[0]?.status).toBe('succeeded');
  });

  it('preserves proof-missing failure reason when review telemetry also fails', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, {
        status: 'failed',
        review_outcome: 'failed-boundary',
        termination_boundary: {
          kind: 'startup-anchor',
          provenance: 'review-timeout',
          reason: 'proof missing',
          sample: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain(
      'Provider linear worker failed because authoritative proof was missing or unreadable.'
    );

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_proof_missing_or_unreadable');
  });

  it('does not append stale provider-worker review telemetry when the current attempt never wrote terminal proof', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'running',
        owner_status: null,
        end_reason: null
      });
      await writeReviewArtifacts(input, {
        status: 'failed',
        generated_at: '1970-01-01T00:00:00.000Z',
        review_outcome: 'failed-boundary',
        termination_boundary: {
          kind: 'startup-anchor',
          provenance: 'review-timeout',
          reason: 'stale telemetry',
          sample: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1'
      }
    );
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toBe('Provider linear worker completed with forced standalone review enabled for handoff');
    expect(result.summary).not.toContain('review-wrapper failure');
  });

  it('ignores deterministic mutation suppressions recorded before the current provider-worker attempt', async () => {
    mockState.runImpl = async (input) => {
      const attemptStartedAt = new Date().toISOString();
      const priorAuditTimestamp = new Date(Date.parse(attemptStartedAt) - 1_000).toISOString();
      await writeProviderLinearWorkerProofArtifacts(input, {
        attempt_started_at: attemptStartedAt,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
        linear_audit: {
          path: '/tmp/provider-linear-worker-linear-audit.jsonl',
          attempted_count: 1,
          success_count: 0,
          failure_count: 1,
          latest_recorded_at: priorAuditTimestamp,
          parallelization_entries: [],
          latest_by_operation: {
            'create-follow-up': {
              recorded_at: priorAuditTimestamp,
              operation: 'create-follow-up',
              ok: false,
              issue_id: 'lin-issue-1',
              issue_identifier: 'CO-2',
              source_setup: null,
              action: null,
              via: null,
              state: null,
              follow_up_issue_id: null,
              follow_up_issue_identifier: null,
              failed_relation_type: null,
              comment_id: null,
              attachment_id: null,
              error_code: 'linear_follow_up_parity_matrix_missing',
              error_message: 'Parity/alignment follow-up issues require a parity matrix.'
            }
          }
        }
      });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain('Provider linear worker reached review handoff.');
    expect(result.summary).not.toContain('deterministic provider mutation suppressed');
    expect(manifest.commands[0]?.status).toBe('succeeded');
  });

  it('fails a succeeded provider-linear-worker stage when authoritative proof is missing', async () => {
    mockState.runImpl = async () => buildSuccessfulExecResult();

    const { env, manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain(
      'Provider linear worker failed because authoritative proof was missing or unreadable.'
    );
    expect(manifest.commands[0]?.status).toBe('failed');
    expect(manifest.commands[0]?.error_file).toBeTruthy();

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_proof_missing_or_unreadable');
    expect(errorPayload.details?.command_exit_code).toBe(0);
  });

  it('appends current archived issue mutation suppressions to the provider-worker summary', async () => {
    mockState.runImpl = async (input) => {
      const attemptStartedAt = new Date().toISOString();
      const suppressionTimestamp = new Date(Date.parse(attemptStartedAt) + 1_000).toISOString();
      await writeProviderLinearWorkerProofArtifacts(input, {
        attempt_started_at: attemptStartedAt,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
        linear_audit: {
          path: '/tmp/provider-linear-worker-linear-audit.jsonl',
          attempted_count: 1,
          success_count: 0,
          failure_count: 1,
          latest_recorded_at: suppressionTimestamp,
          parallelization_entries: [],
          latest_by_operation: {
            'upsert-workpad': {
              recorded_at: suppressionTimestamp,
              operation: 'upsert-workpad',
              ok: false,
              issue_id: 'lin-issue-1',
              issue_identifier: 'CO-2',
              source_setup: null,
              action: null,
              via: null,
              state: null,
              follow_up_issue_id: null,
              follow_up_issue_identifier: null,
              failed_relation_type: null,
              comment_id: null,
              attachment_id: null,
              error_code: 'linear_issue_not_mutable',
              error_message: 'Linear issue CO-2 is archived and trashed and cannot accept provider mutations.'
            }
          }
        }
      });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain('Provider linear worker reached review handoff.');
    expect(result.summary).toContain(
      'deterministic provider mutation suppressed: upsert-workpad cannot run while the Linear issue is archived or trashed'
    );
    expect(manifest.commands[0]?.status).toBe('succeeded');
  });

  it('preserves failed provider-worker command summaries even when proof reports success', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      return buildFailedExecResult('provider worker exited\n', 2);
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(2);
    expect(result.summary).toContain('Exited with code 2');
    expect(result.summary).not.toContain('Provider linear worker reached review handoff.');
    expect(manifest.commands[0]?.status).toBe('failed');
  });

  it('does not use summary hints for failed provider-linear-worker stages', async () => {
    mockState.runImpl = async () => buildFailedExecResult('provider worker exited\n', 2);

    const { env, manifest, paths, stage } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(2);
    expect(result.summary).toContain('Exited with code 2');
    expect(result.summary).not.toContain('forced standalone review enabled for handoff');
    expect(manifest.commands[0]?.status).toBe('failed');
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

  it('falls back to failed-other when telemetry carries a malformed termination boundary payload', async () => {
    mockState.runImpl = async (input) => {
      await writeReviewArtifacts(input, {
        status: 'failed',
        review_outcome: 'failed-boundary',
        error: 'codex review exited with code 1',
        termination_boundary: {} as Record<string, unknown>
      });
      return buildFailedExecResult('codex review exited with code 1\n');
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'review',
      title: 'npm run review',
      command: 'npm run review'
    });
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain(
      'review outcome: review command failed without termination-boundary classification; not an explicit wrapper-boundary failure'
    );
    expect(result.summary).not.toContain('review outcome: review-wrapper failure');
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
  stageSeed: Pick<CommandStage, 'id' | 'title' | 'command'> & Partial<Pick<CommandStage, 'summaryHint'>>,
  stageEnv: Record<string, string> = {}
) {
  const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
  const stage: CommandStage = {
    kind: 'command',
    id: stageSeed.id,
    title: stageSeed.title,
    command: stageSeed.command,
    ...(stageSeed.summaryHint ? { summaryHint: stageSeed.summaryHint } : {}),
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

async function writeProviderLinearWorkerProofArtifacts(
  input: Record<string, unknown>,
  overrides: Partial<Record<string, unknown>>
): Promise<void> {
  const runDir = String(((input.env ?? {}) as NodeJS.ProcessEnv).CODEX_ORCHESTRATOR_RUN_DIR);
  const currentAttemptTimestamp = new Date().toISOString();
  await writeFile(
    join(runDir, 'provider-linear-worker-proof.json'),
    JSON.stringify({
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      attempt_started_at: currentAttemptTimestamp,
      owner_phase: 'ended',
      owner_status: 'succeeded',
      end_reason: 'issue_inactive',
      updated_at: currentAttemptTimestamp,
      linear_audit: null,
      ...overrides
    }),
    'utf8'
  );
}

async function writeReviewArtifacts(
  input: Record<string, unknown>,
  overrides: Partial<{
    generated_at: string;
    status: 'succeeded' | 'failed';
    review_outcome: 'clean-success' | 'bounded-success' | 'failed-boundary' | 'failed-other';
    error: string | null;
    output_log_path: string;
    outputLogContent: string;
    omitReviewOutcome: boolean;
    termination_boundary: Record<string, unknown> | null;
  }>
): Promise<void> {
  const execEnv = (input.env ?? {}) as NodeJS.ProcessEnv;
  const repoRoot = String(execEnv.CODEX_ORCHESTRATOR_ROOT);
  const runDir = String(execEnv.CODEX_ORCHESTRATOR_RUN_DIR);
  const reviewDir = join(runDir, 'review');
  const outputLogPath = join(reviewDir, 'output.log');
  const {
    outputLogContent,
    omitReviewOutcome,
    review_outcome: overriddenReviewOutcome,
    ...telemetryOverrides
  } = overrides;
  await mkdir(reviewDir, { recursive: true });
  await writeFile(outputLogPath, outputLogContent ?? 'review output\n', 'utf8');
  const status = overrides.status ?? 'succeeded';
  const terminationBoundary = overrides.termination_boundary ?? null;
  const reviewOutcome =
    overriddenReviewOutcome ??
    deriveReviewOutcomeDisposition({
      status,
      terminationBoundary
    });
  await writeFile(
    join(reviewDir, 'telemetry.json'),
    `${JSON.stringify(
      {
        version: 1,
        generated_at: new Date().toISOString(),
        status,
        ...(omitReviewOutcome === true ? {} : { review_outcome: reviewOutcome }),
        error: null,
        output_log_path: relative(repoRoot, outputLogPath),
        termination_boundary: terminationBoundary,
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
        ...telemetryOverrides
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}
