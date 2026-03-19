---
id: 20260315-1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction
title: Coordinator Symphony-Aligned Standalone Review Meta-Surface Boundary Analysis Extraction
status: completed
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md
related_tasks:
  - tasks/tasks-1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction.md
review_notes:
  - 2026-03-15: Local read-only reassessment after `1215` confirms the next truthful standalone-review seam is the deterministic meta-surface/startup-anchor interpreter cluster still local to `scripts/lib/review-execution-state.ts`. Evidence: `docs/findings/1216-standalone-review-meta-surface-boundary-analysis-extraction-deliberation.md`, `scripts/lib/review-execution-state.ts`.
  - 2026-03-15: Closeout completed. The shared analyzer seam now lives in `scripts/lib/review-meta-surface-boundary-analysis.ts`, the reverse touched-family regression surfaced by the first bounded review was fixed in `scripts/lib/review-meta-surface-normalization.ts`, the dead `allowedMetaSurfaceEnvVars` contract was removed from `ReviewExecutionState` and `run-review`, and final validation was green through targeted regressions, full `npm run test`, bounded review, and `pack:smoke`. Evidence: `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/20260315T111625Z-closeout/00-summary.md`, `out/1216-coordinator-symphony-aligned-standalone-review-meta-surface-boundary-analysis-extraction/manual/20260315T111625Z-closeout/13-override-notes.md`.
---

# Technical Specification

## Context

The standalone-review execution-state file still contains a deterministic meta-surface/startup-anchor interpreter cluster that is reused by review command and output analysis but not yet owned by its own helper boundary.

## Requirements

1. Extract the shared meta-surface/startup-anchor analyzer seam from `scripts/lib/review-execution-state.ts`.
2. Preserve meta-surface tool, command, and output classification behavior for existing consumers.
3. Preserve startup-anchor progress analysis, touched-path anchor detection, audit env rebinding detection, and active closeout reread behavior for existing consumers.
4. Preserve the extracted helper family's `review-support` and touched-family behavior in `scripts/lib/review-meta-surface-normalization.ts`.
5. Keep the lane local to `review-execution-state` plus focused meta-surface/startup-anchor regressions.
6. Do not widen into review-boundary state updates, counters, persistence, timeout logic, or `run-review` runtime work.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npm run lint`
- `npx vitest run --config vitest.config.core.ts tests/review-meta-surface-boundary-analysis.spec.ts tests/review-meta-surface-normalization.spec.ts tests/review-execution-state.spec.ts tests/run-review.spec.ts`
- `npm run review`
- `npm run pack:smoke`
