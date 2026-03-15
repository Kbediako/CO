# 1221 Override Notes

## Docs-first registration override

- The docs-first `docs-review` run for `1221` stopped at `Run delegation guard` instead of reaching a diff-local docs verdict.
- That explicit registration-time override remains recorded in `out/1221-coordinator-symphony-aligned-standalone-review-execution-runtime-shell-extraction/manual/20260315T213403Z-docs-first/05-docs-review-override.md`.

## Diff-budget override

- `node scripts/diff-budget.mjs` exceeded the repo-wide stacked-branch budget (`1883` changed files, `153681` total changed lines against `origin/main`).
- The lane used the explicit override:
  - `DIFF_BUDGET_OVERRIDE_REASON="1221 runs on a long-lived stacked branch; task-local diff remains bounded to run-review execution runtime extraction and review-support parity updates."`
