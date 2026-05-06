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
const CO474_REVIEW_OUTPUT_FIXTURE = new URL(
  './fixtures/review-execution/co474-review-output-with-findings.log',
  import.meta.url
);

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'review-execution-telemetry-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

async function writeReviewOutput(sandbox: string, content: string): Promise<string> {
  const reviewDir = join(sandbox, 'review');
  await mkdir(reviewDir, { recursive: true });
  const outputLogPath = join(reviewDir, 'output.log');
  await writeFile(outputLogPath, content, 'utf8');
  return outputLogPath;
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
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
    expect(payload?.termination_boundary).toBeNull();
    await expect(readFile(telemetryPath, 'utf8')).resolves.toContain('"status": "succeeded"');
  });

  it('persists a clean semantic review verdict separately from wrapper execution state', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      'I found no actionable issues in the uncommitted diff.\n'
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('clean');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('recognizes no actionable correctness issues as a clean semantic review verdict', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      'Read-only inspection of the uncommitted diff found no actionable correctness issues.\n'
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('clean');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('recognizes no actionable correctness regressions as a clean semantic review verdict', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      'Read-only diff inspection found no actionable correctness regressions in the changed telemetry parser.\n'
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('clean');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('recognizes short no-actionable verdicts as clean semantic review verdicts', async () => {
    const cleanVerdicts = [
      'No actionable issues.',
      'No actionable correctness regressions.'
    ];

    for (const cleanVerdict of cleanVerdicts) {
      const sandbox = await makeSandbox();
      const outputLogPath = await writeReviewOutput(sandbox, `${cleanVerdict}\n`);
      const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

      expect(payload?.review_outcome).toBe('clean-success');
      expect(payload?.review_verdict).toBe('clean');
      expect(payload?.highest_finding_priority).toBeNull();
      expect(payload?.finding_count).toBe(0);
    }
  });

  it('derives findings only from the final reviewer verdict, not inspected transcript lines', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'user',
        'Review this fixture.',
        'exec',
        '/bin/zsh -lc "sed -n 1,20p tests/fixtures/review-execution/co474-review-output-with-findings.log"',
        ' succeeded in 0ms:',
        '- [P1] Fixture content should not become the reviewer verdict',
        '- [P2] Another inspected fixture finding',
        '',
        '2026-05-06T07:49:22.913222Z  WARN codex_core::session::turn: after_agent hook failed; continuing',
        'codex',
        'I found no actionable issues.',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('clean');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('does not treat a codex marker inside inspected command output as the final verdict', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'user',
        'current changes',
        'exec',
        '/bin/zsh -lc "cat nested-review.log"',
        ' succeeded in 0ms:',
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'codex',
        'I found no actionable issues.',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('does not treat output.log read from the review cwd as the final verdict', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'user',
        'current changes',
        'exec',
        '/bin/zsh -lc "cat output.log" in /tmp/review',
        ' succeeded in 0ms:',
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'codex',
        '- [P1] Inspected nested finding should not become the current verdict',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('does not promote later nested codex markers from inspected transcript output', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'user',
        'current changes',
        'exec',
        '/bin/zsh -lc "cat review/output.log"',
        ' succeeded in 0ms:',
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'codex',
        'I found no actionable issues.',
        '',
        'user',
        'Please check this follow-up.',
        'codex',
        '- [P2] Nested prior review finding should not become the current verdict',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('keeps the final reviewer verdict after markerless inspected output-log content', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'user',
        'current changes',
        'exec',
        '/bin/zsh -lc "cat review/output.log"',
        ' succeeded in 0ms:',
        'Review output saved to: .runs/task/review/output.log',
        '2026-05-06T08:45:00.000000Z  WARN codex_core::session::turn: inspected output warning',
        '[run-review] review telemetry saved to: .runs/task/review/telemetry.json',
        '',
        'codex',
        '- [P2] Final reviewer finding after markerless inspection is actionable',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('findings');
    expect(payload?.highest_finding_priority).toBe('P2');
    expect(payload?.finding_count).toBe(1);
  });

  it('keeps the final reviewer verdict after inspected transcript command output', async () => {
    const commandLines = [
      '/bin/zsh -lc "cd review && cat output.log"',
      '/bin/zsh -lc "cat \\"$REVIEW_OUTPUT_LOG\\""',
      '/bin/zsh -lc "cat output.log" in /tmp/review'
    ];

    for (const commandLine of commandLines) {
      const sandbox = await makeSandbox();
      const outputLogPath = await writeReviewOutput(
        sandbox,
        [
          'OpenAI Codex v0.128.0 (research preview)',
          '--------',
          'user',
          'current changes',
          'exec',
          commandLine,
          ' succeeded in 0ms:',
          'OpenAI Codex v0.128.0 (research preview)',
          '--------',
          'codex',
          '- [P1] Inspected nested finding should not hide the final clean verdict',
          '',
          'codex',
          'I found no actionable issues.',
          ''
        ].join('\n')
      );
      const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

      expect(payload?.review_outcome).toBe('clean-success');
      expect(payload?.review_verdict).toBe('clean');
      expect(payload?.highest_finding_priority).toBeNull();
      expect(payload?.finding_count).toBe(0);
    }
  });

  it('does not treat an older nested review-runtime marker as the final verdict', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        '2026-05-06T08:30:00.000000Z  WARN codex_core_plugins::manifest: current review warning before inspection',
        'user',
        'current changes',
        'exec',
        '/bin/zsh -lc "cat review/output.log"',
        ' succeeded in 0ms:',
        '[run-review] waiting on codex review (6m 30s elapsed, 1m 33s idle; review progress observed).',
        '2026-05-06T08:10:00.000000Z  WARN codex_core::session::turn: nested prior review warning',
        'codex',
        'I found no actionable issues.',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('does not treat a nested marker after contiguous run-review output as the final verdict', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'user',
        'current changes',
        'exec',
        '/bin/zsh -lc "cat review/output.log"',
        ' succeeded in 0ms:',
        '[run-review] waiting on codex review (6m 30s elapsed, 1m 33s idle; review progress observed).',
        'codex',
        '- [P2] Nested run-review output finding should not become current verdict',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('does not promote newer nested review-log markers by timestamp recency alone', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        '2026-05-06T08:30:00.000000Z  WARN codex_core_plugins::manifest: current review warning before inspection',
        'user',
        'current changes',
        'exec',
        '/bin/zsh -lc "tail -n 40 ../../.runs/task/review/output.log"',
        ' succeeded in 0ms:',
        '[run-review] waiting on codex review (6m 30s elapsed, 1m 33s idle; review progress observed).',
        '2026-05-06T08:45:00.000000Z  WARN codex_core::session::turn: nested future review warning',
        'codex',
        'I found no actionable issues.',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('does not treat inline inspected command output as the final verdict', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'user',
        'current changes',
        'exec',
        '/bin/zsh -lc "cat review/output.log" in /tmp/repo succeeded in 12ms:',
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'codex',
        '- [P1] Inline inspected finding should not become current verdict',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('keeps the final reviewer verdict after inline inspected command output', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'user',
        'current changes',
        'exec',
        '/bin/zsh -lc "cat review/output.log" in /tmp/repo succeeded in 12ms:',
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'codex',
        '- [P1] Inline inspected finding should not hide current clean verdict',
        '',
        'codex',
        'I found no actionable issues.',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('clean');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('keeps a source-inspection marker as the final verdict boundary without a runtime separator', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'user',
        'current changes',
        'exec',
        '/bin/zsh -lc "sed -n 1,20p scripts/lib/review-execution-telemetry.ts"',
        ' succeeded in 0ms:',
        'export function analyzeReviewOutput() {',
        '  return null;',
        '}',
        'codex',
        'I found no actionable issues.',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('clean');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('does not scan inspected transcript lines when the final reviewer marker is empty', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'exec',
        '/bin/zsh -lc "sed -n 1,20p tests/fixtures/review-execution/co474-review-output-with-findings.log"',
        ' succeeded in 0ms:',
        '- [P1] Inspected fixture finding should not become the reviewer verdict',
        '- [P2] Another inspected fixture finding',
        '',
        'codex',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('does not scan inspected transcript lines when the final reviewer marker is missing', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'OpenAI Codex v0.128.0 (research preview)',
        '--------',
        'user',
        'current changes',
        'exec',
        '/bin/zsh -lc "cat tests/fixtures/review-execution/co474-review-output-with-findings.log"',
        ' succeeded in 0ms:',
        '- [P1] Inspected fixture finding should not become the reviewer verdict',
        '- [P2] Another inspected fixture finding',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it('persists findings from successful CO-474-style raw review output without changing clean-success wrapper state', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      await readFile(CO474_REVIEW_OUTPUT_FIXTURE, 'utf8')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.status).toBe('succeeded');
    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.termination_boundary).toBeNull();
    expect(payload?.review_verdict).toBe('findings');
    expect(payload?.highest_finding_priority).toBe('P1');
    expect(payload?.finding_count).toBe(2);
  });

  it('persists findings from structured JSON reviewer verdict titles', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'exec',
        '/bin/zsh -lc "rg P1 tests"',
        ' succeeded in 0ms:',
        '- [P1] Inspected command output should be ignored once JSON verdict is present',
        '',
        '2026-05-06T07:49:22.913222Z  WARN codex_core::session::turn: after_agent hook failed; continuing',
        'codex',
        JSON.stringify(
          {
            findings: [
              {
                title: '[P2] Structured title finding is actionable',
                body: 'The review wrapper must parse JSON title priorities.',
                priority: 2
              },
              {
                title: '[P1] Structured higher priority finding is actionable',
                body: 'The provider-worker gate must fail on the semantic verdict.',
                priority: 1
              }
            ],
            overall_correctness: 'patch is incorrect',
            overall_explanation: 'Findings are present.',
            overall_confidence_score: 0.72
          },
          null,
          2
        ),
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('findings');
    expect(payload?.highest_finding_priority).toBe('P1');
    expect(payload?.finding_count).toBe(2);
  });

  it('deduplicates repeated finding blocks when deriving the semantic verdict', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      [
        'Findings:',
        '- [P2] Review telemetry summary drops actionable findings',
        'Findings:',
        '- [P2] Review telemetry summary drops actionable findings',
        ''
      ].join('\n')
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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

    expect(payload?.review_verdict).toBe('findings');
    expect(payload?.highest_finding_priority).toBe('P2');
    expect(payload?.finding_count).toBe(1);
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
    expect(payload?.review_verdict).toBe('unknown');
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

  it('persists findings when bounded success preserves a termination boundary', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      '- [P2] Bounded review still found a handoff blocker\n'
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
    const state = new ReviewExecutionState({ repoRoot: sandbox });
    const terminationBoundary = {
      kind: 'relevant-reinspection-dwell',
      provenance: 'post-startup-anchor',
      reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
      sample: null
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
    expect(payload?.termination_boundary?.kind).toBe('relevant-reinspection-dwell');
    expect(payload?.review_verdict).toBe('findings');
    expect(payload?.highest_finding_priority).toBe('P2');
    expect(payload?.finding_count).toBe(1);
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
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.termination_boundary).toEqual(terminationBoundary);
    await expect(readFile(telemetryPath, 'utf8')).resolves.toContain('"kind": "stall"');
  });

  it('keeps failed-boundary wrapper semantics while surfacing semantic findings', async () => {
    const sandbox = await makeSandbox();
    const outputLogPath = await writeReviewOutput(
      sandbox,
      '- [P3] Failed review output still carried a low-priority finding\n'
    );
    const telemetryPath = join(sandbox, 'review', 'telemetry.json');
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
    expect(payload?.review_verdict).toBe('findings');
    expect(payload?.highest_finding_priority).toBe('P3');
    expect(payload?.finding_count).toBe(1);
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
