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
