# 1226 Override Notes

## Diff Budget

- `node scripts/diff-budget.mjs` ran with `DIFF_BUDGET_OVERRIDE_REASON="1226 closeout runs on a long-lived stacked branch; current diff budget signal is not lane-local."`

## Docs-Review

- Registration-time `docs-review` remains an explicit docs-first override for this lane. Deterministic docs gates were run and recorded in the docs-first packet instead of claiming a manifest-backed docs-review verdict.

## Diagnostics Side Runs

- The initial `00a` and `00b` diagnostics subruns created the required manifest evidence and cleared delegation guard/build/lint, but both stalled inside their own `npm run test` stages with stale heartbeats. They were treated as non-authoritative side evidence, and the authoritative validation for closeout is the local `05-test.log` plus the remaining closeout logs in this packet.
