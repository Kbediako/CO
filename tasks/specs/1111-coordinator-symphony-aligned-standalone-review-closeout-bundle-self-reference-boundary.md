---
id: 20260311-1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary
title: Coordinator Symphony-Aligned Standalone Review Closeout-Bundle Self-Reference Boundary
status: completed
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
- 2026-03-11: Completed. Bounded standalone review now treats the active task closeout bundle as a self-referential meta-surface through both direct reads and repo-wide search-result lines, resolves delegated/prefixed task ids back to the canonical parent task before selecting active closeout roots, and parses Windows-style absolute `path:line:` search output correctly. Focused closeout regressions passed `7/7`; the final full suite passed `190/190` files and `1344/1344` tests; docs guards and pack-smoke passed; and the final live manifest-backed review rerun is recorded as an explicit override after it still drifted into helper/history exploration instead of returning a bounded verdict. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/20260311T040131Z-closeout/00-summary.md`, `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/20260311T040131Z-closeout/05a-closeout-targeted.log`, `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/20260311T040131Z-closeout/05-test.log`, `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/20260311T040131Z-closeout/11-manual-closeout-self-reference-check.json`, `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/20260311T040131Z-closeout/12-elegance-review.md`, `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/20260311T040131Z-closeout/13-override-notes.md`.
