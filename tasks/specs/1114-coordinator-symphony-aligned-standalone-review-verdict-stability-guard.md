---
id: 20260311-1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard
title: Coordinator Symphony-Aligned Standalone Review Verdict Stability Guard
status: completed
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md
related_tasks:
  - tasks/tasks-1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Verdict Stability Guard

## Summary

Add a bounded verdict-stability guard so standalone review terminates explicitly when speculative drift keeps repeating without introducing new diff-relevant progress signals.

## Scope

- Extend `scripts/lib/review-execution-state.ts` with a small no-progress / verdict-stability detector.
- Wire the new boundary into `scripts/run-review.ts`.
- Add focused state-level and runtime-facing coverage.
- Keep docs/task mirrors aligned.

## Out of Scope

- Another helper-family classification slice after `1113`.
- Native review replacement.
- Broad prompt-only review rewrites.
- Broader Symphony controller extraction work.

## Notes

- 2026-03-11: Approved for docs-first registration based on the completed `1113` closeout, the explicit next-slice note, and bounded scout guidance that the remaining truthful gap is verdict stability after speculative dwell, not another helper-family semantics patch. Evidence: `docs/findings/1114-standalone-review-verdict-stability-guard-deliberation.md`, `out/1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity/manual/20260311T050501Z-closeout/00-summary.md`, `out/1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity/manual/20260311T050501Z-closeout/09-review.log`, `out/1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity/manual/20260311T050501Z-closeout/13-override-notes.md`, `out/1113-coordinator-symphony-aligned-standalone-review-untouched-helper-classification-parity/manual/20260311T050501Z-closeout/14-next-slice-note.md`.
- 2026-03-11: Completed. Standalone review now adds a bounded verdict-stability guard for repeated file-targeted speculative dwell, preserves decay-window misses so sustained non-speculative progress ages the candidate out, and explicitly proves that inspected fixture file contents do not count as narrative drift. Focused verdict-stability regressions passed `4/4`, runtime-facing guard coverage passed `2/2`, the final full suite passed `190/190` files and `1360/1360` tests, docs guards and pack-smoke passed, and the remaining live `npm run review` issue is a broader generic speculative-dwell override rather than a file-read false positive or a new `1114` correctness defect. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/00-summary.md`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/05a-targeted-tests.log`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/05b-runtime-tests.log`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/06-test.log`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/10-review.log`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/11-pack-smoke.log`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/12-manual-verdict-stability-check.json`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/13-elegance-review.md`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/14-override-notes.md`.
