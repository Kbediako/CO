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
});
