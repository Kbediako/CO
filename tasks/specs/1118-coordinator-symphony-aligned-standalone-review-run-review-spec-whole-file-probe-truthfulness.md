---
id: 20260311-1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness
title: Coordinator Symphony-Aligned Standalone Review Run-Review Spec Whole-File Probe Truthfulness
status: completed
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md
related_tasks:
  - tasks/tasks-1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Run-Review Spec Whole-File Probe Truthfulness

## Summary

Correct the stale “whole-file determinism residual” claim around `tests/run-review.spec.ts` by recording current reporter-aware terminal evidence and updating task/docs mirrors accordingly.

## Scope

- Record current successful whole-file runs for `tests/run-review.spec.ts` under the default and verbose reporters.
- Update task/docs mirrors to remove stale non-determinism claims.
- Keep the slice docs/evidence only unless fresh reporter-aware evidence reproduces a real defect.

## Out of Scope

- Changes to `tests/run-review.spec.ts`.
- Product-runtime changes in `scripts/run-review.ts` or `scripts/lib/review-execution-state.ts`.
- Tail splitting or helper extraction work.
- Broader prompt or wrapper redesign.

## Notes

- 2026-03-11: Revised before implementation. Current-tree reruns show `tests/run-review.spec.ts` terminates successfully under both the default and verbose reporters, so the earlier tail-split premise was stale. `1118` is now a validation-truthfulness/docs-correction lane that supersedes the old non-determinism claim and keeps code out of scope unless reporter-aware reruns reproduce a real defect. Evidence: `docs/findings/1118-standalone-review-run-review-spec-whole-file-probe-truthfulness-deliberation.md`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05d-whole-file-probe.log`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/05a-default-whole-file.log`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/05b-verbose-whole-file.log`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/05-test.log`.
- 2026-03-11: Completed. `1118` closed as a docs/evidence correction lane after current-tree runs proved the earlier whole-file non-determinism premise was stale: the default reporter whole-file run passed `101/101`, the verbose reporter whole-file run passed `101/101`, and `npm run test` passed `190/190` files and `1366/1366` tests. The task/docs mirrors now treat the `1117` startup-banner-only probe as non-diagnostic and keep code out of scope. Evidence: `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/00-summary.md`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/05a-default-whole-file.log`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/05b-verbose-whole-file.log`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/05-test.log`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/11-manual-whole-file-probe-check.json`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/12-elegance-review.md`.
