# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Command-Intent Classification Extraction

## Problem Statement

After `1214`, the next deterministic helper cluster left inline in `scripts/lib/review-execution-state.ts` is the command-intent classifier family used to detect review orchestration commands, direct validation runners, and package-script validation suites before stateful review policy is applied.

## Scope

- extract the command-intent helper cluster from `scripts/lib/review-execution-state.ts`
- preserve tool-line delegation detection, nested shell-segment command-intent parsing, direct validation runner allowlist handling, package-script validation-suite resolution, and violation-label formatting
- keep stateful review-boundary policy ownership local to `review-execution-state`
- add only the focused regressions needed to pin preserved command-intent behavior

## Out of Scope

- command-probe and heavy-command classification already extracted in `1214`
- meta-surface, startup-anchor, relevant-reinspection, or verdict-stability policy changes
- review-boundary state updates, counters, persistence, and limit logic
- `scripts/run-review.ts` runtime, prompt, or telemetry changes

## Current Hypothesis

The next truthful seam is the pure command-intent helper family around `REVIEW_COMMAND_INTENT_DELEGATION_TOOL_LINE_RE`, `REVIEW_DIRECT_VALIDATION_RUNNERS`, `REVIEW_VALIDATION_SUITE_SCRIPT_TARGETS`, `classifyCommandIntentToolLine`, `classifyCommandIntentCommandLine`, `classifyCommandIntentSegment`, `isReviewOrchestrationCommand`, `isDirectValidationRunnerCommand`, `isPackageManagerValidationSuiteCommand`, `resolveValidationLauncherTarget`, `resolvePackageScriptInvocationTarget`, `resolveFirstBinaryLauncherTarget`, `binaryLauncherOptionConsumesValue`, `packageScriptOptionConsumesValue`, and `formatCommandIntentViolationLabel`.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npm run lint`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts`
- `npm run test`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
