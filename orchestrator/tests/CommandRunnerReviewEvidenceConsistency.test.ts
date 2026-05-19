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
import { PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR } from '../src/cli/providerLinearWorkerRunner.js';
import type { ProviderLinearWorkerProof } from '../src/cli/providerLinearWorkerRunner.js';
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

type ReviewArtifactOverrides = Partial<{
  generated_at: string;
  status: 'succeeded' | 'failed';
  review_outcome: 'clean-success' | 'bounded-success' | 'failed-boundary' | 'failed-other';
  review_verdict: 'findings' | 'clean' | 'unknown';
  highest_finding_priority: 'P0' | 'P1' | 'P2' | 'P3' | null;
  finding_count: number;
  contract_path: string | null;
  contract_mode: 'off' | 'shadow' | 'enforce' | null;
  contract_validation: Record<string, unknown> | null;
  contract_overall_verdict: 'clean' | 'findings' | 'blocked' | 'unknown' | null;
  axis_verdicts: Record<string, unknown> | null;
  axis_finding_counts: Record<string, unknown> | null;
  proposal_counts: Record<string, unknown> | null;
  error: string | null;
  output_log_path: string;
  outputLogContent: string;
  omitContractArtifact: boolean;
  omitReviewOutcome: boolean;
  omitStatus: boolean;
  termination_boundary: Record<string, unknown> | null;
  launch_context: Record<string, unknown> | null;
}>;

function governedStructuredLaunchContext(): Record<string, unknown> {
  return {
    scope_flag_mode: null,
    prompt_delivery: 'stdin',
    reviewer_visible_context_transport: 'stdin-prompt',
    reviewer_visible_title_source: null,
    transport: 'codex-exec-output-schema',
    output_schema_path: 'schemas/review-contract.v1.output.schema.json',
    output_last_message_path: 'review/last-message.json'
  };
}

