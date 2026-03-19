---
id: 20260311-1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation
title: Coordinator Symphony-Aligned Standalone Review Run-Review Spec Harness Env Isolation
status: completed
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md
related_tasks:
  - tasks/tasks-1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Run-Review Spec Harness Env Isolation

## Summary

Make `tests/run-review.spec.ts` less sensitive to ambient fake-Codex env leakage by tightening the shared harness env builder rather than reopening product logic.

## Scope

- Tighten `baseEnv()` or the equivalent shared harness env assembly in `tests/run-review.spec.ts`.
- Add focused regression coverage proving ambient fake-Codex env knobs no longer mutate unrelated baseline tests.
- Keep docs/task mirrors aligned.

## Out of Scope

- Product-runtime changes in `scripts/run-review.ts`.
- Reopening `1116` prompt wording.
- Broad file splitting unless env isolation proves insufficient.
- Native review replacement.

## Notes

- 2026-03-11: Approved for docs-first registration based on the completed `1116` closeout and the bounded scout evidence showing that `tests/run-review.spec.ts` inherits ambient fake-Codex env knobs through `baseEnv()`, which can flip unrelated baseline cases red without proving another product-runtime defect. Evidence: `docs/findings/1117-standalone-review-run-review-spec-harness-env-isolation-deliberation.md`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/00-summary.md`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/13-override-notes.md`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/14-next-slice-note.md`.
- 2026-03-11: Completed. `tests/run-review.spec.ts` now scrubs inherited `RUN_REVIEW_*` variables inside `baseEnv()`, a focused regression proves ambient `RUN_REVIEW_MODE=delete-after-help` no longer flips the bounded prompt baseline, and the bounded review completed with no findings on the touched harness seam. The remaining explicit residual is broader `run-review.spec.ts` whole-file determinism: the whole-file probe still stalls after startup-only output, and `npm run test` again hit the known quiet-tail after the large CLI suite, so those remain honest overrides rather than claimed green broad test passes. Evidence: `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/00-summary.md`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05a-ambient-mode-baseline.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05b-env-isolation-regression.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05c-bounded-prompt-baseline.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05d-whole-file-probe.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/05-test.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/09-review.log`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/11-manual-harness-env-isolation-check.json`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/12-elegance-review.md`, `out/1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation/manual/20260311T105727Z-closeout/13-override-notes.md`.
