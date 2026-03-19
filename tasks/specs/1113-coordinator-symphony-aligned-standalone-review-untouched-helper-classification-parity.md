---
id: 20260311-1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity
title: Coordinator Symphony-Aligned Standalone Review Untouched Helper Classification Parity
status: completed
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity.md
related_tasks:
  - tasks/tasks-1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Untouched Helper Classification Parity

## Summary

Extend bounded standalone review so untouched adjacent review-owned helper files that only support review classification or path handling are treated with the same review-support parity as the existing `run-review` / `review-execution-state` support surfaces.

## Scope

- Update `scripts/lib/review-execution-state.ts` classification for the smallest relevant untouched helper set.
- Add focused coverage in `tests/review-execution-state.spec.ts`.
- Add runtime-facing coverage in `tests/run-review.spec.ts` only if needed to prove touched-helper preservation or bounded review behavior.
- Keep docs/task mirrors aligned.

## Out of Scope

- Another active closeout provenance prompt rewrite after `1112`.
- Broad helper-history policy redesign or native review replacement.
- Reopening active closeout-bundle policy from `1111`.
- Broader Symphony controller extraction work.

## Notes

- 2026-03-11: Approved for docs-first registration based on the completed `1112` closeout, the explicit next-slice note, and bounded scout evidence showing that the remaining residual drift is untouched adjacent helper exploration after the closeout provenance hint is already present. Evidence: `docs/findings/1113-standalone-review-untouched-helper-classification-parity-deliberation.md`, `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/00-summary.md`, `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/09-review.log`, `out/1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint/manual/20260311T044021Z-closeout/14-next-slice-note.md`, `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/20260311T040131Z-closeout/14-next-slice-note.md`.
- 2026-03-11: Completed. Standalone review now narrows review-support parity to the explicit review-owned `review-scope-paths` family, keeps shared `docs-helpers` reads ordinary, preserves touched sibling reads inside ordinary diff scope, and aligns startup-anchor handling with that sibling-family behavior. Focused regressions passed `33/33`; the final full suite passed `190/190` files and `1354/1354` tests; docs guards and pack-smoke passed; and the remaining live `npm run review` issue is a speculative dwell override rather than another `1113` correctness defect. Evidence: `out/1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity/manual/20260311T050501Z-closeout/00-summary.md`, `out/1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity/manual/20260311T050501Z-closeout/05a-targeted-tests.log`, `out/1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity/manual/20260311T050501Z-closeout/05-test.log`, `out/1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity/manual/20260311T050501Z-closeout/09-review.log`, `out/1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity/manual/20260311T050501Z-closeout/11-manual-untouched-helper-classification-check.json`, `out/1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity/manual/20260311T050501Z-closeout/12-elegance-review.md`, `out/1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity/manual/20260311T050501Z-closeout/13-override-notes.md`.
