---
id: 20260311-1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint
title: Coordinator Symphony-Aligned Standalone Review Active Closeout-Root Provenance Hint
status: completed
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md
related_tasks:
  - tasks/tasks-1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Active Closeout-Root Provenance Hint

## Summary

Expose the already-resolved active closeout roots in the diff-mode review handoff so the reviewer does not need to rediscover that provenance before returning a bounded verdict.

## Scope

- Update `scripts/run-review.ts` so diff-mode handoff text includes an active closeout provenance note when roots are resolved.
- Reuse the existing root-resolution path, including delegated parent-task fallback and `TODO-closeout` plus latest completed closeout behavior.
- Add runtime-facing coverage in `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and keep docs/task mirrors aligned.

## Out of Scope

- Reopening direct active closeout-bundle rereads from `1111`.
- Generic helper/history drift policy.
- `scripts/lib/review-execution-state.ts` classification changes unless a tiny helper extraction is unavoidable.
- Broader Symphony controller extraction work.

## Notes

- 2026-03-11: Approved for docs-first registration based on the completed `1111` closeout, the explicit next-slice note, and a bounded `gpt-5.4` scout confirming that the smallest truthful residual gap is an active closeout-root provenance hint rather than another runtime boundary rewrite. Evidence: `docs/findings/1112-standalone-review-active-closeout-root-provenance-hint-deliberation.md`, `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/20260311T040131Z-closeout/00-summary.md`, `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/20260311T040131Z-closeout/13-override-notes.md`, `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/20260311T040131Z-closeout/14-next-slice-note.md`, `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/20260311T040131Z-closeout/09-review.log`.
- 2026-03-11: Completed. Diff-mode review handoff now surfaces already-resolved active closeout roots using the existing runtime resolver path, including delegated parent-task inheritance and `TODO-closeout` plus latest completed closeout handling, and frames those roots as self-referential surfaces that do not need to be re-derived. Focused provenance regressions passed `4/4`; the final full suite passed `190/190` files and `1347/1347` tests; docs guards and pack-smoke passed; and the final manifest-backed review converged with no findings. Evidence: `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/00-summary.md`, `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/05a-targeted-tests.log`, `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/05-test.log`, `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/09-review.log`, `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/11-manual-active-closeout-root-provenance-hint-check.json`, `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/12-elegance-review.md`, `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/13-override-notes.md`.
