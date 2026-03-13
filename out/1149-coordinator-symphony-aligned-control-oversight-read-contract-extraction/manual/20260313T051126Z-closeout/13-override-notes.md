# 1149 Override Notes

## `npm run test`

- Outcome: explicit override
- Reason: the full suite again reached the recurring quiet-tail after visible progress through `tests/cli-orchestrator.spec.ts` and did not return a clean terminal summary in reasonable time.
- Evidence: `05-test.log`, `05b-targeted-tests.log`

## `node scripts/diff-budget.mjs`

- Outcome: explicit stacked-branch override accepted
- Reason: branch-wide diff statistics against `origin/main` obscure the bounded `1149` oversight read-contract slice.
- Evidence: `08-diff-budget.log`
