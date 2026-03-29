# CO-33 Manual Review Fallback

Date: 2026-03-28
Issue: `CO-33` / `9b2a195b-4603-4ed4-98c6-20eff87049e4`

## Why fallback was used

- The first `npm run review` pass surfaced one concrete regression in the intermediate diff: the new run-scoped cache left `delete-workpad` stale, which could make the next upsert noop or target a deleted comment.
- That regression was fixed and covered with a focused recreate-after-delete test.
- The final rerun of `npm run review` did not converge on a terminal verdict within a bounded window and drifted into speculative cache scenarios without producing a new concrete blocker.
- Per the repo review guidance, the lane switched to a manual final correctness and elegance pass instead of stalling handoff.

## Manual correctness pass

Reviewed paths:

- `orchestrator/src/cli/control/linearGraphqlClient.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/tests/LinearGraphqlClient.test.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`

Confirmed behaviors:

1. Non-2xx Linear GraphQL responses now preserve JSON `errors` payloads and rate-limit headers instead of collapsing immediately into `request_failed`.
2. Provider-worker `issue-context` success now seeds a run-scoped cache derived from the existing audit path, which is only consulted for the same issue id and source binding.
3. `transition` reuses cached team/state data when available and falls back to the lighter `issue-summary` read when not.
4. `upsert-workpad` reuses cached issue context, preserves the single-workpad contract, and updates the cache on create/update/noop.
5. `delete-workpad` now invalidates the cached workpad selection so the next upsert recreates a fresh comment instead of reusing stale state.
6. Focused tests cover:
   - non-2xx GraphQL error parsing
   - explicit `linear_rate_limited` metadata
   - cached reuse for workpad upserts
   - cached reuse for transitions
   - delete-then-recreate workpad behavior

## Residual risk assessment

- Residual risk kept:
  run-scoped caching does not re-read Linear between every operation, so an external actor could theoretically change issue scope or comment state between commands.
- Why this was accepted for this lane:
  the cache is deliberately scoped to the same issue id plus source binding, the primary bug was redundant same-attempt reads exhausting the request budget, and the focused live requirement is to keep the active provider-worker lane truthful without paying that extra read cost.
- Expected behavior under stale external changes:
  writes still target the same issue id; if stale state ids no longer apply, Linear should reject the mutation rather than silently mutate a different issue.

## Elegance / minimality pass

- Kept:
  small local helpers for reading relevant headers, reading/writing the run-scoped cache, summarizing cached issue context, and removing a deleted cached comment.
- Rejected as unnecessary in this lane:
  broader cache abstractions, cross-run persistence, or combining the mutation flows behind a new generic wrapper.
- Conclusion:
  no further simplification was clearly safe without either reintroducing redundant live reads or making the provider-worker mutation path harder to reason about.

## Result

No additional blocking findings remained after the delete-cache regression was fixed.
