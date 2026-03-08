import { describe, expect, it } from 'vitest';

import { ReviewExecutionState } from '../scripts/lib/review-execution-state.js';

describe('ReviewExecutionState', () => {
  it('derives task progress from a single live state owner without command drift', () => {
    const state = new ReviewExecutionState({ startedAtMs: 0 });

    state.observeChunk('thinking\ncodex\nthinking\n', 'stdout', 1_000);

    const snapshot = state.snapshot(5_000);
    expect(snapshot.reviewProgressObserved).toBe(true);
    expect(snapshot.summary.commandStarts).toEqual([]);
    expect(snapshot.summary.heavyCommandStarts).toEqual([]);
    expect(state.formatCheckpoint(5_000)).toContain('review progress observed');
  });

  it('tracks same-stream fragmented startup lines and keeps cross-stream fragments separate', () => {
    const state = new ReviewExecutionState({ startedAtMs: 0 });

    state.observeChunk('mcp: delegation star', 'stdout', 10);
    state.observeChunk('ting\nmcp: delegation rea', 'stdout', 20);
    state.observeChunk('dy\n', 'stdout', 30);
    expect(state.getStartupLoopState()).toEqual({
      startupEvents: 2,
      reviewProgressObserved: false
    });

    const crossStreamState = new ReviewExecutionState({ startedAtMs: 0 });
    crossStreamState.observeChunk('mcp: delegation star', 'stdout', 10);
    crossStreamState.observeChunk('ting\n', 'stderr', 20);
    expect(crossStreamState.getStartupLoopState()).toEqual({
      startupEvents: 0,
      reviewProgressObserved: false
    });
  });

  it('captures cross-stream commands after exec and clears pending command mode on progress lines', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: true
    });

    state.observeChunk('exec\n', 'stdout', 10);
    state.observeChunk("/bin/zsh -lc 'npm run test'\n", 'stderr', 20);
    expect(state.buildOutputSummary().commandStarts).toHaveLength(1);
    expect(state.buildOutputSummary().heavyCommandStarts).toHaveLength(1);
    expect(state.getBlockedHeavyCommand()).toContain('npm run test');

    const resetState = new ReviewExecutionState({ startedAtMs: 0 });
    resetState.observeChunk('exec\n', 'stdout', 10);
    resetState.observeChunk('thinking\n', 'stdout', 20);
    resetState.observeChunk('warning: not a command\n', 'stdout', 30);
    expect(resetState.snapshot(30).awaitingCommandLine).toBe(false);
    expect(resetState.buildOutputSummary().commandStarts).toEqual([]);
  });

  it('persists redacted and raw telemetry from the same live snapshot', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: true
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 10);
    state.observeChunk("/bin/zsh -lc 'npm run test'\n", 'stdout', 20);

    const redacted = state.buildTelemetryPayload({
      status: 'failed',
      error: 'review failed loudly',
      outputLogPath: '/repo/.runs/sample/review/output.log',
      repoRoot: '/repo',
      includeRawTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });
    expect(redacted.output_log_path).toBe('.runs/sample/review/output.log');
    expect(redacted.error).toContain('[redacted error');
    expect(redacted.summary.commandStarts[0]).toContain('[redacted command');
    expect(redacted.summary.heavyCommandStarts[0]).toContain('[redacted heavy-command');

    const raw = state.buildTelemetryPayload({
      status: 'failed',
      error: 'review failed loudly',
      outputLogPath: '/repo/.runs/sample/review/output.log',
      repoRoot: '/repo',
      includeRawTelemetry: true,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });
    expect(raw.error).toBe('review failed loudly');
    expect(raw.summary.commandStarts[0]).toContain('/bin/zsh -lc');
    expect(raw.summary.heavyCommandStarts[0]).toContain('npm run test');
  });

  it('classifies bounded low-signal drift from repeated inspection targets', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: true,
      lowSignalTimeoutMs: 1_000
    });

    for (let index = 0; index < 4; index += 1) {
      state.observeChunk('thinking\nexec\n', 'stdout', 100 + index * 100);
      state.observeChunk("/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'\n", 'stdout', 110 + index * 100);
      state.observeChunk('thinking\nexec\n', 'stdout', 120 + index * 100);
      state.observeChunk("/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts'\n", 'stdout', 130 + index * 100);
      state.observeChunk('thinking\nexec\n', 'stdout', 140 + index * 100);
      state.observeChunk(
        "/bin/zsh -lc 'sed -n 1,120p tasks/tasks-1059-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard.md'\n",
        'stdout',
        150 + index * 100
      );
    }

    const drift = state.getLowSignalDriftState(2_000);
    expect(drift.triggered).toBe(true);
    expect(drift.reason).toContain('low-signal review drift detected');
    expect(drift.distinctInspectionTargets).toBeLessThanOrEqual(4);
    expect(drift.maxInspectionTargetHits).toBeGreaterThanOrEqual(3);
  });

  it('classifies nearby drift from the recent inspection window even after broader exploration', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      lowSignalTimeoutMs: 1_000
    });

    const broadTargets = [
      'scripts/run-review.ts',
      'scripts/lib/review-execution-state.ts',
      'tasks/tasks-1059-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard.md',
      'docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard.md',
      'docs/PRD-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard.md'
    ];
    let nowMs = 100;
    for (const target of broadTargets) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk(`/bin/zsh -lc 'sed -n 1,120p ${target}'\n`, 'stdout', nowMs + 10);
      nowMs += 100;
    }

    for (let index = 0; index < 10; index += 1) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk("/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'\n", 'stdout', nowMs + 10);
      nowMs += 100;
    }

    const drift = state.getLowSignalDriftState(2_500);
    expect(drift.triggered).toBe(true);
    expect(drift.distinctInspectionTargets).toBeLessThanOrEqual(4);
    expect(drift.maxInspectionTargetHits).toBeGreaterThanOrEqual(3);
  });

  it('tracks the recent inspection window by command sample, not raw target count', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      lowSignalTimeoutMs: 1_000
    });

    let nowMs = 100;
    for (let index = 0; index < 10; index += 1) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk(
        `/bin/zsh -lc 'git diff -- scripts/run-review.ts scripts/lib/review-execution-state.ts docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard.md batch-${index}.md'\n`,
        'stdout',
        nowMs + 10
      );
      nowMs += 100;
    }

    const drift = state.getLowSignalDriftState(2_000);
    expect(drift.triggered).toBe(false);
    expect(drift.distinctInspectionTargets).toBeGreaterThan(4);
  });

  it('does not classify focused recent review when inspection signatures keep changing', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      lowSignalTimeoutMs: 1_000
    });

    const commands = [
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts scripts/lib/review-execution-state.ts'",
      "/bin/zsh -lc 'rg -n low-signal scripts/run-review.ts scripts/lib/review-execution-state.ts'",
      "/bin/zsh -lc 'git diff -- scripts/run-review.ts scripts/lib/review-execution-state.ts'",
      "/bin/zsh -lc 'nl -ba scripts/run-review.ts scripts/lib/review-execution-state.ts'"
    ];
    for (let index = 0; index < 12; index += 1) {
      state.observeChunk('thinking\nexec\n', 'stdout', 100 + index * 100);
      state.observeChunk(`${commands[index % commands.length]}\n`, 'stdout', 110 + index * 100);
    }

    const drift = state.getLowSignalDriftState(2_000);
    expect(drift.triggered).toBe(false);
    expect(drift.distinctInspectionTargets).toBeLessThanOrEqual(4);
    expect(drift.distinctInspectionSignatures).toBeGreaterThan(1);
  });

  it('does not classify same-file review when the inspection signature keeps moving forward', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      lowSignalTimeoutMs: 1_000
    });

    let nowMs = 100;
    for (let index = 0; index < 10; index += 1) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      const start = 1 + index * 120;
      const end = start + 119;
      state.observeChunk(
        `/bin/zsh -lc 'sed -n ${start},${end}p scripts/run-review.ts'\n`,
        'stdout',
        nowMs + 10
      );
      nowMs += 100;
    }

    expect(state.getLowSignalDriftState(2_000).triggered).toBe(false);
  });

  it('requires the drift shape to persist for the timeout window', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      lowSignalTimeoutMs: 1_000
    });

    let nowMs = 100;
    for (const target of ['a.md', 'b.md', 'c.md', 'd.md', 'e.md', 'f.md']) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk(`/bin/zsh -lc 'sed -n 1,20p ${target}'\n`, 'stdout', nowMs + 10);
      nowMs += 250;
    }
    for (let index = 0; index < 10; index += 1) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk("/bin/zsh -lc 'sed -n 1,20p scripts/run-review.ts'\n", 'stdout', nowMs + 10);
      nowMs += 50;
    }

    expect(state.getLowSignalDriftState(nowMs).triggered).toBe(false);
  });

  it('does not classify low-signal drift when the guard is disabled', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      lowSignalTimeoutMs: null
    });

    for (let index = 0; index < 12; index += 1) {
      state.observeChunk('thinking\nexec\n', 'stdout', 100 + index * 100);
      state.observeChunk("/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'\n", 'stdout', 110 + index * 100);
    }

    expect(state.getLowSignalDriftState(2_000).triggered).toBe(false);
  });
});
