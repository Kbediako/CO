---
id: 20260310-1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary
title: Coordinator Symphony-Aligned Standalone Review Canonical Scope-Summary Boundary
status: active
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md
related_tasks:
  - tasks/tasks-1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Canonical Scope-Summary Boundary

## Summary

Narrow prompt-side scope summaries in `scripts/run-review.ts` so standalone review keeps changed-file identity without broad branch-history framing.

## Scope

- Update prompt-side scope-summary assembly in `scripts/run-review.ts`.
- Preserve the audit task-context boundary completed in `1097`.
- Retarget focused prompt-shape tests in `tests/run-review.spec.ts`.
- Keep docs/task mirrors aligned with the new scope-summary contract.

## Out of Scope

- Wrapper replacement or native review controller work.
- Changes to `review-execution-state.ts`.
- Changes to audit evidence surfaces.
- The next `controlServer.ts` product seam.

## Notes

- 2026-03-10: Approved for docs-first registration based on the `1097` closeout evidence showing that audit task context is now bounded, while the remaining live review drift still leans on prompt-side scope/history framing rather than runtime/meta-surface classification. Evidence: `docs/findings/1098-standalone-review-canonical-scope-summary-boundary-deliberation.md`, `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/14-next-slice-note.md`.
