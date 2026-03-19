# 1126 Override Notes

## Diff-budget override

- `node scripts/diff-budget.mjs` ran with `DIFF_BUDGET_OVERRIDE_REASON='stacked branch baseline for long-lived symphony alignment lane'`.
- Reason: the branch carries a long stacked baseline that would otherwise swamp the bounded lane diff.

## Review runtime note

- The forced bounded review eventually returned a no-findings verdict, but it spent several minutes re-inspecting nearby Telegram bridge tests before converging.
- This is recorded as a runtime observation for the review-reliability track, not a correctness blocker for `1126`.
