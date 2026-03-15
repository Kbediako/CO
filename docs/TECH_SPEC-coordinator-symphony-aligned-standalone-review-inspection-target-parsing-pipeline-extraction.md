# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Inspection Target Parsing Pipeline Extraction

## Problem Statement

After the `1212` normalization extraction, the next deterministic helper cluster left inline in `scripts/lib/review-execution-state.ts` is the inspection-target parsing pipeline used to derive touched and generic inspection targets from command and narrative text.

## Scope

- extract the inspection-target parsing cluster from `scripts/lib/review-execution-state.ts`
- preserve backslash normalization, `./` stripping, nested shell payload handling, touched-path prioritization, and generic file-target fallback behavior
- keep stateful review-boundary policy ownership local to `review-execution-state`
- add only the focused regressions needed to pin preserved parsing behavior

## Out of Scope

- operand/path normalization helpers already extracted in `1212`
- command-intent, shell-probe, startup-anchor, relevant-reinspection, or verdict-stability policy changes
- shell-env traversal/state interpretation changes
- `scripts/run-review.ts` runtime or prompt/telemetry changes

## Current Hypothesis

The next truthful seam is the four-function parsing cluster around `extractInspectionTargets`, `extractParsedInspectionTargets`, `collectParsedInspectionTargetsFromSegment`, and `resolveTouchedInspectionTarget`. That cluster is deterministic enough for its own helper boundary, while the surrounding stateful analyzers still belong in `review-execution-state`.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-inspection-target-parsing.spec.ts tests/review-meta-surface-normalization.spec.ts tests/review-execution-state.spec.ts`
- `npm run review`
- `npm run pack:smoke`
