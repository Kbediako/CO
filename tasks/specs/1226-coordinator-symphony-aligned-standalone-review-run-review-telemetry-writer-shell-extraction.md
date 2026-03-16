---
id: 20260316-1226-coordinator-symphony-aligned-standalone-review-run-review-telemetry-writer-shell-extraction
title: Coordinator Symphony-Aligned Standalone Review Run-Review Telemetry Writer Shell Extraction
status: draft
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