function cleanGovernedReviewArtifactOverrides(overrides: ReviewArtifactOverrides = {}): ReviewArtifactOverrides {
  return {
    status: 'succeeded',
    review_outcome: 'clean-success',
    review_verdict: 'clean',
    finding_count: 0,
    outputLogContent: 'codex\n{"schema_version":"co.review.contract.v1"}\n',
    termination_boundary: null,
    launch_context: governedStructuredLaunchContext(),
    contract_path: 'review/contract.json',
    contract_mode: 'enforce',
    contract_validation: {
      status: 'valid',
      errors: []
    },
    contract_overall_verdict: 'clean',
    axis_verdicts: {
      spec_conformance: 'clean',
      coding_standards: 'clean',
      code_changes: 'clean',
      agent_loop: 'clean'
    },
    axis_finding_counts: {
      spec_conformance: 0,
      coding_standards: 0,
      code_changes: 0,
      agent_loop: 0
    },
    proposal_counts: {
      code_change: 0,
      agent_loop: 0
    },
    ...overrides
  };
}

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

  it('fails a succeeded provider-linear-worker stage when authoritative review telemetry reports findings', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, { owner_phase: 'ended', owner_status: 'succeeded', end_reason: 'issue_review_handoff' });
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        review_outcome: 'clean-success',
        review_verdict: 'findings',
        highest_finding_priority: 'P1',
        finding_count: 2,
        outputLogContent: [
          'Findings:',
          '- [P1] Provider-worker handoff can mark review clean despite raw findings',
          '- [P2] Workpad validation omits the review finding count',
          ''
        ].join('\n'),
        termination_boundary: null
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage({ id: 'provider-linear-worker', title: 'Run provider linear worker', command: 'node providerLinearWorkerRunner.js', summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff' }, { FORCE_CODEX_REVIEW: '1', CODEX_REVIEW_NON_INTERACTIVE: '1' });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed because standalone review reported findings.');
    expect(result.summary).toContain('review outcome: clean success');
    expect(result.summary).toContain('semantic review verdict: findings (2 findings, highest P1)');
    expect(manifest.commands[0]?.status).toBe('failed');

    const errorPayload = JSON.parse(await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_findings');
    expect(errorPayload.details?.review_outcome_summary).toContain('semantic review verdict: findings (2 findings, highest P1)');
  });

  it('waits for review handoff findings even when forced standalone review is disabled', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      setTimeout(() => {
        void writeReviewArtifacts(input, {
          status: 'succeeded',
          review_outcome: 'clean-success',
          review_verdict: 'findings',
          highest_finding_priority: 'P2',
          finding_count: 1,
          outputLogContent: '- [P2] Handoff review found an actionable issue',
          termination_boundary: null
        });
      }, 50);
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed without forced standalone review'
      },
      { FORCE_CODEX_REVIEW: '0', CODEX_REVIEW_NON_INTERACTIVE: '1' }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed because standalone review reported findings.');
    expect(result.summary).toContain('semantic review verdict: findings (1 finding, highest P2)');

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_findings');
  });

  it('waits past stale handoff review telemetry until fresh findings arrive', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(input, {
        generated_at: '2000-01-01T00:00:00.000Z',
        status: 'succeeded',
        review_outcome: 'clean-success',
        review_verdict: 'clean',
        finding_count: 0,
        outputLogContent: 'No actionable issues.',
        termination_boundary: null
      });
      setTimeout(() => {
        void writeReviewArtifacts(input, {
          status: 'succeeded',
          review_outcome: 'clean-success',
          review_verdict: 'findings',
          highest_finding_priority: 'P1',
          finding_count: 1,
          outputLogContent: '- [P1] Fresh handoff review finding',
          termination_boundary: null
        });
      }, 50);
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with stale review telemetry',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed while review telemetry was being refreshed'
      },
      { FORCE_CODEX_REVIEW: '1', CODEX_REVIEW_NON_INTERACTIVE: '1' }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed because standalone review reported findings.');
    expect(result.summary).toContain('semantic review verdict: findings (1 finding, highest P1)');

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_findings');
  });

  it('polls past stale provider-worker review telemetry before accepting clean handoff verdicts', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        generated_at: '1970-01-01T00:00:00.000Z',
        review_outcome: 'clean-success',
        review_verdict: 'unknown',
        finding_count: 0,
        outputLogContent: 'stale review output',
        termination_boundary: null
      });
      setTimeout(() => {
        void writeReviewArtifacts(input, {
          status: 'succeeded',
          review_outcome: 'clean-success',
          review_verdict: 'clean',
          finding_count: 0,
          outputLogContent: 'No actionable issues.',
          termination_boundary: null
        });
      }, 50);
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      { FORCE_CODEX_REVIEW: '1', CODEX_REVIEW_NON_INTERACTIVE: '1' }
    );
    const result = await runCommandStage({ ...context, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain('Provider linear worker reached review handoff.');
    expect(result.summary).toContain('semantic review verdict: clean');
    expect(result.summary).not.toContain('semantic review verdict: unknown');
    expect(manifest.commands[0]?.status).toBe('succeeded');
    expect(manifest.commands[0]?.error_file).toBeNull();
  });

  it('accepts clean nested implementation-gate review evidence when parent provider telemetry is absent', async () => {
    mockState.runImpl = async (input) => {
      const execEnv = (input.env ?? {}) as NodeJS.ProcessEnv;
      const proofAttemptStartedAt = new Date().toISOString();
      await writeProviderLinearWorkerProofArtifacts(input, {
        attempt_started_at: proofAttemptStartedAt,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
        workspace_path: String(execEnv.CODEX_ORCHESTRATOR_ROOT),
        linear_audit: {
          latest_by_operation: {
            transition: {
              operation: 'transition',
              ok: true,
              issue_id: 'lin-issue-1',
              action: 'In Progress -> In Review',
              recorded_at: new Date(Date.parse(proofAttemptStartedAt) + 1).toISOString()
            }
          }
        }
      });
      await rm(join(String(execEnv.CODEX_ORCHESTRATOR_RUN_DIR), 'review'), {
        recursive: true,
        force: true
      });
      await writeNestedImplementationGateReviewArtifacts(
        input,
        {
          generated_at: new Date(Date.parse(proofAttemptStartedAt) + 2).toISOString()
        },
        {
          parentRunId: String(execEnv.CODEX_ORCHESTRATOR_RUN_ID),
          runsRoot: String(execEnv.CODEX_ORCHESTRATOR_RUNS_DIR)
        }
      );
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with nested review evidence',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with nested implementation-gate review evidence'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      }
    );
    env.runsRoot = join(env.repoRoot, 'custom-runs');
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain('Provider linear worker reached review handoff.');
    expect(result.summary).toContain('semantic review verdict: clean');
    expect(result.summary).toContain('review contract: mode=enforce, validation=valid, overall=clean');
    expect(result.summary).toContain('review evidence source: nested implementation-gate');
    expect(manifest.commands[0]?.status).toBe('succeeded');
    expect(manifest.commands[0]?.error_file).toBeNull();
    await expect(readFile(join(paths.runDir, 'review', 'telemetry.json'), 'utf8')).rejects.toThrow();
  });

  it('fails closed when nested implementation-gate review evidence is outside the configured runs root', async () => {
    mockState.runImpl = async (input) => {
      const execEnv = (input.env ?? {}) as NodeJS.ProcessEnv;
      const proofAttemptStartedAt = new Date().toISOString();
      await writeProviderLinearWorkerProofArtifacts(input, {
        attempt_started_at: proofAttemptStartedAt,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
        workspace_path: String(execEnv.CODEX_ORCHESTRATOR_ROOT)
      });
      await rm(join(String(execEnv.CODEX_ORCHESTRATOR_RUN_DIR), 'review'), {
        recursive: true,
        force: true
      });
      await writeNestedImplementationGateReviewArtifacts(
        input,
        {
          generated_at: new Date(Date.parse(proofAttemptStartedAt) + 2).toISOString()
        },
        {
          parentRunId: String(execEnv.CODEX_ORCHESTRATOR_RUN_ID),
          runsRoot: join(String(execEnv.CODEX_ORCHESTRATOR_ROOT), '.runs')
        }
      );
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with nested review evidence outside configured runs root',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with stale default-root nested implementation-gate review evidence'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      }
    );
    env.runsRoot = join(env.repoRoot, 'custom-runs');
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('review contract: required but telemetry is missing');
    expect(result.summary).toContain('expected review telemetry path:');
    expect(result.summary).not.toContain('review evidence source: nested implementation-gate');
  });

  it('fails closed when nested implementation-gate review evidence is not bound to the provider issue', async () => {
    mockState.runImpl = async (input) => {
      const execEnv = (input.env ?? {}) as NodeJS.ProcessEnv;
      const proofAttemptStartedAt = new Date().toISOString();
      await writeProviderLinearWorkerProofArtifacts(input, {
        issue_id: 'lin-issue-56',
        issue_identifier: 'CO-56',
        attempt_started_at: proofAttemptStartedAt,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
        workspace_path: String(execEnv.CODEX_ORCHESTRATOR_ROOT)
      });
      await rm(join(String(execEnv.CODEX_ORCHESTRATOR_RUN_DIR), 'review'), {
        recursive: true,
        force: true
      });
      await writeNestedImplementationGateReviewArtifacts(
        input,
        {
          generated_at: new Date(Date.parse(proofAttemptStartedAt) + 2).toISOString()
        },
        {
          taskId: 'linear-CO-560',
          parentRunId: String(execEnv.CODEX_ORCHESTRATOR_RUN_ID),
          issueId: 'lin-issue-560',
          issueIdentifier: 'CO-560'
        }
      );
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with unbound nested review evidence',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with unbound nested implementation-gate review evidence'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed because standalone review did not produce a concrete verdict.');
    expect(result.summary).toContain('review contract: required but telemetry is missing');
    expect(result.summary).toContain('expected review telemetry path:');
    expect(result.summary).not.toContain('review evidence source: nested implementation-gate');

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_unknown');
    expect(errorPayload.details?.review_telemetry_path).toBe(relative(env.repoRoot, join(paths.runDir, 'review', 'telemetry.json')));
  });

  it('fails closed when same-issue nested implementation-gate review evidence lacks provider attempt lineage', async () => {
    mockState.runImpl = async (input) => {
      const execEnv = (input.env ?? {}) as NodeJS.ProcessEnv;
      const proofAttemptStartedAt = new Date().toISOString();
      await writeProviderLinearWorkerProofArtifacts(input, {
        attempt_started_at: proofAttemptStartedAt,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff',
        workspace_path: String(execEnv.CODEX_ORCHESTRATOR_ROOT)
      });
      await rm(join(String(execEnv.CODEX_ORCHESTRATOR_RUN_DIR), 'review'), {
        recursive: true,
        force: true
      });
      await writeNestedImplementationGateReviewArtifacts(input, {
        generated_at: new Date(Date.parse(proofAttemptStartedAt) + 2).toISOString()
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with unlineaged nested review evidence',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with unlineaged nested implementation-gate review evidence'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('review contract: required but telemetry is missing');
    expect(result.summary).toContain('expected review telemetry path:');
    expect(result.summary).not.toContain('review evidence source: nested implementation-gate');
  });

  it('requires review telemetry to be fresh for the provider proof attempt', async () => {
    mockState.runImpl = async (input) => {
      const now = Date.now();
      const staleGeneratedAt = new Date(now).toISOString();
      const proofAttemptStartedAt = new Date(now + 100).toISOString();
      const freshGeneratedAt = new Date(now + 200).toISOString();
      await writeProviderLinearWorkerProofArtifacts(input, {
        attempt_started_at: proofAttemptStartedAt,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(input, {
        generated_at: staleGeneratedAt,
        status: 'succeeded',
        review_outcome: 'clean-success',
        review_verdict: 'clean',
        finding_count: 0,
        outputLogContent: 'No actionable issues.',
        termination_boundary: null
      });
      setTimeout(() => {
        void writeReviewArtifacts(input, {
          generated_at: freshGeneratedAt,
          status: 'succeeded',
          review_outcome: 'clean-success',
          review_verdict: 'findings',
          highest_finding_priority: 'P1',
          finding_count: 1,
          outputLogContent: '- [P1] Fresh proof-attempt review finding',
          termination_boundary: null
        });
      }, 50);
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with retry-attempt review telemetry',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed after retry attempt review telemetry refreshed'
      },
      { FORCE_CODEX_REVIEW: '1', CODEX_REVIEW_NON_INTERACTIVE: '1' }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed because standalone review reported findings.');
    expect(result.summary).toContain('semantic review verdict: findings (1 finding, highest P1)');

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_findings');
  });

  it('fails succeeded provider-linear-worker stages when review telemetry verdict is unknown or omitted', async () => {
    const cases = [{ name: 'unknown', review_verdict: 'unknown' as const, output: '' }, { name: 'omitted', output: 'No actionable findings.' }, { name: 'missing', missingTelemetry: true }] as const;

    for (const testCase of cases) {
      mockState.runImpl = async (input) => {
        await writeProviderLinearWorkerProofArtifacts(input, { owner_phase: 'ended', owner_status: 'succeeded', end_reason: 'issue_review_handoff' });
        if ('missingTelemetry' in testCase) await rm(join(String(((input.env ?? {}) as NodeJS.ProcessEnv).CODEX_ORCHESTRATOR_RUN_DIR), 'review'), { recursive: true, force: true });
        if (!('missingTelemetry' in testCase)) {
          await writeReviewArtifacts(input, { status: 'succeeded', review_outcome: 'clean-success', ...('review_verdict' in testCase ? { review_verdict: testCase.review_verdict } : {}), finding_count: 0, outputLogContent: ['codex', testCase.output].join('\n'), termination_boundary: null });
        }
        return buildSuccessfulExecResult();
      };

      const { env, manifest, paths, stage } = await bootstrapCommandStage({ id: 'provider-linear-worker', title: `Run provider linear worker (${testCase.name})`, command: 'node providerLinearWorkerRunner.js', summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff' }, { FORCE_CODEX_REVIEW: '1', CODEX_REVIEW_NON_INTERACTIVE: '1' });
      const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

      expect(result.exitCode).toBe(1);
      expect(result.summary).toContain('Provider linear worker failed because standalone review did not produce a concrete verdict.');
      expect(result.summary).toContain('semantic review verdict: unknown');
      expect(result.summary).not.toContain('semantic review verdict: unknown; semantic review verdict: unknown');

      const errorPayload = JSON.parse(await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')) as { reason?: string; details?: Record<string, unknown> };
      expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
      expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_unknown');
      expect(errorPayload.details?.review_outcome_summary).toContain('semantic review verdict: unknown');
    }
  });

  it('fails provider-linear-worker review handoff when the authoritative gate implies missing contract evidence is required', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        review_outcome: 'clean-success',
        review_verdict: 'clean',
        finding_count: 0,
        outputLogContent: 'codex\nI found no actionable issues.\n',
        termination_boundary: null
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with missing governed contract',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed because standalone review did not produce a concrete verdict.');
    expect(result.summary).toContain('review contract: required but missing');

    const errorPayload = JSON.parse(await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_unknown');
    expect(errorPayload.details?.review_outcome_summary).toContain('review contract: required but missing');
  });

  it('fails governed provider-linear-worker review handoff when the contract artifact is absent', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(input, {
        ...cleanGovernedReviewArtifactOverrides(),
        omitContractArtifact: true
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with missing governed contract artifact',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed (governed_review_handoff_not_clean).');
    expect(result.summary).toContain('governed review handoff failed: review contract artifact is missing');

    const errorPayload = JSON.parse(await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_not_clean');
    expect(errorPayload.details?.review_outcome_summary).toContain('review contract artifact is missing');
  });

  it('fails provider-linear-worker review handoff on non-clean governed contract verdicts', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        review_outcome: 'clean-success',
        review_verdict: 'clean',
        finding_count: 0,
        outputLogContent: 'codex\n{"schema_version":"co.review.contract.v1"}\n',
        termination_boundary: null,
        launch_context: governedStructuredLaunchContext(),
        contract_path: 'review/contract.json',
        contract_mode: 'enforce',
        contract_validation: {
          status: 'valid',
          errors: []
        },
        contract_overall_verdict: 'blocked',
        axis_verdicts: {
          spec_conformance: 'clean',
          coding_standards: 'clean',
          code_changes: 'clean',
          agent_loop: 'blocked'
        },
        axis_finding_counts: {
          spec_conformance: 0,
          coding_standards: 0,
          code_changes: 0,
          agent_loop: 1
        },
        proposal_counts: {
          code_change: 0,
          agent_loop: 1
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with blocked governed contract',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed because standalone review reported findings.');
    expect(result.summary).toContain('review contract: mode=enforce, validation=valid, overall=blocked');
    expect(result.summary).toContain('review contract proposals: code_change=0, agent_loop=1');

    const errorPayload = JSON.parse(await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_findings');
    expect(errorPayload.details?.review_outcome_summary).toContain('overall=blocked');
  });

  it('fails governed provider-linear-worker review handoff on bounded-success telemetry', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        review_outcome: 'bounded-success',
        review_verdict: 'clean',
        finding_count: 0,
        outputLogContent: 'codex\n{"schema_version":"co.review.contract.v1"}\n',
        termination_boundary: {
          kind: 'relevant-reinspection-dwell',
          provenance: 'post-startup-anchor',
          reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
          sample: null
        },
        contract_path: 'review/contract.json',
        contract_mode: 'enforce',
        contract_validation: {
          status: 'valid',
          errors: []
        },
        contract_overall_verdict: 'clean',
        axis_verdicts: {
          spec_conformance: 'clean',
          coding_standards: 'clean',
          code_changes: 'clean',
          agent_loop: 'clean'
        },
        axis_finding_counts: {
          spec_conformance: 0,
          coding_standards: 0,
          code_changes: 0,
          agent_loop: 0
        },
        proposal_counts: {
          code_change: 0,
          agent_loop: 0
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with bounded governed review telemetry',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed (governed_review_handoff_not_clean).');
    expect(result.summary).toContain('review outcome: bounded success via relevant-reinspection-dwell');
    expect(result.summary).toContain('review contract: mode=enforce, validation=valid, overall=clean');
    expect(result.summary).toContain('governed review handoff failed: review outcome is bounded-success');

    const errorPayload = JSON.parse(await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_not_clean');
    expect(errorPayload.details?.review_outcome_summary).toContain('review outcome is bounded-success');
  });

  it('fails governed provider-linear-worker review handoff after a legacy fallback launch', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(input, {
        status: 'succeeded',
        review_outcome: 'clean-success',
        review_verdict: 'clean',
        finding_count: 0,
        outputLogContent: 'codex\n{"schema_version":"co.review.contract.v1"}\n',
        termination_boundary: null,
        launch_context: {
          legacy_fallback_attempt: 'review-wrapper-read-only-sandbox-compatibility'
        },
        contract_path: 'review/contract.json',
        contract_mode: 'enforce',
        contract_validation: {
          status: 'valid',
          errors: []
        },
        contract_overall_verdict: 'clean',
        axis_verdicts: {
          spec_conformance: 'clean',
          coding_standards: 'clean',
          code_changes: 'clean',
          agent_loop: 'clean'
        },
        axis_finding_counts: {
          spec_conformance: 0,
          coding_standards: 0,
          code_changes: 0,
          agent_loop: 0
        },
        proposal_counts: {
          code_change: 0,
          agent_loop: 0
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with fallback governed review launch',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('review outcome: clean success');
    expect(result.summary).toContain('review contract: mode=enforce, validation=valid, overall=clean');
    expect(result.summary).toContain(
      'governed review handoff failed: review launch used legacy fallback review-wrapper-read-only-sandbox-compatibility'
    );

    const errorPayload = JSON.parse(await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_not_clean');
    expect(errorPayload.details?.review_outcome_summary).toContain(
      'review launch used legacy fallback review-wrapper-read-only-sandbox-compatibility'
    );
  });

  it('fails governed provider-linear-worker review handoff without structured review launch context', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(input, cleanGovernedReviewArtifactOverrides({ launch_context: null }));
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with missing governed launch context',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('review outcome: clean success');
    expect(result.summary).toContain('review contract: mode=enforce, validation=valid, overall=clean');
    expect(result.summary).toContain('governed review handoff failed: review launch context is missing');

    const errorPayload = JSON.parse(await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_not_clean');
    expect(errorPayload.details?.review_outcome_summary).toContain('review launch context is missing');
  });

  it('fails governed provider-linear-worker review handoff on missing terminal review outcome', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(
        input,
        cleanGovernedReviewArtifactOverrides({
          omitReviewOutcome: true
        })
      );
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with missing governed review outcome',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed (governed_review_handoff_not_clean).');
    expect(result.summary).toContain('governed review handoff failed: review outcome is missing or invalid');

    const errorPayload = JSON.parse(await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_not_clean');
    expect(errorPayload.details?.review_outcome_summary).toContain('review outcome is missing or invalid');
  });

  it('fails governed provider-linear-worker review handoff on unrecognized terminal review outcome', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(
        input,
        cleanGovernedReviewArtifactOverrides({
          review_outcome: 'fallback-clean' as never
        })
      );
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with invalid governed review outcome',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed (governed_review_handoff_not_clean).');
    expect(result.summary).toContain('governed review handoff failed: review outcome is missing or invalid');

    const errorPayload = JSON.parse(await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_not_clean');
    expect(errorPayload.details?.review_outcome_summary).toContain('review outcome is missing or invalid');
  });

  it('fails governed provider-linear-worker review handoff when agent-loop proposals remain unrouted', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_review_handoff'
      });
      await writeReviewArtifacts(
        input,
        cleanGovernedReviewArtifactOverrides({
          proposal_counts: {
            code_change: 0,
            agent_loop: 1
          }
        })
      );
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage(
      {
        id: 'provider-linear-worker',
        title: 'Run provider linear worker with unrouted agent loop proposal',
        command: 'node providerLinearWorkerRunner.js',
        summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
      },
      {
        FORCE_CODEX_REVIEW: '1',
        CODEX_REVIEW_NON_INTERACTIVE: '1',
        CODEX_REVIEW_AUTHORITATIVE_GATE: '1',
        CODEX_REVIEW_CONTRACT_MODE: 'enforce'
      }
    );
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('review contract: mode=enforce, validation=valid, overall=clean');
    expect(result.summary).toContain('review contract proposals: code_change=0, agent_loop=1');
    expect(result.summary).toContain('governed review handoff failed: agent-loop proposals require routing before handoff');

    const errorPayload = JSON.parse(await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_not_clean');
    expect(errorPayload.details?.review_outcome_summary).toContain(
      'agent-loop proposals require routing before handoff'
    );
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
        review_verdict: 'clean',
        finding_count: 0,
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

  it('fails closed on stale provider-worker review telemetry when FORCE_CODEX_REVIEW is inherited', async () => {
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
    delete stage.env?.FORCE_CODEX_REVIEW;
    const result = await runCommandStage({
      ...context,
      manifest,
      stage,
      index: 1,
      envOverrides: {
        FORCE_CODEX_REVIEW: '1'
      }
    });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain(
      'Provider linear worker failed because standalone review did not produce a concrete verdict.'
    );
    expect(result.summary).toContain('semantic review verdict: unknown');
    expect(result.summary).not.toContain('review-wrapper failure');
    expect(manifest.commands[0]?.status).toBe('failed');

    const errorPayload = JSON.parse(
      await readFile(join(context.env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('provider-linear-worker-authoritative-failed');
    expect(errorPayload.details?.failure_reason).toBe('provider_linear_worker_review_unknown');
    expect(errorPayload.details?.review_outcome_summary).toContain(
      'semantic review verdict: unknown'
    );
  });

  it('does not require review telemetry for inherited FORCE_CODEX_REVIEW when the provider worker stops before review handoff', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive'
      });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
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
      'Provider linear worker stopped because the issue was no longer active.'
    );
    expect(result.summary).not.toContain('semantic review verdict: unknown');
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
      await writeReviewArtifacts(input, { status: 'succeeded', review_outcome: 'clean-success', review_verdict: 'clean', finding_count: 0, outputLogContent: 'No actionable issues.' });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    }, {
      FORCE_CODEX_REVIEW: '0'
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

  it('copies provider-worker advisory goal evidence from proof into the final manifest persist', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        thread_id: 'thread-goal',
        latest_turn_id: 'turn-goal-1',
        current_turn_started_at: '2026-03-21T08:58:00.000Z',
        goal_evidence: {
          source: 'codex-goals',
          feature_available: true,
          feature_enabled: true,
          capture_mode: 'captured',
          capture_timestamp: '2026-03-21T09:00:00.250Z',
          thread_id: 'thread-goal',
          turn_id: 'turn-goal-1',
          objective: 'capture advisory goal evidence',
          status: 'active',
          token_budget: 5000,
          tokens_used: 321,
          elapsed_seconds: 66.5,
          created_at: '2026-03-21T08:59:00.000Z',
          updated_at: '2026-03-21T09:00:00.000Z',
          authority: 'advisory_only',
          linear_authority_preserved: true,
          not_authorized_for: [...PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR],
          reason: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });
    const persisted = JSON.parse(await readFile(paths.manifestPath, 'utf8')) as {
      goal_evidence?: Record<string, unknown> | null;
    };

    expect(result.exitCode).toBe(0);
    expect(manifest.goal_evidence).toMatchObject({
      capture_mode: 'captured',
      authority: 'advisory_only',
      linear_authority_preserved: true
    });
    expect(persisted.goal_evidence).toMatchObject({
      capture_mode: 'captured',
      authority: 'advisory_only',
      linear_authority_preserved: true
    });
    expect(persisted.goal_evidence?.not_authorized_for).toEqual(
      PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR
    );
  });

  it('fails closed before manifest persist when proof goal evidence mismatches the proof thread', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        thread_id: 'thread-proof',
        latest_turn_id: 'turn-proof-1',
        current_turn_started_at: '2026-03-21T08:58:00.000Z',
        goal_evidence: {
          source: 'codex-goals',
          feature_available: true,
          feature_enabled: true,
          capture_mode: 'captured',
          capture_timestamp: '2026-03-21T09:00:00.250Z',
          thread_id: 'thread-other',
          turn_id: 'turn-other-1',
          objective: 'must not leak cross-thread',
          status: 'active',
          token_budget: 5000,
          tokens_used: 321,
          elapsed_seconds: 66.5,
          created_at: '2026-03-21T08:59:00.000Z',
          updated_at: '2026-03-21T09:00:00.000Z',
          authority: 'advisory_only',
          linear_authority_preserved: true,
          not_authorized_for: [...PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR],
          reason: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });
    const persisted = JSON.parse(await readFile(paths.manifestPath, 'utf8')) as {
      goal_evidence?: Record<string, unknown> | null;
    };

    expect(result.exitCode).toBe(0);
    expect(persisted.goal_evidence).toMatchObject({
      capture_mode: 'thread_mismatch',
      thread_id: 'thread-other',
      objective: null,
      status: null,
      reason: 'goal_thread_mismatch:thread-other->thread-proof',
      authority: 'advisory_only',
      linear_authority_preserved: true
    });
  });

  it('fails closed before manifest persist when proof goal evidence predates the current turn', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        thread_id: 'thread-goal',
        latest_turn_id: 'turn-goal-2',
        current_turn_started_at: '2026-03-21T09:10:00.000Z',
        goal_evidence: {
          source: 'codex-goals',
          feature_available: true,
          feature_enabled: true,
          capture_mode: 'captured',
          capture_timestamp: '2026-03-21T09:00:00.250Z',
          thread_id: 'thread-goal',
          turn_id: 'turn-goal-1',
          objective: 'must not leak stale evidence',
          status: 'active',
          token_budget: 5000,
          tokens_used: 321,
          elapsed_seconds: 66.5,
          created_at: '2026-03-21T08:59:00.000Z',
          updated_at: '2026-03-21T09:00:00.000Z',
          authority: 'advisory_only',
          linear_authority_preserved: true,
          not_authorized_for: [...PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR],
          reason: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });
    const persisted = JSON.parse(await readFile(paths.manifestPath, 'utf8')) as {
      goal_evidence?: Record<string, unknown> | null;
    };

    expect(result.exitCode).toBe(0);
    expect(persisted.goal_evidence).toMatchObject({
      capture_mode: 'stale',
      thread_id: 'thread-goal',
      objective: null,
      status: null,
      reason: 'goal_evidence_predates_current_turn',
      authority: 'advisory_only',
      linear_authority_preserved: true
    });
  });

  it('fails closed before manifest persist when proof goal evidence lacks freshness timestamps', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        thread_id: 'thread-goal',
        latest_turn_id: 'turn-goal-1',
        current_turn_started_at: '2026-03-21T08:58:00.000Z',
        goal_evidence: {
          source: 'codex-goals',
          feature_available: true,
          feature_enabled: true,
          capture_mode: 'captured',
          capture_timestamp: null,
          thread_id: 'thread-goal',
          turn_id: 'turn-goal-1',
          objective: 'must not be restamped as fresh',
          status: 'active',
          token_budget: 5000,
          tokens_used: 321,
          elapsed_seconds: 66.5,
          created_at: null,
          updated_at: null,
          authority: 'advisory_only',
          linear_authority_preserved: true,
          not_authorized_for: [...PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR],
          reason: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });
    const persisted = JSON.parse(await readFile(paths.manifestPath, 'utf8')) as {
      goal_evidence?: Record<string, unknown> | null;
    };

    expect(result.exitCode).toBe(0);
    expect(persisted.goal_evidence).toMatchObject({
      capture_mode: 'unavailable',
      thread_id: 'thread-goal',
      objective: null,
      status: null,
      reason: 'goal_timestamp_unavailable',
      authority: 'advisory_only',
      linear_authority_preserved: true
    });
  });

  it('fails closed before manifest persist when proof goal evidence lacks a turn freshness floor', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        attempt_started_at: null,
        current_turn_started_at: null,
        thread_id: 'thread-goal',
        latest_turn_id: 'turn-goal-1',
        goal_evidence: {
          source: 'codex-goals',
          feature_available: true,
          feature_enabled: true,
          capture_mode: 'captured',
          capture_timestamp: '2026-03-21T09:00:00.250Z',
          thread_id: 'thread-goal',
          turn_id: 'turn-goal-1',
          objective: 'must not leak without a turn floor',
          status: 'active',
          token_budget: 5000,
          tokens_used: 321,
          elapsed_seconds: 66.5,
          created_at: '2026-03-21T08:59:00.000Z',
          updated_at: '2026-03-21T09:00:00.000Z',
          authority: 'advisory_only',
          linear_authority_preserved: true,
          not_authorized_for: [...PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR],
          reason: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });
    const persisted = JSON.parse(await readFile(paths.manifestPath, 'utf8')) as {
      goal_evidence?: Record<string, unknown> | null;
    };

    expect(result.exitCode).toBe(0);
    expect(persisted.goal_evidence).toMatchObject({
      capture_mode: 'unavailable',
      thread_id: 'thread-goal',
      objective: null,
      status: null,
      reason: 'goal_current_turn_started_at_unavailable',
      authority: 'advisory_only',
      linear_authority_preserved: true
    });
  });

  it('rejects provider-worker goal evidence with incomplete lifecycle denial markers', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        goal_evidence: {
          source: 'codex-goals',
          feature_available: true,
          feature_enabled: true,
          capture_mode: 'captured',
          capture_timestamp: '2026-03-21T09:00:00.250Z',
          thread_id: 'thread-goal',
          turn_id: 'turn-goal-1',
          objective: 'partial denial evidence',
          status: 'active',
          token_budget: 5000,
          tokens_used: 321,
          elapsed_seconds: 66.5,
          created_at: '2026-03-21T08:59:00.000Z',
          updated_at: '2026-03-21T09:00:00.000Z',
          authority: 'advisory_only',
          linear_authority_preserved: true,
          not_authorized_for: ['linear_transition', 'review_handoff', 'merge_closeout'],
          reason: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });
    const persisted = JSON.parse(await readFile(paths.manifestPath, 'utf8')) as {
      goal_evidence?: Record<string, unknown> | null;
    };

    expect(result.exitCode).toBe(0);
    expect(manifest.goal_evidence).toBeNull();
    expect(persisted.goal_evidence).toBeNull();
  });

  it('rejects malformed provider-worker goal evidence before manifest fallback synthesis', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        thread_id: 'thread-goal',
        latest_turn_id: 'turn-goal-1',
        current_turn_started_at: '2026-03-21T08:58:00.000Z',
        goal_evidence: {
          source: 'codex-goals',
          feature_available: true,
          feature_enabled: true,
          capture_mode: 'not-a-real-mode',
          capture_timestamp: '2026-03-21T09:00:00.250Z',
          thread_id: 'thread-goal',
          turn_id: 'turn-goal-1',
          objective: 'malformed evidence should not synthesize unavailable',
          status: 'active',
          token_budget: 5000,
          tokens_used: 321,
          elapsed_seconds: 66.5,
          created_at: '2026-03-21T08:59:00.000Z',
          updated_at: '2026-03-21T09:00:00.000Z',
          authority: 'advisory_only',
          linear_authority_preserved: true,
          not_authorized_for: [...PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR],
          reason: null
        } as unknown as ProviderLinearWorkerProof['goal_evidence']
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });
    const persisted = JSON.parse(await readFile(paths.manifestPath, 'utf8')) as {
      goal_evidence?: Record<string, unknown> | null;
    };

    expect(result.exitCode).toBe(0);
    expect(manifest.goal_evidence).toBeNull();
    expect(persisted.goal_evidence).toBeNull();
  });

  it('clears non-captured provider-worker goal evidence payload fields before manifest persist', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        goal_evidence: {
          source: 'codex-goals',
          feature_available: true,
          feature_enabled: true,
          capture_mode: 'stale',
          capture_timestamp: '2026-03-21T09:00:00.250Z',
          thread_id: 'thread-goal',
          turn_id: 'turn-goal-1',
          objective: 'must not leak',
          status: 'active',
          token_budget: 5000,
          tokens_used: 321,
          elapsed_seconds: 66.5,
          created_at: '2026-03-21T08:59:00.000Z',
          updated_at: '2026-03-21T09:00:00.000Z',
          authority: 'advisory_only',
          linear_authority_preserved: true,
          not_authorized_for: [...PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR],
          reason: 'goal_evidence_predates_current_turn'
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });
    const persisted = JSON.parse(await readFile(paths.manifestPath, 'utf8')) as {
      goal_evidence?: Record<string, unknown> | null;
    };

    expect(result.exitCode).toBe(0);
    expect(persisted.goal_evidence).toMatchObject({
      capture_mode: 'stale',
      objective: null,
      status: null,
      token_budget: null,
      tokens_used: null,
      elapsed_seconds: null,
      created_at: null,
      updated_at: null,
      reason: 'goal_evidence_predates_current_turn'
    });
  });

  it('rejects provider-worker goal evidence that lacks advisory authority markers', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        goal_evidence: {
          source: 'codex-goals',
          feature_available: true,
          feature_enabled: true,
          capture_mode: 'captured',
          capture_timestamp: '2026-03-21T09:00:00.250Z',
          thread_id: 'thread-goal',
          turn_id: 'turn-goal-1',
          objective: 'tampered lifecycle goal evidence',
          status: 'active',
          token_budget: 5000,
          tokens_used: 321,
          elapsed_seconds: 66.5,
          created_at: '2026-03-21T08:59:00.000Z',
          updated_at: '2026-03-21T09:00:00.000Z',
          authority: 'lifecycle_control',
          linear_authority_preserved: false,
          not_authorized_for: ['linear_transition', 'review_handoff'],
          reason: null
        }
      });
      return buildSuccessfulExecResult();
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });
    const persisted = JSON.parse(await readFile(paths.manifestPath, 'utf8')) as {
      goal_evidence?: Record<string, unknown> | null;
    };

    expect(result.exitCode).toBe(0);
    expect(manifest.goal_evidence).toBeNull();
    expect(persisted.goal_evidence).toBeNull();
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
      await writeReviewArtifacts(input, { status: 'succeeded', review_outcome: 'clean-success', review_verdict: 'clean', finding_count: 0, outputLogContent: 'No actionable issues.' });
      return buildSuccessfulExecResult();
    };

    const { manifest, stage, ...context } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    }, {
      FORCE_CODEX_REVIEW: '0'
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

  it('demotes repeated provider proof-lock diagnostics when terminal proof has a distinct failure cause', async () => {
    mockState.runImpl = async (input) => {
      await writeProviderLinearWorkerProofArtifacts(input, {
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: 'parallelization_serial_conflict'
      });
      return buildFailedExecResult([
        'provider-linear-worker recorded `stay_serial` for the current turn, but same-issue child lanes were still launched during that turn.',
        'Failed to acquire provider-linear-worker proof lock after 2 attempts. [lock_diagnostics path=/tmp/run/provider-linear-worker-proof.json.lock owner_status=same_host_process_not_live recoverable=true]',
        'Failed to acquire provider-linear-worker proof lock after 2 attempts. [lock_diagnostics path=/tmp/run/provider-linear-worker-proof.json.lock owner_status=same_host_process_not_live recoverable=true]'
      ].join('\n'));
    };

    const { env, manifest, paths, stage } = await bootstrapCommandStage({
      id: 'provider-linear-worker',
      title: 'Run provider linear worker',
      command: 'node providerLinearWorkerRunner.js',
      summaryHint: 'Provider linear worker completed with forced standalone review enabled for handoff'
    });
    const result = await runCommandStage({ env, paths, manifest, stage, index: 1 });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Provider linear worker failed (parallelization_serial_conflict).');
    expect(result.summary).not.toContain('proof lock');
    expect(manifest.commands[0]?.status).toBe('failed');

    const errorPayload = JSON.parse(
      await readFile(join(env.repoRoot, manifest.commands[0]?.error_file as string), 'utf8')
    ) as { reason?: string; details?: Record<string, unknown> };
    expect(errorPayload.reason).toBe('command-failed');
    expect(errorPayload.details?.provider_linear_worker_end_reason).toBe('parallelization_serial_conflict');
    expect(errorPayload.details?.stderr).toBe(
      'provider-linear-worker recorded `stay_serial` for the current turn, but same-issue child lanes were still launched during that turn.'
    );
    expect(errorPayload.details?.stderr).not.toContain('proof lock');
    expect(errorPayload.details?.secondary_diagnostics).toMatchObject({
      provider_linear_worker_proof_lock: {
        disposition: 'deduped_secondary',
        count: 2
      }
    });
    const proofLockDiagnostics = (
      errorPayload.details?.secondary_diagnostics as
        | { provider_linear_worker_proof_lock?: { samples?: string[] } }
        | undefined
    )?.provider_linear_worker_proof_lock;
    const samples = proofLockDiagnostics?.samples ?? [];
    expect(samples.length).toBeLessThanOrEqual(3);
    expect(new Set(samples).size).toBe(samples.length);
    expect(samples.join('\n')).toContain('Failed to acquire provider-linear-worker proof lock');
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
      CODEX_REVIEW_AUTHORITATIVE_GATE: '0',
      CODEX_REVIEW_CONTRACT_MODE: '',
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

async function writeNestedImplementationGateReviewArtifacts(
  input: Record<string, unknown>,
  overrides: ReviewArtifactOverrides = {},
  options: {
    taskId?: string;
    issueId?: string;
    issueIdentifier?: string;
    omitIssueIdentity?: boolean;
    parentRunId?: string;
    runsRoot?: string;
  } = {}
): Promise<void> {
  const execEnv = (input.env ?? {}) as NodeJS.ProcessEnv;
  const repoRoot = String(execEnv.CODEX_ORCHESTRATOR_ROOT);
  const taskId = options.taskId ?? 'linear-lin-issue-1';
  const runDir = join(
    options.runsRoot ?? join(repoRoot, '.runs'),
    taskId,
    'cli',
    '2026-05-19T00-00-00-000Z-implementation-gate'
  );
  const contractPath = join(runDir, 'review', 'contract.json');
  const issueIdentity = options.omitIssueIdentity === true
    ? {}
    : {
        issue_id: options.issueId ?? 'lin-issue-1',
        issue_identifier: options.issueIdentifier ?? 'CO-2'
      };
  await mkdir(runDir, { recursive: true });
  await writeFile(
    join(runDir, 'manifest.json'),
    `${JSON.stringify(
      {
        run_id: '2026-05-19T00-00-00-000Z-implementation-gate',
        task_id: taskId,
        pipeline_id: 'implementation-gate',
        status: 'succeeded',
        issue_provider: 'linear',
        ...(options.parentRunId ? { parent_run_id: options.parentRunId } : {}),
        ...issueIdentity,
        started_at: '2026-05-19T00:00:00.000Z',
        updated_at: overrides.generated_at ?? new Date().toISOString(),
        completed_at: overrides.generated_at ?? new Date().toISOString()
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  await writeReviewArtifacts(
    {
      ...input,
      env: {
        ...execEnv,
        CODEX_ORCHESTRATOR_RUN_DIR: runDir
      }
    },
    {
      ...cleanGovernedReviewArtifactOverrides({
        contract_path: relative(repoRoot, contractPath),
        omitContractArtifact: true
      }),
      ...overrides
    }
  );
  await writeFile(
    contractPath,
    `${JSON.stringify(
      {
        schema_version: 'co.review.contract.v1',
        overall_verdict: 'clean',
        axes: {
          spec_conformance: { verdict: 'clean', clean_signal: 'test fixture', findings: [] },
          coding_standards: { verdict: 'clean', clean_signal: 'test fixture', findings: [] },
          code_changes: { verdict: 'clean', clean_signal: 'test fixture', findings: [] },
          agent_loop: { verdict: 'clean', clean_signal: 'test fixture', findings: [] }
        },
        code_change_proposals: [],
        agent_loop_proposals: []
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

async function writeReviewArtifacts(
  input: Record<string, unknown>,
  overrides: ReviewArtifactOverrides
): Promise<void> {
  const execEnv = (input.env ?? {}) as NodeJS.ProcessEnv;
  const repoRoot = String(execEnv.CODEX_ORCHESTRATOR_ROOT);
  const runDir = String(execEnv.CODEX_ORCHESTRATOR_RUN_DIR);
  const reviewDir = join(runDir, 'review');
  const outputLogPath = join(reviewDir, 'output.log');
  const {
    outputLogContent,
    omitContractArtifact,
    omitReviewOutcome,
    omitStatus,
    review_outcome: overriddenReviewOutcome,
    ...telemetryOverrides
  } = overrides;
  delete telemetryOverrides.status;
  await mkdir(reviewDir, { recursive: true });
  await writeFile(outputLogPath, outputLogContent ?? 'review output\n', 'utf8');
  if (omitContractArtifact !== true && typeof telemetryOverrides.contract_path === 'string') {
    await writeFile(
      join(runDir, telemetryOverrides.contract_path),
      `${JSON.stringify(
        {
          schema_version: 'co.review.contract.v1',
          overall_verdict: telemetryOverrides.contract_overall_verdict ?? 'clean',
          axes: {
            spec_conformance: { verdict: 'clean', clean_signal: 'test fixture', findings: [] },
            coding_standards: { verdict: 'clean', clean_signal: 'test fixture', findings: [] },
            code_changes: { verdict: 'clean', clean_signal: 'test fixture', findings: [] },
            agent_loop: { verdict: 'clean', clean_signal: 'test fixture', findings: [] }
          },
          code_change_proposals: [],
          agent_loop_proposals: []
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  }
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
        ...(omitStatus === true ? {} : { status }),
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
