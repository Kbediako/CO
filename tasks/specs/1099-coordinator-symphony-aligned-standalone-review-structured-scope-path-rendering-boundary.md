---
id: 20260310-1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary
title: Coordinator Symphony-Aligned Standalone Review Structured Scope-Path Rendering Boundary
status: active
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md
related_tasks:
  - tasks/tasks-1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Structured Scope-Path Rendering Boundary

## Summary

Refine standalone review prompt-side scope rendering so paired and unusual path surfaces remain path-only, bounded, and easier for reviewers to interpret without speculative helper reinspection.

## Scope

- Update prompt-side scope rendering in `scripts/run-review.ts`.
- Extend nearby path parsing/rendering only as needed in `scripts/lib/review-scope-paths.ts`.
- Add focused coverage in `tests/run-review.spec.ts` and `tests/review-scope-paths.spec.ts`.
- Keep docs/task mirrors aligned with the refined rendering contract.

## Out of Scope

- Wrapper replacement or native review controller work.
- `review-execution-state.ts` changes.
- Audit evidence/task-context changes.
- Product/controller extraction work in `controlServer.ts`.

## Notes

- 2026-03-10: Approved for docs-first registration based on the `1098` closeout evidence showing that historical branch/task drift is now removed, while the remaining live-review behavior still over-inspects paired-path relationship and unusual-path rendering instead of concluding on the bounded diff. Evidence: `docs/findings/1099-standalone-review-structured-scope-path-rendering-boundary-deliberation.md`, `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/14-next-slice-note.md`.
