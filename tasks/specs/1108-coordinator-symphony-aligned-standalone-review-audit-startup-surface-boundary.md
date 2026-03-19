---
id: 20260310-1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary
title: Coordinator Symphony-Aligned Standalone Review Audit Startup-Surface Boundary
status: completed
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md
related_tasks:
  - tasks/tasks-1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Audit Startup-Surface Boundary

## Summary

Add an audit-mode startup-surface boundary so standalone review stays evidence-first in audit mode and rejects repeated pre-anchor reads of memory, skills, or review docs before it establishes a valid audit startup anchor.

## Scope

- Update `scripts/lib/review-execution-state.ts` with audit startup-anchor tracking.
- Update `scripts/run-review.ts` with audit startup guidance and runtime wiring.
- Add focused audit startup coverage in `tests/review-execution-state.spec.ts`.
- Add runtime-facing audit prompt/boundary coverage in `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and keep docs/task mirrors aligned.

## Out of Scope

- Native review-controller replacement.
- Diff-mode startup-boundary behavior.
- Low-signal or sustained meta-surface heuristic retuning.
- Broader audit evidence redesign.
- Product/controller extraction work.

## Notes

- 2026-03-10: Approved for docs-first registration based on the completed `1107` closeout, the explicit next-slice note, and a bounded `gpt-5.4` scout recommending audit startup anchoring as the smallest remaining review-reliability asymmetry. Evidence: `docs/findings/1108-standalone-review-audit-startup-surface-boundary-deliberation.md`, `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/14-next-slice-note.md`.
- 2026-03-10: Completed. Standalone review audit mode now requires real active manifest or runner-log startup evidence, accepts explicit detached active manifest anchors, rejects inline and shell-wrapped env rebinding away from active audit evidence, and no longer treats ordinary repo `manifest.json` files as `run-manifest` activity. Focused audit-startup regressions passed `127/127`, the full suite passed `190/190` files and `1298/1298` tests, pack-smoke passed, and the final live review rerun is recorded as an explicit override after it re-broadened into repeated whole-file/state reinspection instead of returning a bounded terminal verdict. Evidence: `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/00-summary.md`, `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/05-targeted-tests.log`, `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/11-manual-audit-startup-check.json`, `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/12-elegance-review.md`, `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/13-override-notes.md`.
