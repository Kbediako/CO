import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
const CO474_REVIEW_OUTPUT_FIXTURE = new URL('./fixtures/review-execution/co474-review-output-with-findings.log', import.meta.url);

type WriteTelemetryOptions = Parameters<typeof writeReviewExecutionTelemetry>[0];
type TelemetryFixtureOptions = Partial<Pick<WriteTelemetryOptions, 'status' | 'terminationBoundary' | 'error' | 'includeRawTelemetry' | 'logPersistFailure'>> & {
  outputName?: string; state?: ReviewExecutionState; telemetryName?: string;
};

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'review-execution-telemetry-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

async function writeTelemetryForOutput(sandbox: string, outputText: string, options: TelemetryFixtureOptions = {}) {
  const reviewDir = join(sandbox, 'review');
  await mkdir(reviewDir, { recursive: true });
  const outputLogPath = join(reviewDir, options.outputName ?? 'output.log');
  await writeFile(outputLogPath, outputText, 'utf8');
  const telemetryOptions: WriteTelemetryOptions = {
    state: options.state ?? new ReviewExecutionState({ repoRoot: sandbox }),
    status: options.status ?? 'succeeded',
    error: options.error,
    outputLogPath,
    repoRoot: sandbox,
    telemetryPath: join(reviewDir, options.telemetryName ?? 'telemetry.json'),
    includeRawTelemetry: options.includeRawTelemetry ?? false,
    telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
    logPersistFailure: options.logPersistFailure
  };
  if (Object.prototype.hasOwnProperty.call(options, 'terminationBoundary')) {
    telemetryOptions.terminationBoundary = options.terminationBoundary;
  }
  return writeReviewExecutionTelemetry(telemetryOptions);
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
    const payload = await writeTelemetryForOutput(sandbox, '');

    expect(payload).not.toBeNull();
    expect(payload?.status).toBe('succeeded');
    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
    expect(payload?.termination_boundary).toBeNull();
    await expect(readFile(join(sandbox, 'review', 'telemetry.json'), 'utf8')).resolves.toContain('"status": "succeeded"');
  });

  it('persists clean semantic review verdicts separately from wrapper execution state', async () => {
    const cleanOutputs = ['I found no actionable issues in the uncommitted diff.', 'Read-only inspection of the uncommitted diff found no actionable correctness issues.', 'Read-only diff inspection found no actionable correctness regressions in the changed telemetry parser.', 'No actionable issues.', 'No actionable correctness regressions.', 'I did not identify a discrete regression.', 'I did not find a concrete regression in the changed telemetry parser.', 'The diff stays focused. I did not find a concrete regression in the changed area or an introduced mismatch.', JSON.stringify({ review_verdict: 'clean', highest_finding_priority: null, finding_count: 0 })];

    for (const cleanOutput of cleanOutputs) {
      const sandbox = await makeSandbox();
      const payload = await writeTelemetryForOutput(sandbox, `${cleanOutput}\n`);

      expect(payload?.review_outcome).toBe('clean-success');
      expect(payload?.review_verdict).toBe('clean');
      expect(payload?.highest_finding_priority).toBeNull();
      expect(payload?.finding_count).toBe(0);
    }
  });

  it('derives semantic verdicts from final reviewer output, not inspected transcripts', async () => {
    const cases = [
      {
        name: 'ignores inspected fixture findings when the final verdict is clean',
        output: [
          'user',
          'Review this fixture.',
          'exec',
          '/bin/zsh -lc "sed -n 1,20p tests/fixtures/review-execution/co474-review-output-with-findings.log"',
          ' succeeded in 0ms:',
          '- [P1] Fixture content should not become the reviewer verdict',
          '- [P2] Another inspected fixture finding',
          '',
          'codex',
          'I found no actionable issues.'
        ].join('\n'),
        expectedVerdict: 'clean'
      },
      {
        name: 'does not promote newer nested markers by timestamp recency alone',
        output: [
          'OpenAI Codex v0.128.0 (research preview)',
          '--------',
          '2026-05-06T08:30:00.000000Z  WARN codex_core_plugins::manifest: current warning',
          'user',
          'current changes',
          'exec',
          '/bin/zsh -lc "tail -n 40 ../../.runs/task/review/output.log"',
          ' succeeded in 0ms:',
          '[run-review] waiting on codex review (6m 30s elapsed, 1m 33s idle).',
          '2026-05-06T08:45:00.000000Z  WARN codex_core::session::turn: nested future warning',
          'codex',
          'I found no actionable issues.'
        ].join('\n'),
        expectedVerdict: 'unknown'
      },
      {
        name: 'does not promote inspected transcript verdicts after blank separators',
        output: 'exec\n/bin/zsh -lc "tail -n 80 review/output.log"\n succeeded in 0ms:\ncodex\nNested clean verdict.\n\ncodex\n- [P2] Inspected transcript finding should not become the current verdict',
        expectedVerdict: 'unknown'
      },
      {
        name: 'keeps source-inspection markers as final verdict boundaries',
        output: [
          'OpenAI Codex v0.128.0 (research preview)',
          '--------',
          'user',
          'current changes',
          'exec',
          '/bin/zsh -lc "sed -n 1,20p scripts/lib/review-execution-telemetry.ts"',
          ' succeeded in 0ms:',
          'const promptRole = "user";',
          'const runtimeName = "OpenAI Codex v0.128.0";',
          'codex',
          'export function analyzeReviewOutput() {',
          '  return null;',
          '}',
          'codex',
          'I found no actionable issues.'
        ].join('\n'),
        expectedVerdict: 'clean'
      }
    ] as const;

    for (const testCase of cases) {
      const sandbox = await makeSandbox();
      const payload = await writeTelemetryForOutput(sandbox, `${testCase.output}\n`);

      expect(payload?.review_outcome, testCase.name).toBe('clean-success');
      expect(payload?.review_verdict, testCase.name).toBe(testCase.expectedVerdict);
      expect(payload?.highest_finding_priority, testCase.name).toBeNull();
      expect(payload?.finding_count, testCase.name).toBe(0);
    }
  });

  it('persists semantic findings without migrating wrapper outcome semantics', async () => {
    const boundedTermination = { kind: 'relevant-reinspection-dwell', provenance: 'post-startup-anchor', reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.', sample: null } as const;
    const failedBoundary = { kind: 'stall', provenance: 'output-stall', reason: 'review stalled', sample: null } as const;
    const cases = [
      {
        name: 'CO-474 successful raw output',
        output: await readFile(CO474_REVIEW_OUTPUT_FIXTURE, 'utf8'),
        expectedOutcome: 'clean-success',
        expectedPriority: 'P1',
        expectedCount: 2
      },
      {
        name: 'structured JSON verdict titles',
        output: [
          'exec',
          '/bin/zsh -lc "rg P1 tests"',
          ' succeeded in 0ms:',
          '- [P1] Inspected command output should be ignored once JSON verdict is present',
          '',
          'codex',
          JSON.stringify({
            findings: [
              { title: '[P2] Structured title finding is actionable', priority: 2 },
              { title: '[P1] Structured higher priority finding is actionable', priority: 1 }
            ],
            overall_correctness: 'patch is incorrect'
          })
        ].join('\n'),
        expectedOutcome: 'clean-success',
        expectedPriority: 'P1',
        expectedCount: 2
      },
      { name: 'summary-shaped structured JSON verdict', output: JSON.stringify({ review_verdict: 'findings', highest_finding_priority: 'P2', finding_count: 2 }), expectedOutcome: 'clean-success', expectedPriority: 'P2', expectedCount: 2 },
      {
        name: 'structured findings dominate clean summary verdict',
        output: JSON.stringify({
          review_verdict: 'clean',
          highest_finding_priority: null,
          finding_count: 0,
          findings: [
            {
              title: '[P1] Summary verdict must not hide an actionable finding',
              body: 'The structured findings array is the authoritative actionable signal.',
              priority: 1
            }
          ]
        }),
        expectedOutcome: 'clean-success',
        expectedPriority: 'P1',
        expectedCount: 1
      },
      {
        name: 'markerless structured JSON verdict after runtime noise',
        output: [
          '2026-05-06T07:49:22.913222Z  WARN codex_core::session::turn: after_agent hook failed; continuing',
          JSON.stringify({
            findings: [
              {
                title: '[P1] Markerless JSON finding remains actionable',
                body: 'The parser should skip runtime noise before the final JSON verdict.',
                priority: 1
              }
            ],
            overall_correctness: 'patch is incorrect'
          })
        ].join('\n'),
        expectedOutcome: 'clean-success',
        expectedPriority: 'P1',
        expectedCount: 1
      },
      {
        name: 'duplicated finding blocks',
        output: 'Findings:\n- [P2] Review telemetry summary drops actionable findings\nFindings:\n- [P2] Review telemetry summary drops actionable findings',
        expectedOutcome: 'clean-success',
        expectedPriority: 'P2',
        expectedCount: 1
      },
      {
        name: 'bounded success with unknown verdict after inspected transcript findings',
        output: 'exec\n/bin/zsh -lc "tail -n 80 review/output.log"\n succeeded in 0ms:\ncodex\nNested clean verdict.\n\ncodex\n- [P2] Bounded review still found a handoff blocker',
        terminationBoundary: boundedTermination,
        expectedOutcome: 'bounded-success',
        expectedVerdict: 'unknown',
        expectedPriority: null,
        expectedCount: 0
      },
      {
        name: 'failed-boundary with findings',
        output: '- [P3] Failed review output still carried a low-priority finding\n',
        status: 'failed' as const,
        error: 'review stalled',
        terminationBoundary: failedBoundary,
        expectedOutcome: 'failed-boundary',
        expectedPriority: 'P3',
        expectedCount: 1
      }
    ] as const;

    for (const testCase of cases) {
      const sandbox = await makeSandbox();
      const payload = await writeTelemetryForOutput(sandbox, testCase.output, {
        status: testCase.status,
        error: testCase.error,
        terminationBoundary: testCase.terminationBoundary
      });

      expect(payload?.review_outcome, testCase.name).toBe(testCase.expectedOutcome);
      expect(payload?.review_verdict, testCase.name).toBe(testCase.expectedVerdict ?? 'findings');
      expect(payload?.highest_finding_priority, testCase.name).toBe(testCase.expectedPriority);
      expect(payload?.finding_count, testCase.name).toBe(testCase.expectedCount);
    }
  });

  it('persists success telemetry with an explicit termination boundary when the review ended via bounded completion', async () => {
    const sandbox = await makeSandbox();
    const terminationBoundary = {
      kind: 'relevant-reinspection-dwell',
      provenance: 'post-startup-anchor',
      reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
      sample: 'sed -n 1,20p file-1.py'
    } as const;
    const payload = await writeTelemetryForOutput(sandbox, '', { terminationBoundary });

    expect(payload?.review_outcome).toBe('bounded-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.termination_boundary).toEqual({
      kind: 'relevant-reinspection-dwell',
      provenance: 'post-startup-anchor',
      reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
      sample:
        '[redacted relevant-reinspection-dwell sample; set CODEX_REVIEW_DEBUG_TELEMETRY=1 to persist raw sample]'
    });
    await expect(readFile(join(sandbox, 'review', 'telemetry.json'), 'utf8')).resolves.toContain('"kind": "relevant-reinspection-dwell"');
  });

  it('persists failure telemetry with an explicit termination boundary', async () => {
    const sandbox = await makeSandbox();
    const terminationBoundary = {
      kind: 'stall',
      provenance: 'output-stall',
      reason: 'review stalled',
      sample: null
    } as const;
    const payload = await writeTelemetryForOutput(sandbox, '', {
      status: 'failed',
      error: 'review stalled',
      terminationBoundary
    });

    expect(payload?.review_outcome).toBe('failed-boundary');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.termination_boundary).toEqual(terminationBoundary);
    await expect(readFile(join(sandbox, 'review', 'telemetry.json'), 'utf8')).resolves.toContain('"kind": "stall"');
  });

  it('preserves omitted termination-boundary inference for failed telemetry', async () => {
    const sandbox = await makeSandbox();
    const payload = await writeTelemetryForOutput(sandbox, '', {
      status: 'failed',
      error: 'codex review timed out after 30s'
    });

    expect(payload?.review_outcome).toBe('failed-boundary');
    expect(payload?.termination_boundary?.kind).toBe('timeout');
    await expect(readFile(join(sandbox, 'review', 'telemetry.json'), 'utf8')).resolves.toContain('"kind": "timeout"');
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

  it('surfaces unknown semantic review verdicts in generic outcome summaries', () => {
    expect(
      formatReviewOutcomeSummary({
        status: 'succeeded',
        review_outcome: 'clean-success',
        termination_boundary: null,
        review_verdict: 'unknown',
        highest_finding_priority: null,
        finding_count: 0
      })
    ).toBe('clean success; semantic review verdict: unknown');
  });

  it('prints command-intent aggregate counts in telemetry summaries', async () => {
    const sandbox = await makeSandbox();
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
    const payload = await writeTelemetryForOutput(sandbox, '', {
      status: 'failed',
      error: 'codex review crossed the bounded command-intent boundary (direct validation runner launch).',
      terminationBoundary,
      state
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
    const successCases = [
      {
        name: 'clean',
        terminationBoundary: null,
        expectedOutcome: 'clean-success',
        expectedSummary: 'clean success; semantic review verdict: unknown'
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
          'bounded success via relevant-reinspection-dwell; not a wrapper failure; semantic review verdict: unknown'
      }
    ] as const;

    for (const successCase of successCases) {
      const state = new ReviewExecutionState({ repoRoot: sandbox });
      state.observeChunk(`${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`, 'stderr');
      const payload = await writeTelemetryForOutput(sandbox, '', {
        state,
        terminationBoundary: successCase.terminationBoundary,
        includeRawTelemetry: true,
        outputName: `${successCase.name}-output.log`,
        telemetryName: `${successCase.name}-telemetry.json`
      });

      expect(payload?.status).toBe('succeeded');
      expect(payload?.review_outcome).toBe(successCase.expectedOutcome);
      expect(payload?.error).toBeNull();
      expect(payload?.summary.lastLines).toContain(THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE);
      expect(formatReviewOutcomeSummary(payload!)).toBe(successCase.expectedSummary);
    }

    const failedState = new ReviewExecutionState({ repoRoot: sandbox });
    failedState.observeChunk(`${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`, 'stderr');
    const failedPayload = await writeTelemetryForOutput(sandbox, '', {
      state: failedState,
      status: 'failed',
      error: 'codex review exited with code 2',
      includeRawTelemetry: true,
      outputName: 'failed-output.log',
      telemetryName: 'failed-telemetry.json'
    });

    expect(failedPayload?.status).toBe('failed');
    expect(failedPayload?.review_outcome).toBe('failed-other');
    expect(failedPayload?.summary.lastLines).toContain(THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE);
    expect(formatReviewOutcomeSummary(failedPayload!)).toBe(
      'review command failed without termination-boundary classification; not an explicit wrapper-boundary failure; semantic review verdict: unknown'
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
