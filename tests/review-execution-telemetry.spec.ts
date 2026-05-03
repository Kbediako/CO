import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReviewExecutionState } from '../scripts/lib/review-execution-state.js';
import {
  formatReviewOutcomeSummary,
  logReviewTelemetrySummary,
  writeReviewExecutionTelemetry
} from '../scripts/lib/review-execution-telemetry.js';

const createdSandboxes: string[] = [];
const THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE =
  'codex_core::session: failed to record rollout items: thread 019de1d2-3b27-7193-8330-0ed726e28044 not found';

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'review-execution-telemetry-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    createdSandboxes.splice(0).map((sandbox) => rm(sandbox, { recursive: true, force: true }))
  );
});

describe('review-execution-telemetry', () => {
  it('persists success telemetry built from the provided state helper', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = join(sandbox, 'review', 'output.log');
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
    await mkdir(join(sandbox, 'review'), { recursive: true });
    const state = new ReviewExecutionState({ repoRoot: sandbox });

    const payload = await writeReviewExecutionTelemetry({
      state,
      status: 'succeeded',
      outputLogPath,
      repoRoot: sandbox,
      telemetryPath,
      includeRawTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(payload).not.toBeNull();
    expect(payload?.status).toBe('succeeded');
    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.termination_boundary).toBeNull();
    await expect(readFile(telemetryPath, 'utf8')).resolves.toContain('"status": "succeeded"');
  });

  it('persists success telemetry with an explicit termination boundary when the review ended via bounded completion', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = join(sandbox, 'review', 'output.log');
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
    await mkdir(join(sandbox, 'review'), { recursive: true });
    const state = new ReviewExecutionState({ repoRoot: sandbox });
    const terminationBoundary = {
      kind: 'relevant-reinspection-dwell',
      provenance: 'post-startup-anchor',
      reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
      sample: 'sed -n 1,20p file-1.py'
    } as const;

    const payload = await writeReviewExecutionTelemetry({
      state,
      status: 'succeeded',
      terminationBoundary,
      outputLogPath,
      repoRoot: sandbox,
      telemetryPath,
      includeRawTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(payload?.review_outcome).toBe('bounded-success');
    expect(payload?.termination_boundary).toEqual({
      kind: 'relevant-reinspection-dwell',
      provenance: 'post-startup-anchor',
      reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
      sample:
        '[redacted relevant-reinspection-dwell sample; set CODEX_REVIEW_DEBUG_TELEMETRY=1 to persist raw sample]'
    });
    await expect(readFile(telemetryPath, 'utf8')).resolves.toContain(
      '"kind": "relevant-reinspection-dwell"'
    );
  });

  it('persists failure telemetry with an explicit termination boundary', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = join(sandbox, 'review', 'output.log');
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
    await mkdir(join(sandbox, 'review'), { recursive: true });
    const state = new ReviewExecutionState({ repoRoot: sandbox });
    const terminationBoundary = {
      kind: 'stall',
      provenance: 'output-stall',
      reason: 'review stalled',
      sample: null
    } as const;

    const payload = await writeReviewExecutionTelemetry({
      state,
      status: 'failed',
      error: 'review stalled',
      terminationBoundary,
      outputLogPath,
      repoRoot: sandbox,
      telemetryPath,
      includeRawTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(payload?.review_outcome).toBe('failed-boundary');
    expect(payload?.termination_boundary).toEqual(terminationBoundary);
    await expect(readFile(telemetryPath, 'utf8')).resolves.toContain('"kind": "stall"');
  });

  it('preserves omitted termination-boundary inference for failed telemetry', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = join(sandbox, 'review', 'output.log');
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
    await mkdir(join(sandbox, 'review'), { recursive: true });
    const state = new ReviewExecutionState({ repoRoot: sandbox });

    const payload = await writeReviewExecutionTelemetry({
      state,
      status: 'failed',
      error: 'codex review timed out after 30s',
      outputLogPath,
      repoRoot: sandbox,
      telemetryPath,
      includeRawTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(payload?.review_outcome).toBe('failed-boundary');
    expect(payload?.termination_boundary?.kind).toBe('timeout');
    await expect(readFile(telemetryPath, 'utf8')).resolves.toContain('"kind": "timeout"');
  });

  it('logs and suppresses persistence failures', async () => {
    const sandbox = await makeSandbox();
    const state = new ReviewExecutionState({ repoRoot: sandbox });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const payload = await writeReviewExecutionTelemetry({
      state,
      status: 'succeeded',
      outputLogPath: join(sandbox, 'review', 'output.log'),
      repoRoot: sandbox,
      telemetryPath: join(sandbox, 'missing', 'telemetry.json'),
      includeRawTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(payload).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[run-review] failed to persist review telemetry:')
    );
  });

  it('describes failed-other telemetry as an unclassified review-command failure', () => {
    expect(
      formatReviewOutcomeSummary({
        status: 'failed',
        review_outcome: 'failed-other',
        termination_boundary: null
      })
    ).toBe(
      'review command failed without termination-boundary classification; not an explicit wrapper-boundary failure'
    );
  });

  it('prints command-intent aggregate counts in telemetry summaries', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = join(sandbox, 'review', 'output.log');
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
    await mkdir(join(sandbox, 'review'), { recursive: true });
    const state = new ReviewExecutionState({ repoRoot: sandbox });
    state.observeChunk(
      Buffer.from(
        [
          'thinking',
          'exec',
          "/bin/zsh -lc 'npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts' in /Users/kbediako/Code/CO"
        ].join('\n') + '\n'
      ),
      'stdout'
    );
    const terminationBoundary = state.getTerminationBoundaryRecordForKind('command-intent', 1_000);

    const payload = await writeReviewExecutionTelemetry({
      state,
      status: 'failed',
      error: 'codex review crossed the bounded command-intent boundary (direct validation runner launch).',
      terminationBoundary,
      outputLogPath,
      repoRoot: sandbox,
      telemetryPath,
      includeRawTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logReviewTelemetrySummary(payload!, 'review/telemetry.json', {
      debugTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(errorSpy).toHaveBeenCalledWith(
      '[run-review] command-intent violations detected: 1 sample(s) across validation-runner.'
    );
  });

  it('ignores inconsistent explicit review outcomes and falls back to the status-plus-boundary contract', () => {
    expect(
      formatReviewOutcomeSummary({
        status: 'failed',
        review_outcome: 'clean-success',
        termination_boundary: null
      })
    ).toBe(
      'review command failed without termination-boundary classification; not an explicit wrapper-boundary failure'
    );
  });

  it('requires successful telemetry before thread-not-found rollout log noise is non-blocking', async () => {
    const sandbox = await makeSandbox();
    await mkdir(join(sandbox, 'review'), { recursive: true });

    const successCases = [
      {
        name: 'clean',
        terminationBoundary: null,
        expectedOutcome: 'clean-success',
        expectedSummary: 'clean success'
      },
      {
        name: 'bounded',
        terminationBoundary: {
          kind: 'relevant-reinspection-dwell',
          provenance: 'post-startup-anchor',
          reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
          sample: 'sed -n 1,20p file-1.py'
        } as const,
        expectedOutcome: 'bounded-success',
        expectedSummary:
          'bounded success via relevant-reinspection-dwell; not a wrapper failure'
      }
    ] as const;

    for (const successCase of successCases) {
      const state = new ReviewExecutionState({ repoRoot: sandbox });
      state.observeChunk(`${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`, 'stderr');

      const payload = await writeReviewExecutionTelemetry({
        state,
        status: 'succeeded',
        terminationBoundary: successCase.terminationBoundary,
        outputLogPath: join(sandbox, 'review', `${successCase.name}-output.log`),
        repoRoot: sandbox,
        telemetryPath: join(sandbox, 'review', `${successCase.name}-telemetry.json`),
        includeRawTelemetry: true,
        telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
      });

      expect(payload?.status).toBe('succeeded');
      expect(payload?.review_outcome).toBe(successCase.expectedOutcome);
      expect(payload?.error).toBeNull();
      expect(payload?.summary.lastLines).toContain(THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE);
      expect(formatReviewOutcomeSummary(payload!)).toBe(successCase.expectedSummary);
    }

    const failedState = new ReviewExecutionState({ repoRoot: sandbox });
    failedState.observeChunk(`${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`, 'stderr');
    const failedPayload = await writeReviewExecutionTelemetry({
      state: failedState,
      status: 'failed',
      error: 'codex review exited with code 2',
      outputLogPath: join(sandbox, 'review', 'failed-output.log'),
      repoRoot: sandbox,
      telemetryPath: join(sandbox, 'review', 'failed-telemetry.json'),
      includeRawTelemetry: true,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(failedPayload?.status).toBe('failed');
    expect(failedPayload?.review_outcome).toBe('failed-other');
    expect(failedPayload?.summary.lastLines).toContain(THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE);
    expect(formatReviewOutcomeSummary(failedPayload!)).toBe(
      'review command failed without termination-boundary classification; not an explicit wrapper-boundary failure'
    );

    const missingTelemetryState = new ReviewExecutionState({ repoRoot: sandbox });
    missingTelemetryState.observeChunk(`${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`, 'stderr');
    const missingTelemetryPayload = await writeReviewExecutionTelemetry({
      state: missingTelemetryState,
      status: 'succeeded',
      outputLogPath: join(sandbox, 'review', 'missing-output.log'),
      repoRoot: sandbox,
      telemetryPath: join(sandbox, 'missing', 'telemetry.json'),
      includeRawTelemetry: true,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
      logPersistFailure: () => {}
    });

    expect(missingTelemetryPayload).toBeNull();
  });
});
