# 1224 Override Notes

## Docs-first registration override

- The docs-first `docs-review` run for `1224` stopped at `Run delegation guard` instead of reaching a diff-local docs verdict.
- That explicit registration-time override remains recorded in `out/1224-coordinator-symphony-aligned-standalone-review-run-review-execution-boundary-preflight-shell-extraction/manual/20260316T021253Z-docs-first/05-docs-review-override.md`.

## Diff-budget override

- `node scripts/diff-budget.mjs` exceeded the repo-wide stacked-branch budget against `origin/main`.
- The lane used the explicit override:
  - `DIFF_BUDGET_OVERRIDE_REASON="stacked branch history exceeds diff budget; 1224 local lane remains bounded to run-review execution-boundary preflight extraction and review-support parity"`

## Final bounded-review override

- The first bounded review produced concrete P2 parity defects, and the shipped tree fixed them.
- Later reruns no longer surfaced another concrete diff-local finding; instead, the wrapper drifted into speculative source-host/package-path reasoning around `ts-node/esm` and source `.js` hosts.
- The closeout records that final state as review-wrapper drift rather than claiming a false clean approval.
