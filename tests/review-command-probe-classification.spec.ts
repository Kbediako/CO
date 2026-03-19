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

  it('tracks shell-probe env-var references without matching literal hints', () => {
    expect(tokenReferencesReviewShellProbeEnvVar('$MANIFEST')).toBe(true);
    expect(tokenReferencesReviewShellProbeEnvVar('${RUN_LOG:-fallback}')).toBe(true);
    expect(tokenReferencesReviewShellProbeEnvVar('MANIFEST_HINT')).toBe(false);
  });

  it('treats heavy commands and shell payload wrappers as likely review command lines', () => {
    expect(isLikelyReviewCommandLine(`/bin/zsh -lc 'printenv MANIFEST'`)).toBe(true);
    expect(isLikelyReviewCommandLine(`/bin/zsh -lc 'npm run docs:check'`)).toBe(true);
    expect(isLikelyReviewCommandLine('not actually a command')).toBe(false);
  });
});
