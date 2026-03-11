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

  it('does not treat shell-wrapped touched-file reads as shell probes', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk("/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'\n", 'stdout', 110);

    const boundary = state.getShellProbeBoundaryState(2_000);
    expect(boundary.triggered).toBe(false);
    expect(boundary.probeCount).toBe(0);
  });

  it('allows one direct shell probe but flags a repeated shell probe', () => {
    const state = new ReviewExecutionState({ startedAtMs: 0 });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/bash -lc 'MANIFEST=/tmp/other.json; export MANIFEST; printf "%s\\n" "$MANIFEST"'\n`,
      'stdout',
      110
    );
    expect(state.getShellProbeBoundaryState(120).triggered).toBe(false);
    expect(state.getShellProbeBoundaryState(120).probeCount).toBe(1);

    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'MANIFEST=/tmp/third.json; export MANIFEST; printf "%s\\n" "$MANIFEST"'\n`,
      'stdout',
      210
    );

    const boundary = state.getShellProbeBoundaryState(2_000);
    expect(boundary.triggered).toBe(true);
    expect(boundary.reason).toContain('shell-probe boundary violated');
    expect(boundary.probeCount).toBe(2);
    expect(boundary.violationSample).toContain('/bin/zsh -lc');
  });

  it('counts mixed probe plus touched-file reads as shell probes', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'printf "%s\\n" "$MANIFEST"; sed -n 1,120p scripts/run-review.ts'\n`,
      'stdout',
      110
    );

    const boundary = state.getShellProbeBoundaryState(2_000);
    expect(boundary.triggered).toBe(false);
    expect(boundary.probeCount).toBe(1);
  });

  it('does not treat active audit startup-anchor reads as shell probes', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/repo',
      auditStartupAnchorPaths: ['/repo/.runs/sample-task/cli/sample-run/manifest.json'],
      allowedMetaSurfaceEnvVars: ['MANIFEST'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/repo/.runs/sample-task/cli/sample-run/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'export MANIFEST=$MANIFEST; sed -n 1,80p "$MANIFEST"'\n`,
      'stdout',
      110
    );

    expect(state.getStartupAnchorBoundaryState(2_000).anchorObserved).toBe(true);
    expect(state.getShellProbeBoundaryState(2_000).triggered).toBe(false);
    expect(state.getShellProbeBoundaryState(2_000).probeCount).toBe(0);
  });

  it('counts mixed probe plus active audit startup-anchor reads as shell probes while preserving the anchor', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/repo',
      auditStartupAnchorPaths: ['/repo/.runs/sample-task/cli/sample-run/manifest.json'],
      allowedMetaSurfaceEnvVars: ['MANIFEST'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/repo/.runs/sample-task/cli/sample-run/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'printf "%s\\n" "$MANIFEST"; sed -n 1,80p "$MANIFEST"'\n`,
      'stdout',
      110
    );

    expect(state.getStartupAnchorBoundaryState(2_000).anchorObserved).toBe(true);
    expect(state.getShellProbeBoundaryState(2_000).triggered).toBe(false);
    expect(state.getShellProbeBoundaryState(2_000).probeCount).toBe(1);
  });

  it('ignores literal MANIFEST_HINT echoes but counts printenv MANIFEST as shell probes', () => {
    const echoState = new ReviewExecutionState({ startedAtMs: 0 });

    echoState.observeChunk('thinking\nexec\n', 'stdout', 100);
    echoState.observeChunk(`/bin/zsh -lc 'echo MANIFEST_HINT'\n`, 'stdout', 110);

    expect(echoState.getShellProbeBoundaryState(2_000).probeCount).toBe(0);

    const printenvState = new ReviewExecutionState({ startedAtMs: 0 });

    printenvState.observeChunk('thinking\nexec\n', 'stdout', 100);
    printenvState.observeChunk(`/bin/zsh -lc 'printenv MANIFEST'\n`, 'stdout', 110);

    expect(printenvState.getShellProbeBoundaryState(2_000).probeCount).toBe(1);
  });

  it('does not treat grep-based code searches over files as shell probes', () => {
    const state = new ReviewExecutionState({ startedAtMs: 0 });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'grep -n MANIFEST tests/run-review.spec.ts docs/standalone-review-guide.md'\n`,
      'stdout',
      110
    );

    expect(state.getShellProbeBoundaryState(2_000).probeCount).toBe(0);
  });

  it('counts nested shell payload probes', () => {
    const state = new ReviewExecutionState({ startedAtMs: 0 });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc "/bin/bash -lc 'printenv MANIFEST'"\n`,
      'stdout',
      110
    );

    expect(state.getShellProbeBoundaryState(2_000).probeCount).toBe(1);
  });

  it('reports total shell probe count beyond the retained sample window', () => {
    const state = new ReviewExecutionState({ startedAtMs: 0 });

    for (let index = 0; index < 10; index += 1) {
      state.observeChunk('thinking\nexec\n', 'stdout', 100 + index * 100);
      state.observeChunk(
        `/bin/zsh -lc 'printenv MANIFEST'\n`,
        'stdout',
        110 + index * 100
      );
    }

    const summary = state.buildOutputSummary();
    expect(summary.shellProbeCount).toBe(10);
    expect(state.getShellProbeBoundaryState(2_000).probeCount).toBe(10);
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

  it('classifies verdict-stability drift from repeated speculative output with no new concrete progress even when commands vary', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      verdictStabilityTimeoutMs: 1_000
    });

    const commands = [
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts'",
      "/bin/zsh -lc 'sed -n 1,120p tests/run-review.spec.ts'",
      "/bin/zsh -lc 'sed -n 1,120p docs/standalone-review-guide.md'"
    ];

    let nowMs = 100;
    for (let index = 0; index < 4; index += 1) {
      state.observeChunk('thinking\n', 'stdout', nowMs);
      state.observeChunk(
        'I need to inspect dist/tests/review-scope-paths.spec.js to confirm whether the generated test surface still exposes the bug.\n',
        'stdout',
        nowMs + 10
      );
      state.observeChunk(
        'I need to inspect dist/tests/review-scope-paths.spec.js to confirm whether the generated test surface still exposes the bug.\n',
        'stdout',
        nowMs + 20
      );
      state.observeChunk(
        'I am still considering whether scripts/lib/review-scope-paths.ts requires another parity change before I can finish the review.\n',
        'stdout',
        nowMs + 30
      );
      state.observeChunk(
        'I am still considering whether scripts/lib/review-scope-paths.ts requires another parity change before I can finish the review.\n',
        'stdout',
        nowMs + 40
      );
      state.observeChunk('exec\n', 'stdout', nowMs + 50);
      state.observeChunk(`${commands[index]}\n`, 'stdout', nowMs + 60);
      nowMs += 100;
    }

    const drift = state.getVerdictStabilityState(2_000);
    const summary = state.buildOutputSummary();
    expect(drift.triggered).toBe(true);
    expect(drift.reason).toContain('verdict-stability drift detected');
    expect(summary.outputInspectionSignals).toBeGreaterThanOrEqual(4);
    expect(summary.distinctOutputInspectionTargets).toBeLessThanOrEqual(4);
    expect(summary.maxOutputNarrativeSignatureHits).toBeGreaterThanOrEqual(2);
  });

  it('classifies verdict-stability drift from repeated targetless speculative output with no new concrete findings', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      verdictStabilityTimeoutMs: 1_000
    });

    const commands = [
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts'",
      "/bin/zsh -lc 'sed -n 1,120p tests/run-review.spec.ts'",
      "/bin/zsh -lc 'sed -n 1,120p docs/standalone-review-guide.md'"
    ];
    const narratives = [
      'Maybe the reviewer is still circling around ANSI stripping before reaching a final verdict.',
      'Maybe the reviewer is still circling around ANSI stripping before reaching a final verdict.',
      'I am still considering whether the small-diff revisit policy needs another tweak before I can finish the review.',
      'I am still considering whether the small-diff revisit policy needs another tweak before I can finish the review.'
    ];

    let nowMs = 100;
    for (let index = 0; index < narratives.length; index += 1) {
      state.observeChunk('thinking\n', 'stdout', nowMs);
      state.observeChunk(`${narratives[index]}\n`, 'stdout', nowMs + 20);
      state.observeChunk('exec\n', 'stdout', nowMs + 30);
      state.observeChunk(`${commands[index % commands.length]}\n`, 'stdout', nowMs + 40);
      nowMs += 100;
    }

    const drift = state.getVerdictStabilityState(2_000);
    const summary = state.buildOutputSummary();
    expect(drift.triggered).toBe(true);
    expect(drift.reason).toContain('verdict-stability drift detected');
    expect(summary.outputInspectionSignals).toBe(0);
    expect(summary.outputNarrativeSignals).toBeGreaterThanOrEqual(4);
    expect(summary.concreteOutputSignals).toBe(0);
    expect(summary.distinctOutputInspectionTargets).toBe(0);
    expect(summary.maxOutputNarrativeSignatureHits).toBeGreaterThanOrEqual(2);
  });

  it('does not classify verdict-stability drift when output keeps introducing new concrete targets', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      verdictStabilityTimeoutMs: 1_000
    });

    const commands = [
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts'",
      "/bin/zsh -lc 'sed -n 1,120p tests/run-review.spec.ts'",
      "/bin/zsh -lc 'sed -n 1,120p docs/standalone-review-guide.md'"
    ];
    const narratives = [
      'I need to inspect scripts/run-review.ts to verify the new concrete review surface before finalizing findings.',
      'I need to inspect scripts/lib/review-execution-state.ts to verify the new concrete review surface before finalizing findings.',
      'I need to inspect tests/run-review.spec.ts to verify the new concrete review surface before finalizing findings.',
      'I need to inspect docs/standalone-review-guide.md to verify the new concrete review surface before finalizing findings.',
      'I need to inspect docs/PRD-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md to verify the new concrete review surface before finalizing findings.'
    ];

    let nowMs = 100;
    for (let index = 0; index < narratives.length; index += 1) {
      state.observeChunk('thinking\n', 'stdout', nowMs);
      state.observeChunk(`${narratives[index]}\n`, 'stdout', nowMs + 20);
      state.observeChunk('exec\n', 'stdout', nowMs + 30);
      state.observeChunk(`${commands[index % commands.length]}\n`, 'stdout', nowMs + 40);
      nowMs += 100;
    }

    const drift = state.getVerdictStabilityState(2_000);
    const summary = state.buildOutputSummary();
    expect(drift.triggered).toBe(false);
    expect(summary.distinctOutputInspectionTargets).toBeGreaterThan(4);
  });

  it('does not classify generic verdict-stability drift when the same small diff keeps surfacing concrete findings', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      verdictStabilityTimeoutMs: 1_000,
      touchedPaths: [
        'scripts/run-review.ts',
        'scripts/lib/review-execution-state.ts',
        'scripts/review-helper.sh'
      ]
    });

    const commands = [
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts'"
    ];
    const narratives = [
      'Maybe the reviewer is still circling around ANSI stripping before reaching a final verdict.',
      'Maybe the reviewer is still circling around ANSI stripping before reaching a final verdict.',
      'I am still considering whether the small-diff revisit policy needs another tweak before I can finish the review.',
      'I am still considering whether the small-diff revisit policy needs another tweak before I can finish the review.'
    ];
    const concreteFindings = [
      '- scripts/run-review.ts:2315 still includes the bounded exit toggle text.',
      '- scripts/lib/review-execution-state.ts:946 still resets the candidate when concrete output arrives.',
      '- scripts/review-helper.sh:12 still counts as a touched-path concrete finding.',
      '- scripts/lib/review-execution-state.ts#L929 still keeps the targeted file-output predicate intact.'
    ];

    let nowMs = 100;
    for (let index = 0; index < narratives.length; index += 1) {
      state.observeChunk('thinking\n', 'stdout', nowMs);
      state.observeChunk(`${narratives[index]}\n`, 'stdout', nowMs + 20);
      state.observeChunk(`${concreteFindings[index]}\n`, 'stdout', nowMs + 25);
      state.observeChunk('exec\n', 'stdout', nowMs + 30);
      state.observeChunk(`${commands[index]}\n`, 'stdout', nowMs + 40);
      nowMs += 100;
    }

    const drift = state.getVerdictStabilityState(2_000);
    const summary = state.buildOutputSummary();
    expect(drift.triggered).toBe(false);
    expect(summary.distinctOutputInspectionTargets).toBe(0);
    expect(summary.outputNarrativeSignals).toBeGreaterThanOrEqual(4);
    expect(summary.concreteOutputSignals).toBeGreaterThanOrEqual(4);
    expect(summary.maxOutputNarrativeSignatureHits).toBeGreaterThanOrEqual(2);
  });

  it('does not treat raw touched-file content references without location markers as concrete progress', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      verdictStabilityTimeoutMs: 1_000,
      touchedPaths: ['scripts/run-review.ts']
    });

    const commands = [
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts'",
      "/bin/zsh -lc 'sed -n 1,120p tests/run-review.spec.ts'",
      "/bin/zsh -lc 'sed -n 1,120p docs/standalone-review-guide.md'"
    ];
    const narratives = [
      'Maybe the reviewer is still circling around ANSI stripping before reaching a final verdict.',
      'Maybe the reviewer is still circling around ANSI stripping before reaching a final verdict.',
      'I am still considering whether the small-diff revisit policy needs another tweak before I can finish the review.',
      'I am still considering whether the small-diff revisit policy needs another tweak before I can finish the review.'
    ];

    let nowMs = 100;
    for (let index = 0; index < narratives.length; index += 1) {
      state.observeChunk('thinking\n', 'stdout', nowMs);
      state.observeChunk(`${narratives[index]}\n`, 'stdout', nowMs + 20);
      state.observeChunk(
        "matchesPathSuffix(normalized, 'scripts/run-review.ts') ||\n",
        'stdout',
        nowMs + 25
      );
      state.observeChunk('exec\n', 'stdout', nowMs + 30);
      state.observeChunk(`${commands[index % commands.length]}\n`, 'stdout', nowMs + 40);
      nowMs += 100;
    }

    const drift = state.getVerdictStabilityState(2_000);
    const summary = state.buildOutputSummary();
    expect(drift.triggered).toBe(true);
    expect(summary.concreteOutputSignals).toBe(0);
    expect(summary.distinctOutputInspectionTargets).toBe(0);
  });

  it('does not classify inspected fixture file contents as verdict-stability narrative drift', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      verdictStabilityTimeoutMs: 1_000
    });

    const fixtureOutputs = [
      [
        'echo "I need to inspect dist/tests/review-scope-paths.spec.js to confirm whether the generated test surface still exposes the bug."',
        'echo "I am still considering whether scripts/lib/review-scope-paths.ts requires another parity change before I can finish the review."'
      ],
      [
        "'I need to inspect dist/tests/review-scope-paths.spec.js to confirm whether the generated test surface still exposes the bug.\\n',",
        "'I am still considering whether scripts/lib/review-scope-paths.ts requires another parity change before I can finish the review.\\n',"
      ]
    ];

    const commands = [
      "/bin/zsh -lc 'sed -n 168,182p tests/run-review.spec.ts'",
      "/bin/zsh -lc 'sed -n 426,446p tests/review-execution-state.spec.ts'"
    ];

    let nowMs = 100;
    for (let index = 0; index < 4; index += 1) {
      const fixtureOutput = fixtureOutputs[index % fixtureOutputs.length] ?? [];
      state.observeChunk('thinking\n', 'stdout', nowMs);
      state.observeChunk('exec\n', 'stdout', nowMs + 10);
      state.observeChunk(`${commands[index % commands.length]}\n`, 'stdout', nowMs + 20);
      for (const line of fixtureOutput) {
        state.observeChunk(`${line}\n`, 'stdout', nowMs + 30);
        nowMs += 10;
      }
      nowMs += 100;
    }

    const drift = state.getVerdictStabilityState(2_000);
    const summary = state.buildOutputSummary();
    expect(drift.triggered).toBe(false);
    expect(summary.outputInspectionSignals).toBe(0);
    expect(summary.distinctOutputInspectionTargets).toBe(0);
    expect(summary.maxOutputNarrativeSignatureHits).toBe(0);
  });

  it('ages verdict-stability drift out after sustained non-speculative progress', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      verdictStabilityTimeoutMs: 1_000
    });

    let nowMs = 100;
    for (let index = 0; index < 4; index += 1) {
      state.observeChunk('thinking\n', 'stdout', nowMs);
      state.observeChunk(
        'I need to inspect dist/tests/review-scope-paths.spec.js to confirm whether the generated test surface still exposes the bug.\n',
        'stdout',
        nowMs + 10
      );
      state.observeChunk(
        'I am still considering whether scripts/lib/review-scope-paths.ts requires another parity change before I can finish the review.\n',
        'stdout',
        nowMs + 20
      );
      state.observeChunk('exec\n', 'stdout', nowMs + 30);
      state.observeChunk(
        `/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'\n`,
        'stdout',
        nowMs + 40
      );
      nowMs += 100;
    }

    for (let index = 0; index < 40; index += 1) {
      state.observeChunk(
        'Concrete diff line without file target but definitely new progress.\n',
        'stdout',
        nowMs + index * 10
      );
    }

    const drift = state.getVerdictStabilityState(3_000);
    const summary = state.buildOutputSummary();
    expect(drift.triggered).toBe(false);
    expect(summary.outputInspectionSignals).toBe(0);
    expect(summary.distinctOutputInspectionTargets).toBe(0);
    expect(summary.maxOutputNarrativeSignatureHits).toBe(0);
  });

  it('classifies bounded meta-surface expansion from sustained off-task review surfaces', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000
    });

    let nowMs = 100;
    const commands = [
      "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'",
      "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/skills/delegation-usage/SKILL.md'",
      "/bin/zsh -lc 'sed -n 1,80p .runs/sample-task/cli/sample-run/manifest.json'",
      "/bin/zsh -lc 'tail -n 80 .runs/sample-task/cli/sample-run/runner.ndjson'",
      "/bin/zsh -lc 'codex-orchestrator review --manifest .runs/sample-task/cli/sample-run/manifest.json'"
    ];
    for (let index = 0; index < 8; index += 1) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk(`${commands[index % commands.length]}\n`, 'stdout', nowMs + 10);
      if (index % 2 === 1) {
        state.observeChunk('tool delegation.delegate.spawn({"pipeline":"docs-review"})\n', 'stdout', nowMs + 20);
      }
      nowMs += 100;
    }

    const expansion = state.getMetaSurfaceExpansionState(2_000);
    expect(expansion.triggered).toBe(true);
    expect(expansion.reason).toContain('meta-surface expansion detected');
    expect(expansion.metaSurfaceSignals).toBeGreaterThanOrEqual(4);
    expect(expansion.distinctMetaSurfaces).toBeGreaterThanOrEqual(3);
  });

  it('does not classify incidental meta-surface lookups as sustained expansion', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk("/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'\n", 'stdout', 110);
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk("/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n", 'stdout', 210);
    state.observeChunk('thinking\nexec\n', 'stdout', 300);
    state.observeChunk("/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts'\n", 'stdout', 310);
    state.observeChunk('thinking\nexec\n', 'stdout', 400);
    state.observeChunk("/bin/zsh -lc 'sed -n 1,120p tests/run-review.spec.ts'\n", 'stdout', 410);

    expect(state.getMetaSurfaceExpansionState(2_000).triggered).toBe(false);
  });

  it('ignores rg patterns that only mention run manifests while searching non-meta docs files', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'rg --glob=*.md -n ".runs/sample-task/cli/sample-run/manifest.json" README.md docs/TASKS.md'\n`,
      'stdout',
      110
    );

    const expansion = state.getMetaSurfaceExpansionState(2_000);
    expect(expansion.triggered).toBe(false);
    expect(expansion.metaSurfaceSignals).toBe(0);
  });

  it('classifies variable-indirected manifest reads as meta-surface activity', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'MANIFEST=.runs/sample-task/cli/sample-run/manifest.json; cat "$MANIFEST"'\n`,
      'stdout',
      110
    );

    const expansion = state.getMetaSurfaceExpansionState(2_000);
    expect(expansion.triggered).toBe(false);
    expect(expansion.metaSurfaceSignals).toBe(1);
    expect(expansion.distinctMetaSurfaces).toBe(1);
  });

  it('triggers the startup-anchor boundary when repeated meta-surface reads happen before touched-path inspection', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/skills/delegation-usage/SKILL.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorCommandStarts).toBe(2);
    expect(boundary.preAnchorMetaSurfaceSignals).toBe(2);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'codex-skills']);
    expect(summary.startupAnchorObserved).toBe(false);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(2);
  });

  it('triggers the audit startup-anchor boundary when repeated off-surface reads happen before manifest or runner-log evidence', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit'
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p docs/standalone-review-guide.md'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorCommandStarts).toBe(2);
    expect(boundary.preAnchorMetaSurfaceSignals).toBe(2);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'review-docs']);
    expect(summary.startupAnchorObserved).toBe(false);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(2);
  });

  it('treats manifest and runner-log evidence as valid audit startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: [
        '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/manifest.json',
        '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/runner.ndjson'
      ],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/manifest.json',
        RUNNER_LOG: '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/runner.ndjson',
        RUN_LOG: '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/runner.ndjson'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,80p .runs/sample-task/cli/sample-run/manifest.json'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'tail -n 80 .runs/sample-task/cli/sample-run/runner.ndjson'\n`,
      'stdout',
      210
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 300);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      310
    );

    const boundary = state.getStartupAnchorBoundaryState(320);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(0);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(0);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('treats exported MANIFEST reads across sibling shell segments as valid audit startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'export MANIFEST=manual-review/manifest.json; sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('treats self-reexported MANIFEST reads as valid audit startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'export MANIFEST=$MANIFEST; sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('does not treat leading assignment plus export as a MANIFEST rebinding in zsh audit shells', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'MANIFEST=/tmp/other.json export MANIFEST; sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('does not treat self-reexports after a prior rebinding as valid audit startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'MANIFEST=/tmp/other.json; export MANIFEST=$MANIFEST; sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'run-manifest']);
  });

  it('does not treat unset followed by self-reexport as a valid audit startup anchor', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'unset MANIFEST; export MANIFEST=$MANIFEST; sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'run-manifest']);
  });

  it('does not carry export state across pipeline operators when checking audit anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'export MANIFEST=/tmp/other.json | cat >/dev/null; sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('does not carry export state across short-circuit operators when checking audit anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'true || export MANIFEST=/tmp/other.json; sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('fails closed when an executed || branch rebinds MANIFEST before the first anchor', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'false || export MANIFEST=/tmp/other.json; sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'run-manifest']);
  });

  it('fails closed when a successful && export rebinds MANIFEST before the first anchor', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'export MANIFEST=/tmp/other.json && sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'run-manifest']);
  });

  it('fails closed when bash same-key bare export rebinds MANIFEST before the first anchor', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/bash -lc 'MANIFEST=/tmp/other.json export MANIFEST; sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'run-manifest']);
  });

  it('keeps unset-driven MANIFEST removal visible across a successful && chain', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'unset MANIFEST && sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceSignals).toBe(1);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories']);
  });

  it('keeps bash export -n MANIFEST removal visible across a successful && chain', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/bash -lc 'export -n MANIFEST && /bin/bash -lc "sed -n 1,80p \\\"$MANIFEST\\\""'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceSignals).toBe(1);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories']);
  });

  it('preserves parent-shell export state after a backgrounded command', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sleep 0.01 & export MANIFEST=/tmp/other.json; sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'run-manifest']);
  });

  it('treats exported RUN_LOG reads across sibling shell segments as valid audit startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/runner.ndjson'],
      auditStartupAnchorEnvVarPaths: {
        RUNNER_LOG: '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/runner.ndjson',
        RUN_LOG: '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/runner.ndjson'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'export RUN_LOG=.runs/sample-task/cli/sample-run/runner.ndjson; tail -n 80 \"$RUN_LOG\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('fails closed when a leading temp RUNNER_LOG assignment rebinds an exported RUN_LOG alias', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/runner.ndjson'],
      auditStartupAnchorEnvVarPaths: {
        RUNNER_LOG: '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/runner.ndjson',
        RUN_LOG: '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/runner.ndjson'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'RUNNER_LOG=/tmp/other.ndjson export RUN_LOG=$RUNNER_LOG; tail -n 80 \"$RUN_LOG\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'run-runner-log']);
  });

  it('treats RUN_LOG alias reexports as valid audit startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/runner.ndjson'],
      auditStartupAnchorEnvVarPaths: {
        RUNNER_LOG: '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/runner.ndjson',
        RUN_LOG: '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/runner.ndjson'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'export RUN_LOG=$RUNNER_LOG; tail -n 80 \"$RUN_LOG\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('treats env -u MANIFEST direct child reads as valid audit startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'export MANIFEST=manual-review/manifest.json; env -u MANIFEST sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('treats explicit audit startup anchor paths outside .runs as valid anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,80p manual-review/manifest.json'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(0);
  });

  it('does not treat unrelated run manifests as valid audit startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/manifest.json'],
      allowedMetaSurfaceEnvVars: ['MANIFEST'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,80p .runs/other-task/cli/other-run/manifest.json'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'run-manifest']);
  });

  it('does not treat unavailable runner-log env vars as valid audit startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/manifest.json'],
      allowedMetaSurfaceEnvVars: ['MANIFEST'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,80p $RUNNER_LOG'\n`, 'stdout', 110);
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'run-runner-log']);
  });

  it('keeps unrelated run manifests visible to the meta-surface guard after an active audit anchor exists', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      allowedMetaSurfaceKinds: ['run-manifest', 'run-runner-log'],
      repoRoot: '/Users/kbediako/Code/CO',
      allowedMetaSurfacePaths: ['/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/manifest.json'],
      allowedMetaSurfaceEnvVars: ['MANIFEST'],
      allowedMetaSurfaceEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/.runs/sample-task/cli/sample-run/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,80p .runs/sample-task/cli/sample-run/manifest.json'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,80p .runs/other-task/cli/other-run/manifest.json'\n`,
      'stdout',
      210
    );

    const summary = state.buildOutputSummary();
    expect(summary.metaSurfaceSignals).toBe(1);
    expect(summary.metaSurfaceKinds).toEqual(['run-manifest']);
  });

  it('does not treat ordinary repo manifest.json files as run-manifest meta-surface activity', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000,
      repoRoot: '/Users/kbediako/Code/CO'
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,80p schemas/manifest.json'\n`, 'stdout', 110);

    const summary = state.buildOutputSummary();
    expect(summary.metaSurfaceSignals).toBe(0);
    expect(summary.metaSurfaceKinds).toEqual([]);
  });

  it('keeps inline MANIFEST rebindings visible to generic run-manifest meta-surface tracking', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      repoRoot: '/Users/kbediako/Code/CO',
      allowedMetaSurfaceEnvVars: ['MANIFEST'],
      allowedMetaSurfaceEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'MANIFEST=/tmp/other.json sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );

    const summary = state.buildOutputSummary();
    expect(summary.metaSurfaceSignals).toBe(1);
    expect(summary.metaSurfaceKinds).toEqual(['run-manifest']);
  });

  it('does not treat exported ordinary repo manifest paths as generic run-manifest meta-surface activity', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'export MANIFEST=schemas/manifest.json; sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );

    const summary = state.buildOutputSummary();
    expect(summary.metaSurfaceSignals).toBe(0);
    expect(summary.metaSurfaceKinds).toEqual([]);
  });

  it('does not treat env -i nested shell reads as valid audit startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'export MANIFEST=manual-review/manifest.json; env -i /bin/zsh -lc \"sed -n 1,80p \\\"$MANIFEST\\\"\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories']);
  });

  it('does not allow rebinding MANIFEST away from the active audit evidence path', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'MANIFEST=/tmp/other.json sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'run-manifest']);
  });

  it('does not allow exported MANIFEST rebinding away from the active audit evidence path', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'export MANIFEST=/tmp/other.json; sed -n 1,80p \"$MANIFEST\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'run-manifest']);
  });

  it('preserves shell-wrapped MANIFEST rebinding when descending into nested audit payloads', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'audit',
      repoRoot: '/Users/kbediako/Code/CO',
      auditStartupAnchorPaths: ['/Users/kbediako/Code/CO/manual-review/manifest.json'],
      auditStartupAnchorEnvVarPaths: {
        MANIFEST: '/Users/kbediako/Code/CO/manual-review/manifest.json'
      }
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'MANIFEST=/tmp/other.json /bin/zsh -lc \"sed -n 1,80p \\\"$MANIFEST\\\"\"'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(boundary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'run-manifest']);
  });

  it('allows one incidental meta-surface read before a touched-path anchor', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'\n`, 'stdout', 210);

    const boundary = state.getStartupAnchorBoundaryState(220);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(1);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(1);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories']);
  });

  it('does not count nearby review-support reads against the startup-anchor budget', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p tests/review-execution-state.spec.ts'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p tests/run-review.spec.ts'\n`,
      'stdout',
      210
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 300);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'\n`, 'stdout', 310);

    const boundary = state.getStartupAnchorBoundaryState(320);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(2);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(0);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('treats scoped diff commands as valid startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      scopeMode: 'uncommitted',
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'git diff --stat'\n`, 'stdout', 110);
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(0);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(0);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('does not treat scoped diff commands as startup anchors outside uncommitted mode', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      scopeMode: 'commit',
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'git diff --stat'\n`, 'stdout', 110);
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 300);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'\n`, 'stdout', 310);

    const boundary = state.getStartupAnchorBoundaryState(320);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(2);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(1);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories']);
  });

  it('does not treat off-scope uncommitted diff pathspecs as startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      scopeMode: 'uncommitted',
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'git diff --stat -- docs/standalone-review-guide.md'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 300);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'\n`, 'stdout', 310);

    const boundary = state.getStartupAnchorBoundaryState(320);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(2);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(2);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'review-docs']);
  });

  it('does not treat same-suffix paths outside the repo root as touched-path anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      repoRoot: '/Users/kbediako/Code/CO',
      touchedPaths: ['src/current/file.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,120p /tmp/other/src/current/file.ts'\n`, 'stdout', 110);
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 300);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,120p src/current/file.ts'\n`, 'stdout', 310);

    const boundary = state.getStartupAnchorBoundaryState(320);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(2);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(1);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories']);
  });

  it('does not count meta-surface reads that happen after a scoped diff anchor in the same shell line', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'git diff --stat && sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      110
    );

    const boundary = state.getStartupAnchorBoundaryState(120);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(0);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(0);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('counts every disallowed pre-anchor meta read in a chained shell command before the first anchor', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p tests/run-review.spec.ts && sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md && sed -n 1,120p /Users/kbediako/.codex/skills/delegation-usage/SKILL.md && sed -n 1,120p scripts/run-review.ts'\n`,
      'stdout',
      110
    );

    const boundary = state.getStartupAnchorBoundaryState(120);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(0);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(2);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'codex-skills']);
  });

  it('treats non-regex-matched touched paths such as shell scripts as valid startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      touchedPaths: ['scripts/review-helper.sh']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p scripts/review-helper.sh'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(1);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(1);
  });

  it('treats git show rev:path reads of touched files as valid startup anchors', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'git show HEAD:scripts/run-review.ts'\n`, 'stdout', 110);
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(0);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(0);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('counts mixed touched-path and meta-surface commands before the startup anchor is promoted', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      110
    );

    const boundary = state.getStartupAnchorBoundaryState(120);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(0);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(1);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories']);
  });

  it('treats review-scope sibling reads as valid startup anchors when the paired source is touched', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      touchedPaths: ['scripts/lib/review-scope-paths.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,120p tests/review-scope-paths.spec.ts'\n`, 'stdout', 110);
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(220);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorCommandStarts).toBe(0);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(0);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('classifies adjacent review-support test files as meta-surface activity', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p tests/review-execution-state.spec.ts'\n`,
      'stdout',
      110
    );

    const expansion = state.getMetaSurfaceExpansionState(2_000);
    const summary = state.buildOutputSummary();
    expect(expansion.triggered).toBe(false);
    expect(summary.metaSurfaceSignals).toBe(1);
    expect(summary.metaSurfaceKinds).toEqual(['review-support']);
  });

  it('classifies untouched adjacent review-scope helpers as meta-surface activity for standalone-review diffs', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000,
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p dist/scripts/lib/review-scope-paths.js'\n`,
      'stdout',
      210
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 300);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p tests/review-scope-paths.spec.ts'\n`,
      'stdout',
      310
    );

    const expansion = state.getMetaSurfaceExpansionState(2_000);
    const summary = state.buildOutputSummary();
    expect(expansion.triggered).toBe(false);
    expect(summary.metaSurfaceSignals).toBe(2);
    expect(summary.metaSurfaceKinds).toEqual(['review-support']);
  });

  it('keeps shared docs-helpers reads in ordinary diff scope even for standalone-review diffs', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000,
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,120p scripts/lib/docs-helpers.js'\n`, 'stdout', 110);
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,120p scripts/lib/docs-helpers.d.ts'\n`, 'stdout', 210);

    const expansion = state.getMetaSurfaceExpansionState(2_000);
    const summary = state.buildOutputSummary();
    expect(expansion.triggered).toBe(false);
    expect(summary.metaSurfaceSignals).toBe(0);
    expect(summary.metaSurfaceKinds).toEqual([]);
  });

  it('keeps touched adjacent review-support helpers in ordinary diff scope', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000,
      touchedPaths: ['scripts/lib/review-scope-paths.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p dist/scripts/lib/review-scope-paths.js'\n`,
      'stdout',
      110
    );

    const expansion = state.getMetaSurfaceExpansionState(2_000);
    const summary = state.buildOutputSummary();
    expect(expansion.triggered).toBe(false);
    expect(summary.metaSurfaceSignals).toBe(0);
    expect(summary.metaSurfaceKinds).toEqual([]);
  });

  it('keeps review-scope helper tests in ordinary diff scope when the helper source is touched', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000,
      touchedPaths: ['scripts/lib/review-scope-paths.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,120p tests/review-scope-paths.spec.ts'\n`, 'stdout', 110);

    const expansion = state.getMetaSurfaceExpansionState(2_000);
    const summary = state.buildOutputSummary();
    expect(expansion.triggered).toBe(false);
    expect(summary.metaSurfaceSignals).toBe(0);
    expect(summary.metaSurfaceKinds).toEqual([]);
  });

  it('keeps touched review-scope helper tests and their paired source in ordinary diff scope', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000,
      touchedPaths: ['tests/review-scope-paths.spec.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'sed -n 1,120p dist/scripts/lib/review-scope-paths.js'\n`, 'stdout', 110);

    const expansion = state.getMetaSurfaceExpansionState(2_000);
    const summary = state.buildOutputSummary();
    expect(expansion.triggered).toBe(false);
    expect(summary.metaSurfaceSignals).toBe(0);
    expect(summary.metaSurfaceKinds).toEqual([]);
  });

  it('evicts early meta-surface bursts once later normal commands dominate the recent window', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000
    });

    let nowMs = 100;
    const metaCommands = [
      "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'",
      "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/skills/delegation-usage/SKILL.md'",
      "/bin/zsh -lc 'codex-orchestrator review --manifest .runs/sample-task/cli/sample-run/manifest.json'"
    ];
    for (let index = 0; index < 6; index += 1) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk(`${metaCommands[index % metaCommands.length]}\n`, 'stdout', nowMs + 10);
      nowMs += 100;
    }
    expect(state.getMetaSurfaceExpansionState(nowMs + 50).metaSurfaceSignals).toBeGreaterThan(0);

    for (let index = 0; index < 8; index += 1) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk(
        `/bin/zsh -lc 'sed -n 1,120p orchestrator/src/cli/control/controlServer.ts chunk-${index}.md'\n`,
        'stdout',
        nowMs + 10
      );
      nowMs += 100;
    }

    const expansion = state.getMetaSurfaceExpansionState(nowMs + 1_500);
    expect(expansion.triggered).toBe(false);
    expect(expansion.metaSurfaceSignals).toBe(0);
  });

  it('keeps startup-anchor violations visible even after later touched-path reads evict the recent meta-surface window', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000,
      enforceStartupAnchorBoundary: true,
      touchedPaths: ['scripts/run-review.ts', 'scripts/lib/review-execution-state.ts']
    });

    let nowMs = 100;
    for (const command of [
      "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md'",
      "/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/skills/delegation-usage/SKILL.md'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/lib/review-execution-state.ts'"
    ]) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk(`${command}\n`, 'stdout', nowMs + 10);
      nowMs += 100;
    }

    const expansion = state.getMetaSurfaceExpansionState(nowMs + 1_500);
    const boundary = state.getStartupAnchorBoundaryState(nowMs + 1_500);
    const summary = state.buildOutputSummary();
    expect(expansion.triggered).toBe(false);
    expect(expansion.metaSurfaceSignals).toBe(0);
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(true);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.preAnchorMetaSurfaceSignals).toBe(2);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual(['codex-memories', 'codex-skills']);
  });

  it('classifies sustained adjacent review-system surfaces as meta-surface expansion', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000
    });

    let nowMs = 100;
    const commands = [
      "/bin/zsh -lc 'sed -n 1,120p docs/standalone-review-guide.md'",
      "/bin/zsh -lc 'sed -n 1,120p docs/guides/review-artifacts.md'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/pack-smoke.mjs'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/lib/run-manifests.js'",
      "/bin/zsh -lc 'sed -n 1,120p .runs/sample-task/cli/sample-run/review/prompt.txt'",
      "/bin/zsh -lc 'sed -n 1,120p .runs/sample-task/cli/sample-run/review/output.log'"
    ];
    for (let index = 0; index < 8; index += 1) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk(`${commands[index % commands.length]}\n`, 'stdout', nowMs + 10);
      nowMs += 100;
    }

    const expansion = state.getMetaSurfaceExpansionState(2_000);
    const summary = state.buildOutputSummary();
    expect(expansion.triggered).toBe(true);
    expect(summary.metaSurfaceKinds).toEqual(
      expect.arrayContaining(['review-artifacts', 'review-docs', 'review-support'])
    );
  });

  it('classifies direct active closeout-bundle rereads as self-referential meta surfaces', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'diff',
      activeCloseoutBundleRoots: ['/repo/out/sample-task/manual/TODO-closeout'],
      repoRoot: '/repo',
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p out/sample-task/manual/TODO-closeout/09-review.log'\n`,
      'stdout',
      110
    );
    state.observeChunk('thinking\nexec\n', 'stdout', 200);
    state.observeChunk(
      `/bin/zsh -lc 'sed -n 1,120p /repo/out/sample-task/manual/TODO-closeout/13-override-notes.md'\n`,
      'stdout',
      210
    );

    const boundary = state.getStartupAnchorBoundaryState(2_000);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(true);
    expect(boundary.anchorObserved).toBe(false);
    expect(summary.metaSurfaceKinds).toContain('review-closeout-bundle');
    expect(summary.preAnchorMetaSurfaceKinds).toEqual(['review-closeout-bundle']);
  });

  it('treats repeated active closeout-bundle rereads after earlier bounded inspection as a dedicated boundary', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'diff',
      activeCloseoutBundleRoots: ['/repo/out/sample-task/manual/TODO-closeout'],
      repoRoot: '/repo',
      touchedPaths: ['scripts/run-review.ts']
    });

    let nowMs = 100;
    for (const command of [
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p out/sample-task/manual/TODO-closeout/09-review.log'",
      "/bin/zsh -lc 'sed -n 1,120p /repo/out/sample-task/manual/TODO-closeout/13-override-notes.md'",
      "/bin/zsh -lc 'sed -n 1,120p out/sample-task/manual/TODO-closeout/09-review.log'",
      "/bin/zsh -lc 'sed -n 1,120p /repo/out/sample-task/manual/TODO-closeout/13-override-notes.md'",
      "/bin/zsh -lc 'sed -n 1,120p out/sample-task/manual/TODO-closeout/09-review.log'"
    ]) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk(`${command}\n`, 'stdout', nowMs + 10);
      nowMs += 100;
    }

    const boundary = state.getStartupAnchorBoundaryState(2_000);
    const rereadBoundary = state.getActiveCloseoutBundleRereadBoundaryState(2_000);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(boundary.anchorObserved).toBe(true);
    expect(rereadBoundary.triggered).toBe(true);
    expect(rereadBoundary.reason).toContain('active-closeout-bundle reread boundary violated');
    expect(rereadBoundary.anchorObserved).toBe(true);
    expect(rereadBoundary.rereadCount).toBeGreaterThanOrEqual(2);
    expect(summary.startupAnchorObserved).toBe(true);
    expect(summary.metaSurfaceKinds).toContain('review-closeout-bundle');
    expect(summary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('does not trigger the closeout-bundle reread boundary when bounded startup enforcement is disabled', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: false,
      startupAnchorMode: null,
      activeCloseoutBundleRoots: ['/repo/out/sample-task/manual/TODO-closeout'],
      repoRoot: '/repo',
      touchedPaths: ['scripts/run-review.ts']
    });

    let nowMs = 100;
    for (const command of [
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p out/sample-task/manual/TODO-closeout/09-review.log'",
      "/bin/zsh -lc 'sed -n 1,120p /repo/out/sample-task/manual/TODO-closeout/13-override-notes.md'",
      "/bin/zsh -lc 'sed -n 1,120p out/sample-task/manual/TODO-closeout/09-review.log'"
    ]) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk(`${command}\n`, 'stdout', nowMs + 10);
      nowMs += 100;
    }

    const rereadBoundary = state.getActiveCloseoutBundleRereadBoundaryState(2_000);
    const summary = state.buildOutputSummary();
    expect(rereadBoundary.triggered).toBe(false);
    expect(rereadBoundary.rereadCount).toBe(0);
    expect(summary.metaSurfaceKinds).toContain('review-closeout-bundle');
  });

  it('supports the dedicated closeout-bundle reread boundary independently from startup-anchor enforcement', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: false,
      enforceActiveCloseoutBundleRereadBoundary: true,
      startupAnchorMode: null,
      activeCloseoutBundleRoots: ['/repo/out/sample-task/manual/TODO-closeout'],
      repoRoot: '/repo',
      touchedPaths: ['scripts/run-review.ts']
    });

    let nowMs = 100;
    for (const command of [
      "/bin/zsh -lc 'sed -n 1,120p scripts/run-review.ts'",
      "/bin/zsh -lc 'sed -n 1,120p out/sample-task/manual/TODO-closeout/09-review.log'",
      "/bin/zsh -lc 'sed -n 1,120p /repo/out/sample-task/manual/TODO-closeout/13-override-notes.md'",
      "/bin/zsh -lc 'sed -n 1,120p out/sample-task/manual/TODO-closeout/09-review.log'"
    ]) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk(`${command}\n`, 'stdout', nowMs + 10);
      nowMs += 100;
    }

    const rereadBoundary = state.getActiveCloseoutBundleRereadBoundaryState(2_000);
    expect(rereadBoundary.triggered).toBe(true);
    expect(rereadBoundary.anchorObserved).toBe(false);
    expect(rereadBoundary.rereadCount).toBeGreaterThanOrEqual(2);
    expect(rereadBoundary.reason).toContain('active-closeout-bundle reread boundary violated');
  });

  it('classifies repo-wide search results that surface the active closeout bundle', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'diff',
      activeCloseoutBundleRoots: ['/repo/out/sample-task/manual/TODO-closeout'],
      repoRoot: '/repo',
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'grep -R "shellProbeCount" -n .'\n`, 'stdout', 110);
    state.observeChunk(
      `out/sample-task/manual/TODO-closeout/09-review.log:278:shellProbeCount\n`,
      'stdout',
      120
    );
    state.observeChunk(
      `/repo/out/sample-task/manual/TODO-closeout/13-override-notes.md:6:getShellProbeBoundaryState\n`,
      'stdout',
      130
    );

    const summary = state.buildOutputSummary();
    expect(state.getStartupAnchorBoundaryState(2_000).triggered).toBe(false);
    expect(summary.metaSurfaceSignals).toBe(2);
    expect(summary.metaSurfaceKinds).toContain('review-closeout-bundle');
    expect(summary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('classifies Windows-style search results that surface the active closeout bundle', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      activeCloseoutBundleRoots: ['C:/repo/out/sample-task/manual/TODO-closeout'],
      repoRoot: 'C:/repo',
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'rg -n "shellProbeCount" .'\n`, 'stdout', 110);
    state.observeChunk(
      `C:/repo/out/sample-task/manual/TODO-closeout/09-review.log:278:shellProbeCount\n`,
      'stdout',
      120
    );

    const summary = state.buildOutputSummary();
    expect(summary.metaSurfaceSignals).toBe(1);
    expect(summary.metaSurfaceKinds).toContain('review-closeout-bundle');
  });

  it('ignores historical closeout bundles outside the active root set', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      enforceStartupAnchorBoundary: true,
      startupAnchorMode: 'diff',
      activeCloseoutBundleRoots: ['/repo/out/sample-task/manual/TODO-closeout'],
      repoRoot: '/repo',
      touchedPaths: ['scripts/run-review.ts']
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'grep -R "shellProbeCount" -n .'\n`, 'stdout', 110);
    state.observeChunk(
      `out/sample-task/manual/20260310T235959Z-closeout/09-review.log:278:shellProbeCount\n`,
      'stdout',
      120
    );
    state.observeChunk(
      `/repo/out/sample-task/manual/20260310T235959Z-closeout/13-override-notes.md:6:getShellProbeBoundaryState\n`,
      'stdout',
      130
    );

    const boundary = state.getStartupAnchorBoundaryState(2_000);
    const summary = state.buildOutputSummary();
    expect(boundary.triggered).toBe(false);
    expect(summary.metaSurfaceSignals).toBe(0);
    expect(summary.metaSurfaceKinds).toEqual([]);
    expect(summary.preAnchorMetaSurfaceKinds).toEqual([]);
  });

  it('ignores review-system surfaces that are part of the touched diff scope', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      blockHeavyCommands: false,
      metaSurfaceTimeoutMs: 1_000,
      touchedPaths: ['docs/standalone-review-guide.md', 'scripts/pack-smoke.mjs']
    });

    let nowMs = 100;
    for (const command of [
      "/bin/zsh -lc 'sed -n 1,120p docs/standalone-review-guide.md'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/pack-smoke.mjs'",
      "/bin/zsh -lc 'sed -n 1,120p docs/standalone-review-guide.md'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/pack-smoke.mjs'",
      "/bin/zsh -lc 'sed -n 1,120p docs/standalone-review-guide.md'",
      "/bin/zsh -lc 'sed -n 1,120p scripts/pack-smoke.mjs'"
    ]) {
      state.observeChunk('thinking\nexec\n', 'stdout', nowMs);
      state.observeChunk(`${command}\n`, 'stdout', nowMs + 10);
      nowMs += 100;
    }

    const expansion = state.getMetaSurfaceExpansionState(2_000);
    expect(expansion.triggered).toBe(false);
    expect(expansion.metaSurfaceSignals).toBe(0);
  });

  it('classifies direct validation runners as command-intent boundary violations by default', () => {
    const state = new ReviewExecutionState({ startedAtMs: 0 });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts'\n`,
      'stdout',
      110
    );

    const boundary = state.getCommandIntentBoundaryState(2_000);
    expect(boundary.triggered).toBe(true);
    expect(boundary.violationKind).toBe('validation-runner');
    expect(boundary.violationSample).toContain('npx vitest run');
  });

  it('allows direct validation runners when heavy review commands are explicitly allowed', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      allowValidationCommandIntents: true
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'pnpm dlx vitest run tests/review-execution-state.spec.ts'\n`,
      'stdout',
      110
    );

    const boundary = state.getCommandIntentBoundaryState(2_000);
    expect(boundary.triggered).toBe(false);
    expect(boundary.violationCount).toBe(0);
  });

  it('classifies package-manager validation suites as command-intent boundary violations by default', () => {
    const state = new ReviewExecutionState({ startedAtMs: 0 });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'npm run test -- run-review'\n`, 'stdout', 110);
    state.observeChunk('thinking\nexec\n', 'stdout', 120);
    state.observeChunk(`/bin/zsh -lc 'pnpm run docs:freshness'\n`, 'stdout', 130);

    const boundary = state.getCommandIntentBoundaryState(2_000);
    expect(boundary.triggered).toBe(true);
    expect(boundary.violationKind).toBe('validation-suite');
    expect(boundary.violationCount).toBe(2);
    expect(boundary.violationKinds).toEqual(['validation-suite']);
  });

  it('allows package-manager validation suites when heavy review commands are explicitly allowed', () => {
    const state = new ReviewExecutionState({
      startedAtMs: 0,
      allowValidationCommandIntents: true
    });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'npm run test -- run-review'\n`, 'stdout', 110);

    const boundary = state.getCommandIntentBoundaryState(2_000);
    expect(boundary.triggered).toBe(false);
    expect(boundary.violationCount).toBe(0);
  });

  it('classifies package-manager shorthand validation launches as command-intent violations', () => {
    const state = new ReviewExecutionState({ startedAtMs: 0 });

    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(`/bin/zsh -lc 'pnpm vitest run tests/run-review.spec.ts'\n`, 'stdout', 110);
    state.observeChunk('thinking\nexec\n', 'stdout', 120);
    state.observeChunk(`/bin/zsh -lc 'yarn jest tests/run-review.spec.ts'\n`, 'stdout', 130);
    state.observeChunk('thinking\nexec\n', 'stdout', 140);
    state.observeChunk(`/bin/zsh -lc 'bun vitest run tests/run-review.spec.ts'\n`, 'stdout', 150);

    const boundary = state.getCommandIntentBoundaryState(2_000);
    expect(boundary.triggered).toBe(true);
    expect(boundary.violationKind).toBe('validation-runner');
    expect(boundary.violationCount).toBe(3);
  });

  it('classifies nested review and mutating delegation control as command-intent violations but keeps status read-only', () => {
    const state = new ReviewExecutionState({ startedAtMs: 0 });

    state.observeChunk('tool delegation.delegate.status({"pipeline":"docs-review"})\n', 'stdout', 50);
    state.observeChunk('thinking\nexec\n', 'stdout', 100);
    state.observeChunk(
      `/bin/zsh -lc 'codex-orchestrator start docs-review --task sample-task'\n`,
      'stdout',
      110
    );
    state.observeChunk('tool delegation.delegate.spawn({"pipeline":"docs-review"})\n', 'stdout', 120);

    const boundary = state.getCommandIntentBoundaryState(2_000);
    expect(boundary.triggered).toBe(true);
    expect(boundary.violationKind).toBe('review-orchestration');
    expect(boundary.violationCount).toBe(2);
    expect(boundary.violationKinds).toEqual(['delegation-control', 'review-orchestration']);
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
