---
id: 20260311-1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition
title: Coordinator Symphony-Aligned Standalone Review Shell-Probe Stop Condition
status: completed
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md
related_tasks:
  - tasks/tasks-1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Shell-Probe Stop Condition

## Summary

Add a bounded shell-probe stop condition so standalone review can tolerate one direct external shell verification command when needed, but terminates deterministically when repeated shell probes indicate speculative drift.

## Scope

- Update `scripts/lib/review-execution-state.ts` with narrow shell-probe classification and repeated-probe boundary tracking.
- Update `scripts/run-review.ts` to terminate on the new boundary.
- Add focused coverage in `tests/review-execution-state.spec.ts`.
- Add runtime-facing coverage in `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and keep docs/task mirrors aligned.

## Out of Scope

- Natural-language finding extraction.
- Broad command-policy redesign or native review replacement.
- Reopening exported-env startup parsing from `1109`.
- Broader Symphony controller extraction work.

## Notes

- 2026-03-11: Approved for docs-first registration based on the completed `1109` closeout, the explicit next-slice note, and a bounded scout recommending repeated shell-probe termination as the smallest remaining review-reliability seam. Evidence: `docs/findings/1110-standalone-review-shell-probe-stop-condition-deliberation.md`, `out/1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation/manual/20260310T105152Z-closeout/14-next-slice-note.md`, `out/1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation/manual/20260310T105152Z-closeout/13-override-notes.md`.
- 2026-03-11: Completed. Standalone review now treats repeated external shell-probe verification as a bounded stop condition while preserving ordinary shell-wrapped inspection and active audit startup-anchor reads. Mixed probe-plus-read commands still count as shell probes, nested shell payload probes recurse correctly, file-targeted `grep` remains non-probe inspection, and total shell-probe telemetry now records beyond the retained sample window. Focused state regressions, full wrapper regressions, docs guards, and pack-smoke all passed; the final live manifest-backed review rerun is recorded as an explicit override after it still drifted into self-referential review-log and whole-file rereads instead of returning a bounded terminal verdict. Evidence: `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/00-summary.md`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/05a-review-execution-state.log`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/05b-run-review.log`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/05c-shell-probe-subset.log`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/11-manual-shell-probe-check.json`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/12-elegance-review.md`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/13-override-notes.md`.
