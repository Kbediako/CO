# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Command-Probe Classification Extraction

## Problem Statement

After the `1213` inspection-target parsing extraction, the next deterministic helper cluster left inline in `scripts/lib/review-execution-state.ts` is the shell-probe and heavy-command classifier family used to prefilter review command lines before stateful policy is applied.

## Scope

- extract the shell-probe and heavy-command classifier cluster from `scripts/lib/review-execution-state.ts`
- preserve nested payload probe detection, `grep` option parsing, shell-probe env-var heuristics, and heavy-command detection behavior
- keep stateful review-boundary policy ownership local to `review-execution-state`
- add only the focused regressions needed to pin preserved classifier behavior

## Out of Scope

- inspection-target parsing helpers already extracted in `1213`
- command-intent, meta-surface, startup-anchor, relevant-reinspection, or verdict-stability policy changes
- review-boundary state updates, counters, persistence, and limit logic
- `scripts/run-review.ts` runtime or prompt/telemetry changes

## Current Hypothesis

The next truthful seam is the pure classifier cluster around `hasHeavyCommandTokens`, `detectHeavyReviewCommandFromSegment`, `detectHeavyReviewCommand`, `tokenReferencesReviewShellProbeEnvVar`, `grepOptionConsumesValue`, `grepSegmentUsesExplicitSearchTargets`, `segmentLooksLikeShellProbe`, `payloadContainsShellProbe`, and `classifyShellProbeCommandLine`. That cluster is deterministic enough for its own helper boundary, while the surrounding stateful analyzers still belong in `review-execution-state`.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npm run lint`
- `npx vitest run --config vitest.config.core.ts tests/review-command-probe-classification.spec.ts tests/review-execution-state.spec.ts tests/review-meta-surface-normalization.spec.ts`
- `npm run test`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
