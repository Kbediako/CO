import { describe, expect, it } from 'vitest';

import {
  classifyShellProbeCommandLine,
  detectHeavyReviewCommand,
  grepSegmentUsesExplicitSearchTargets,
  isLikelyReviewCommandLine,
  tokenReferencesReviewShellProbeEnvVar
} from '../scripts/lib/review-command-probe-classification.js';

describe('review command probe classification', () => {
  it('suppresses shell-probe classification when a heavy command is present in the shell payload', () => {
    expect(
      classifyShellProbeCommandLine(`/bin/zsh -lc 'npm run test && printenv MANIFEST'`)
    ).toBeNull();
  });

  it('normalizes review execution suffixes before classifying shell probes and heavy commands', () => {
    expect(
      classifyShellProbeCommandLine(`/bin/zsh -lc 'printenv MANIFEST' succeeded in 12ms`)
    ).toBe(`/bin/zsh -lc 'printenv MANIFEST'`);
    expect(detectHeavyReviewCommand(`npm run test succeeded in 12ms`)).toBe(`npm run test`);
    expect(isLikelyReviewCommandLine(`npm run test exited with code 1`)).toBe(true);
  });

  it('distinguishes grep explicit search targets from probe-like env-var lookups', () => {
    expect(grepSegmentUsesExplicitSearchTargets(['-e', 'PATTERN', '$MANIFEST', 'file.txt'])).toBe(
      true
    );
    expect(
      classifyShellProbeCommandLine(`/bin/zsh -lc 'grep -e PATTERN $MANIFEST file.txt'`)
    ).toBeNull();
    expect(classifyShellProbeCommandLine(`/bin/zsh -lc 'grep $MANIFEST'`)).toBe(
      `/bin/zsh -lc 'grep $MANIFEST'`
    );
  });

  it('detects heavy commands through nested shell payloads', () => {
    expect(
      detectHeavyReviewCommand(`/bin/zsh -lc '/bin/bash -lc "echo prep && npm run test"'`)
    ).toBe(`npm run test`);
  });

  it('detects CO validation aliases and guard scripts as heavy commands', () => {
    expect(detectHeavyReviewCommand(`npm run test:core -- tests/spec-guard.spec.ts`)).toBe(
      `npm run test:core -- tests/spec-guard.spec.ts`
    );
    expect(detectHeavyReviewCommand(`npm run eval:test -- evaluation/tests/sample.spec.ts`)).toBe(
      `npm run eval:test -- evaluation/tests/sample.spec.ts`
    );
    expect(detectHeavyReviewCommand(`node scripts/run-test-all.mjs -- tests/spec-guard.spec.ts`)).toBe(
      `node scripts/run-test-all.mjs -- tests/spec-guard.spec.ts`
    );
    expect(
      detectHeavyReviewCommand(
        `/bin/zsh -lc 'tmp="$(mktemp -d)" && cd "$tmp" && node /Users/kbediako/Code/CO/scripts/spec-guard.mjs --dry-run'`
      )
    ).toBe(`node /Users/kbediako/Code/CO/scripts/spec-guard.mjs --dry-run`);
    expect(
      classifyShellProbeCommandLine(
        `/bin/zsh -lc 'node scripts/spec-guard.mjs --dry-run && printenv MANIFEST'`
      )
    ).toBeNull();
  });

  it('keeps help-only repo-local validation lookups out of the heavy blocker', () => {
    for (const commandLine of [
      `node scripts/spec-guard.mjs --help`,
      `node scripts/spec-guard.mjs -h`,
      `node scripts/spec-guard.mjs help`,
      `node scripts/spec-guard.mjs -- --help`,
      `node scripts/diff-budget.mjs --help`,
      `node scripts/delegation-guard.mjs --help`,
      `node scripts/docs-freshness.mjs --check --help`,
      `node scripts/docs-freshness-maintain.mjs --check --help`,
      `node scripts/repo-stewardship-audit.mjs --check --help`,
      `node scripts/spec-guard.mjs --help=false --help`,
      `scripts/spec-guard.mjs --help`,
      `scripts/spec-guard.mjs -h`,
      `scripts/spec-guard.mjs help`,
      `node --run docs:freshness -- --help`,
      `node --run docs:freshness -- --help=false --help`,
      `node --run=docs:freshness -- --help`,
      `node --run docs:freshness:maintain -- --help`,
      `node --run repo:stewardship -- --help`
    ]) {
      expect(detectHeavyReviewCommand(commandLine)).toBeNull();
    }
  });

  it('keeps disabled help flags on repo-local validation lookups inside the heavy blocker', () => {
    for (const commandLine of [
      `node scripts/spec-guard.mjs --help=false`,
      `node scripts/spec-guard.mjs --help=false=1`,
      `node scripts/spec-guard.mjs --help=0`,
      `node scripts/spec-guard.mjs --help=0=1`,
      `node scripts/spec-guard.mjs -h=false`,
      `node scripts/spec-guard.mjs -h=false=1`,
      `node scripts/docs-freshness.mjs --check --help=false`,
      `node scripts/docs-freshness.mjs --check --help=false=1`,
      `node --run docs:freshness -- --help=false`,
      `node --run docs:freshness -- --help=false=1`,
      `node --run docs:freshness:maintain -- --help=0`,
      `node --run docs:freshness:maintain -- --help=0=1`
    ]) {
      expect(detectHeavyReviewCommand(commandLine)).toBe(commandLine);
    }
  });

  it('tracks shell-probe env-var references without matching literal hints', () => {
    expect(tokenReferencesReviewShellProbeEnvVar('$MANIFEST')).toBe(true);
    expect(tokenReferencesReviewShellProbeEnvVar('${RUN_LOG:-fallback}')).toBe(true);
    expect(tokenReferencesReviewShellProbeEnvVar('MANIFEST_HINT')).toBe(false);
  });

  it('treats heavy commands and shell payload wrappers as likely review command lines', () => {
    expect(isLikelyReviewCommandLine(`/bin/zsh -lc 'printenv MANIFEST'`)).toBe(true);
    expect(isLikelyReviewCommandLine(`/bin/zsh -lc 'npm run docs:check'`)).toBe(true);
    expect(isLikelyReviewCommandLine(`/bin/zsh -lc 'npm run docs:freshness:maintain'`)).toBe(
      true
    );
    expect(isLikelyReviewCommandLine('not actually a command')).toBe(false);
  });

  it('keeps direct inspection primitives review-likely without promoting escaped search patterns', () => {
    expect(isLikelyReviewCommandLine('sed -n 1,120p scripts/run-review.ts')).toBe(true);
    expect(isLikelyReviewCommandLine('rg -n foo scripts/run-review.ts')).toBe(true);
    expect(detectHeavyReviewCommand(String.raw`rg run\|pytest file.txt`)).toBeNull();
  });

  it('keeps absolute Windows launcher paths recognizable in probe detection', () => {
    expect(
      detectHeavyReviewCommand(
        String.raw`C:\Users\me\AppData\Roaming\npm\npx.cmd vitest run tests/review-execution-state.spec.ts`
      )
    ).toBe(
      String.raw`C:/Users/me/AppData/Roaming/npm/npx.cmd vitest run tests/review-execution-state.spec.ts`
    );
    expect(
      classifyShellProbeCommandLine(
        String.raw`C:\Windows\System32\cmd.exe /C printenv MANIFEST`
      )
    ).toBe(String.raw`C:/Windows/System32/cmd.exe /C printenv MANIFEST`);
    expect(
      isLikelyReviewCommandLine(
        String.raw`C:\Users\me\AppData\Roaming\npm\codex-orchestrator.cmd review --manifest x`
      )
    ).toBe(true);
  });

  it('keeps relative Windows launcher paths recognizable in probe detection', () => {
    expect(
      detectHeavyReviewCommand(
        String.raw`node_modules\.bin\vitest run tests/review-execution-state.spec.ts`
      )
    ).toBe(String.raw`node_modules/.bin/vitest run tests/review-execution-state.spec.ts`);
    expect(
      isLikelyReviewCommandLine(
        String.raw`.\bin\codex-orchestrator review --manifest x`
      )
    ).toBe(true);
    expect(
      isLikelyReviewCommandLine(
        String.raw`cmd /C ".\bin\codex-orchestrator review --manifest x"`
      )
    ).toBe(true);

    expect(
      detectHeavyReviewCommand(
        String.raw`.\bin\python.exe -m pytest tests/review-execution-state.spec.ts`
      )
    ).toBe(String.raw`./bin/python.exe -m pytest tests/review-execution-state.spec.ts`);
    expect(
      detectHeavyReviewCommand(
        String.raw`venv\Scripts\pytest tests/review-execution-state.spec.ts`
      )
    ).toBe(String.raw`venv/Scripts/pytest tests/review-execution-state.spec.ts`);
    expect(
      isLikelyReviewCommandLine(
        String.raw`.\bin\codex-orchestrator.cmd review --manifest x`
      )
    ).toBe(true);
    expect(
      isLikelyReviewCommandLine(
        String.raw`bin\codex-orchestrator review --manifest x`
      )
    ).toBe(true);

    expect(
      detectHeavyReviewCommand(
        String.raw`".\bin\python.exe" -m pytest tests/review-execution-state.spec.ts`
      )
    ).toBe(
      String.raw`"./bin/python.exe" -m pytest tests/review-execution-state.spec.ts`
    );
    expect(
      isLikelyReviewCommandLine(
        String.raw`".\bin\codex-orchestrator.cmd" review --manifest x`
      )
    ).toBe(true);
    expect(
      detectHeavyReviewCommand(
        String.raw`/bin/zsh -lc '".\bin\python.exe" -m pytest tests/review-execution-state.spec.ts'`
      )
    ).toBe(
      String.raw`"./bin/python.exe" -m pytest tests/review-execution-state.spec.ts`
    );
    expect(
      isLikelyReviewCommandLine(
        String.raw`/bin/zsh -lc '".\bin\codex-orchestrator.cmd" review --manifest x'`
      )
    ).toBe(true);
    expect(
      classifyShellProbeCommandLine(
        String.raw`/bin/zsh -lc '".\bin\cmd.exe" /C printenv MANIFEST'`
      )
    ).toBe(String.raw`/bin/zsh -lc '".\bin\cmd.exe" /C printenv MANIFEST'`);

    expect(
      detectHeavyReviewCommand(
        String.raw`cmd /C "node_modules\.bin\vitest.cmd run tests/review-execution-state.spec.ts"`
      )
    ).toBe(String.raw`node_modules/.bin/vitest.cmd run tests/review-execution-state.spec.ts`);
    expect(
      detectHeavyReviewCommand(
        String.raw`cmd /C "venv\Scripts\pytest tests/review-execution-state.spec.ts"`
      )
    ).toBe(String.raw`venv/Scripts/pytest tests/review-execution-state.spec.ts`);
    expect(
      isLikelyReviewCommandLine(
        String.raw`cmd /C ".\bin\codex-orchestrator.cmd review --manifest x"`
      )
    ).toBe(true);
    expect(
      isLikelyReviewCommandLine(
        String.raw`cmd /C "bin\codex-orchestrator review --manifest x"`
      )
    ).toBe(true);
    expect(
      detectHeavyReviewCommand(
        String.raw`echo prep&&node_modules\.bin\vitest run tests/review-execution-state.spec.ts`
      )
    ).toBe(String.raw`node_modules/.bin/vitest run tests/review-execution-state.spec.ts`);
    expect(
      detectHeavyReviewCommand(
        String.raw`cmd /C "echo prep&&node_modules\.bin\vitest run tests/review-execution-state.spec.ts"`
      )
    ).toBe(String.raw`node_modules/.bin/vitest run tests/review-execution-state.spec.ts`);
    expect(
      isLikelyReviewCommandLine(
        String.raw`echo prep&&.\bin\codex-orchestrator review --manifest x`
      )
    ).toBe(true);
    expect(
      isLikelyReviewCommandLine(
        String.raw`cmd /C "echo prep&&.\bin\codex-orchestrator review --manifest x"`
      )
    ).toBe(true);
  });
});
