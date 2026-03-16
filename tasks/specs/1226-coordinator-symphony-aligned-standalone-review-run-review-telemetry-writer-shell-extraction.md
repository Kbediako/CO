---
id: 20260316-1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction
title: Coordinator Symphony-Aligned Standalone Review Run-Review Telemetry Writer Shell Extraction
status: closed
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md
related_tasks:
  - tasks/tasks-1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction.md
review_notes:
  - 2026-03-16: Post-1225 local inspection and parallel read-only scout evidence narrowed the remaining `run-review.ts` surface to one truthful implementation seam: the inline telemetry writer callback. The sibling `runReview` adapter remains orchestration glue and is explicitly out of scope. Evidence: `docs/findings/1226-standalone-review-run-review-telemetry-writer-shell-extraction-deliberation.md`, `out/1225-coordinator-symphony-aligned-standalone-review-run-review-non-interactive-handoff-shell-extraction/manual/20260316T041152Z-closeout/14-next-slice-note.md`.
  - 2026-03-16: Deterministic docs-first registration completed; `spec-guard --dry-run`, `docs:check`, and `docs:freshness` passed, and the explicit docs-review override is recorded in the docs-first packet. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T045047Z-docs-first/00-summary.md`, `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T045047Z-docs-first/05-docs-review-override.md`.
  - 2026-03-16: Closed with the shipped helper in `scripts/lib/review-execution-telemetry.ts`, focused telemetry/run-review regressions green, full suite `246/246` files and `1726/1726` tests, forced bounded review no findings, and `pack:smoke` green. Evidence: `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/00-summary.md`, `out/1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction/manual/20260316T050223Z-closeout/09-review.log`.
---

# Technical Specification

## Context

After `1225`, `scripts/run-review.ts` still owns an inline telemetry-writer callback even though telemetry payload assembly and persistence primitives already live in `scripts/lib/review-execution-state.ts` and `scripts/lib/review-execution-telemetry.ts`.

## Requirements

1. Extract the telemetry-writer callback behavior from `scripts/run-review.ts`.
2. Reuse `ReviewExecutionState.buildTelemetryPayload(...)` as the canonical payload builder.
3. Preserve persistence-failure logging as a non-fatal wrapper path.
4. Keep the sibling `runReview` callback inline in `scripts/run-review.ts`.
5. Add focused regression coverage for the moved telemetry-writer behavior.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- focused telemetry/run-review regressions
- `node scripts/delegation-guard.mjs --task 1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction`
- `npm run build`
- `npm run lint`
- `npm run test`
- `node scripts/diff-budget.mjs`
- `npm run review -- --manifest <manifest>`
- `npm run pack:smoke`
