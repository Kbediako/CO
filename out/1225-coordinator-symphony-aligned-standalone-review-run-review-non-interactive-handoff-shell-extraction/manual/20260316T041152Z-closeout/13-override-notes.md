# 1225 Override Notes

## Docs-first registration override

- The docs-first `docs-review` run for `1225` stopped at `Run delegation guard` instead of reaching a diff-local docs verdict.
- That explicit registration-time override remains recorded in `out/1225-coordinator-symphony-aligned-standalone-review-run-review-non-interactive-handoff-shell-extraction/manual/20260316T032526Z-docs-first/05-docs-review-override.md`.

## Diff-budget override

- `node scripts/diff-budget.mjs` exceeded the repo-wide stacked-branch budget against `origin/main`.
- The lane used the explicit override:
  - `DIFF_BUDGET_OVERRIDE_REASON="1225 closeout runs on a long-lived stacked branch; current diff budget signal is not lane-local."`

## Spec-guard dry-run note

- `node scripts/spec-guard.mjs --dry-run` completed successfully for the lane but reported repo-global stale-spec warnings outside `1225`.
- Those warnings are not introduced by this lane and remain recorded in `02-spec-guard.log`.
