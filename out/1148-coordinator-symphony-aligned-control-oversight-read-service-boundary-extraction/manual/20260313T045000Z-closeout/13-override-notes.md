# 1148 Override Notes

## `npm run test`

- Outcome: explicit override
- Reason: the full suite reached the recurring quiet-tail after visible progress through `tests/cli-orchestrator.spec.ts` and did not return a clean terminal summary in reasonable time.
- Evidence: `05-test.log`, `05b-targeted-tests.log`

## `npm run review`

- Outcome: explicit override
- Reason: the first bounded review pass surfaced one real stale-doc issue, which was fixed (`docs/TECH_SPEC-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md` no longer names the deleted `controlTelegramReadAdapter.ts` path), but the rerun broadened into wider docs/package speculation without surfacing an additional diff-local defect.
- Evidence: `09-review.log`, `06-docs-check.log`

## `node scripts/diff-budget.mjs`

- Outcome: explicit stacked-branch override accepted
- Reason: branch-wide diff statistics against `origin/main` obscure the bounded `1148` read-service seam.
- Evidence: `08-diff-budget.log`
