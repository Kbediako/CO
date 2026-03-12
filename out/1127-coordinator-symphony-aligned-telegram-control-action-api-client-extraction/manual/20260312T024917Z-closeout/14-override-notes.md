# 1127 Override Notes

- `node scripts/diff-budget.mjs` required the explicit stacked-branch override because `main` is carrying the long-lived Symphony-alignment stack. Override used: `Stacked main branch; 1127 is being validated through bounded review plus focused and full test evidence.`
- No review-result override was required. The bounded review eventually converged to a no-findings verdict, but the residual tendency to inspect adjacent context is being carried forward into the next review-reliability slice instead of being treated as a `1127` blocker.
