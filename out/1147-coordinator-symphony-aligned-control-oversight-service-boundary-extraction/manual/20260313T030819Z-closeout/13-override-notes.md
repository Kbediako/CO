# 1147 Override Notes

## diff-budget stacked-branch override

- Reason: `1147` is a bounded control-oversight facade extraction on a long-lived stacked Symphony-alignment branch, so branch-vs-`origin/main` scope is much larger than the lane-local diff.
- Evidence: `08-diff-budget.log`

## Full-suite quiet-tail override

- Reason: the final-tree `npm run test` lane made visible progress through `tests/cli-orchestrator.spec.ts` and `tests/run-review.spec.ts`, then entered the recurring no-output quiet tail with the nested Vitest process effectively idle. The lane was terminated honestly and replaced with focused final-tree regressions for the touched seam.
- Evidence: `05-test.log`, `05b-targeted-tests.log`

## Initial review invocation note

- The first `npm run review` attempt stopped at `diff-budget` only because the stacked-branch override environment was omitted. The final rerun included the explicit override and returned no findings.
- Evidence: `08-diff-budget.log`, `09-review.log`
