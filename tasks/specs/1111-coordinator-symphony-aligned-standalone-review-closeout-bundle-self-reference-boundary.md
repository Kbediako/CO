---
id: 20260311-1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary
title: Coordinator Symphony-Aligned Standalone Review Closeout-Bundle Self-Reference Boundary
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md
related_tasks:
  - tasks/tasks-1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Closeout-Bundle Self-Reference Boundary

## Summary

Prevent bounded diff review from rereading the current closeout bundle, especially the active `09-review.log` and nearby generated artifacts, so review stops reopening the same task-local evidence loop after a valid inspection path has already been established.

## Scope

- Update `scripts/lib/review-execution-state.ts` so the current closeout bundle counts as a self-referential surface in bounded diff review.
- Cover both direct reads and search-driven active-closeout matches.
- Add focused coverage in `tests/review-execution-state.spec.ts`.
- Add runtime-facing coverage in `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and keep docs/task mirrors aligned.

## Out of Scope

- Direct shell-probe parity beyond the completed `1110` seam.
- Broad review-artifact policy redesign or native review replacement.
- Reopening the shell-probe stop condition itself.
- Broader Symphony controller extraction work.

## Notes

- 2026-03-11: Approved for docs-first registration based on the completed `1110` closeout, the explicit next-slice note, and a bounded `gpt-5.4` scout confirming that the smallest truthful residual gap is active closeout-bundle self-reference rather than more shell parsing. Evidence: `docs/findings/1111-standalone-review-closeout-bundle-self-reference-boundary-deliberation.md`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/00-summary.md`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/13-override-notes.md`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/14-next-slice-note.md`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/09-review.log`.
