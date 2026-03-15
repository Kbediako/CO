# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Meta-Surface Boundary Analysis Extraction

## Problem Statement

After `1215`, the next deterministic helper cluster still inline in `scripts/lib/review-execution-state.ts` is the meta-surface boundary analysis family that classifies tool, command, and output lines, walks nested shell-control segments, and reports startup-anchor progress before stateful review policy is applied.

## Scope

- extract the meta-surface/startup-anchor interpreter cluster from `scripts/lib/review-execution-state.ts`
- preserve meta-surface tool-line classification, shell-segment classification, output-line closeout detection, startup-anchor progress analysis, audit env rebinding detection, and touched-path anchor detection
- preserve the extracted helper family's `review-support` and touched-family behavior in `scripts/lib/review-meta-surface-normalization.ts`
- keep stateful review-boundary policy ownership local to `review-execution-state`
- add only the focused regressions needed to pin preserved meta-surface and startup-anchor behavior

## Out of Scope

- command-probe and command-intent classification already extracted in `1214` and `1215`
- shell-env interpreter ownership and command parser primitives already extracted in `1209` through `1211`
- review-boundary counters, startup-budget policy, persistence, timeout handling, and telemetry changes
- `scripts/run-review.ts` runtime, prompt, or artifact changes

## Current Hypothesis

The next truthful seam is the pure meta-surface analyzer family around `classifyMetaSurfaceToolLine`, `classifyMetaSurfaceCommandLine`, `classifyMetaSurfaceOutputLine`, `analyzeStartupAnchorBoundaryProgress`, `classifyMetaSurfaceSegment`, `isDiffScopeAnchorCommand`, `gitDiffArgsAreScopeOnly`, `extractGitDiffPathspecs`, `detectAuditEnvRebindingMetaSurface`, `analyzeStartupAnchorBoundarySegment`, `segmentDirectHasTouchedPathAnchor`, `classifyMetaSurfaceDirect`, and `isAllowedAuditMetaSurfaceSample`.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npm run lint`
- `npx vitest run --config vitest.config.core.ts tests/review-meta-surface-boundary-analysis.spec.ts tests/review-meta-surface-normalization.spec.ts tests/review-execution-state.spec.ts tests/run-review.spec.ts`
- `npm run test`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
