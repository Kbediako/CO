---
id: 20260315-1217-coordinator-symphony-aligned-standalone-review-execution-telemetry-surface-extraction
title: Coordinator Symphony-Aligned Standalone Review Execution Telemetry Surface Extraction
status: draft
owner: Codex
created: 2026-03-15
last_review: 2026-03-15
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-execution-telemetry-surface-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-execution-telemetry-surface-extraction.md
related_tasks:
  - tasks/tasks-1217-coordinator-symphony-aligned-standalone-review-execution-telemetry-surface-extraction.md
review_notes:
  - 2026-03-15: Post-`1216` scout confirms the next truthful standalone-review seam is the execution telemetry payload/persistence cluster still shared between `scripts/lib/review-execution-state.ts` and `scripts/run-review.ts`, not another `review-meta-surface-normalization.ts` split. Evidence: `docs/findings/1217-standalone-review-execution-telemetry-surface-extraction-deliberation.md`, `scripts/lib/review-execution-state.ts`, `scripts/run-review.ts`.
---

# Technical Specification

## Context

The standalone-review execution-state file still contains the deterministic telemetry payload/persistence family that shapes persisted telemetry, redacts payload fields, infers termination boundaries from failure text, and prints the stderr telemetry summary used by `scripts/run-review.ts`.

## Requirements

1. Extract the shared execution telemetry surface from `scripts/lib/review-execution-state.ts`.
2. Preserve telemetry payload schema, redaction behavior, persisted output-log path behavior, and termination-boundary inference for existing consumers.
3. Preserve stderr telemetry summary behavior for `scripts/run-review.ts`.
4. Keep live review-state accumulation, counters, drift/boundary policy, and command/meta-surface analyzers local to `review-execution-state`.
5. Keep the lane local to `review-execution-state`, `run-review`, and focused telemetry regressions.
6. Do not widen into command-intent, command-probe, meta-surface, startup-anchor, timeout, or prompt/runtime work outside the telemetry handoff.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npm run lint`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts tests/run-review.spec.ts`
- `npm run test`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
