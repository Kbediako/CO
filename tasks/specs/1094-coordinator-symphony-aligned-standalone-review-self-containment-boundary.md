---
id: 20260310-1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary
title: Coordinator Symphony-Aligned Standalone Review Self-Containment Boundary
status: completed
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md
related_tasks:
  - tasks/tasks-1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Self-Containment Boundary

## Summary

Teach default `diff`-mode standalone review to treat adjacent review-system surfaces as off-task so live wrapper review stops broadening into its own artifact/docs/helpers after the `1093` diff/audit split.

## Scope

- Extend review-system-adjacent surface classification in the standalone review runtime.
- Add a sustained diff-mode self-containment boundary.
- Add regression coverage for drift into review docs, review artifacts, and pack-smoke helpers.
- Update operator docs for the new boundary.

## Out of Scope

- Replacing the wrapper with a native review controller.
- Reopening the `1093` `diff` vs `audit` surface split.
- Resuming Symphony controller extraction in the same slice.

## Notes

- 2026-03-10: Approved for docs-first registration based on post-`1093` live review evidence plus a bounded `gpt-5.4` slice-shaping pass. Evidence: `docs/findings/1094-standalone-review-self-containment-boundary-deliberation.md`.
- 2026-03-10: Completed. Default `diff` review now treats adjacent review docs, review artifacts, and review-support helpers as off-task unless the diff explicitly touches them; uncommitted touched-path parsing now uses porcelain-z normalization; focused final-tree regressions passed (`28/28`, `4/4` with `65` skipped), pack-smoke passed, and the remaining live-review drift is recorded honestly for the audit-parity follow-on. Evidence: `out/1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary/manual/20260309T170748Z-closeout/00-summary.md`, `out/1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary/manual/20260309T170748Z-closeout/05-targeted-unit-tests.log`, `out/1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary/manual/20260309T170748Z-closeout/05b-targeted-run-review-tests.log`, `out/1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary/manual/20260309T170748Z-closeout/10-pack-smoke.log`, `out/1094-coordinator-symphony-aligned-standalone-review-self-containment-boundary/manual/20260309T170748Z-closeout/13-override-notes.md`.
