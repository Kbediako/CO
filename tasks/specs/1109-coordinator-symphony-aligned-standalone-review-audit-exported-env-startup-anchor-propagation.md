---
id: 20260310-1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation
title: Coordinator Symphony-Aligned Standalone Review Audit Exported-Env Startup Anchor Propagation
status: completed
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation.md
related_tasks:
  - tasks/tasks-1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Audit Exported-Env Startup Anchor Propagation

## Summary

Teach standalone review audit-mode startup anchoring to preserve active evidence vars across sibling shell segments and exported child-shell flows, so valid evidence-first startup forms using `$MANIFEST`, `$RUNNER_LOG`, or `$RUN_LOG` are accepted without reopening general shell interpretation.

## Scope

- Update `scripts/lib/review-execution-state.ts` with bounded sibling/exported env propagation for active audit evidence vars.
- Add focused exported-env startup coverage in `tests/review-execution-state.spec.ts`.
- Add runtime-facing audit wrapper coverage in `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and keep docs/task mirrors aligned.

## Out of Scope

- General shell interpreter behavior.
- `scripts/run-review.ts` changes unless implementation proves they are required.
- Prompt retuning, scope rendering, or sustained meta-surface heuristic work.
- Product/controller extraction work.

## Notes

- 2026-03-10: Approved for docs-first registration based on the completed `1108` closeout, the explicit next-slice note, and a bounded `gpt-5.4` scout recommending exported-env sibling propagation as the smallest remaining audit startup asymmetry. Evidence: `docs/findings/1109-standalone-review-audit-exported-env-startup-anchor-propagation-deliberation.md`, `out/1108-coordinator-symphony-aligned-standalone-review-audit-startup-surface-boundary/manual/20260310T071421Z-closeout/14-next-slice-note.md`.
- 2026-03-10: Completed. Standalone review audit mode now preserves active evidence vars across executed sibling shell segments, models bashlike exported-env rebinding and `export -n` behavior without reopening a general shell interpreter, suppresses blocked-env raw fallback after `unset`, and keeps valid exported-env active-manifest startup forms accepted by the wrapper-facing path. Focused state regressions passed `68/68`, focused wrapper regressions passed `5/5`, the full suite passed `190/190` files and `1324/1324` tests, pack-smoke passed, and the final live review rerun is recorded as an explicit override after it fixed the bounded `export -n` issue but still failed to converge to a clean terminal verdict. Evidence: `out/1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation/manual/20260310T105152Z-closeout/00-summary.md`, `out/1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation/manual/20260310T105152Z-closeout/05-targeted-tests.log`, `out/1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation/manual/20260310T105152Z-closeout/05b-targeted-run-review.log`, `out/1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation/manual/20260310T105152Z-closeout/11-manual-exported-env-audit-check.json`, `out/1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation/manual/20260310T105152Z-closeout/12-elegance-review.md`, `out/1109-coordinator-symphony-aligned-standalone-review-audit-exported-env-startup-anchor-propagation/manual/20260310T105152Z-closeout/13-override-notes.md`.
