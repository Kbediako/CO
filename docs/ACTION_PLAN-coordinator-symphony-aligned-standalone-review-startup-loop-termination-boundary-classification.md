# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Startup-Loop Termination Boundary Classification

## Summary
- Goal: promote the existing startup-loop detector into the first-class `termination_boundary` contract.
- Scope: startup-loop classification/provenance only; no timeout/stall/heavy-command redesign.
- Assumption: `run-review` remains the runtime source of truth for startup-loop detection, while `review-execution-state` owns the compact boundary contract and fallback parsing.

## Milestones & Sequencing
1. Register the `1134` docs-first package and capture why startup-loop is the next truthful compact parity seam after `1133`.
2. Extend the standalone-review boundary kind/provenance unions for a startup-loop family.
3. Thread an explicit startup-loop boundary record from the existing `run-review` termination site.
4. Extend fallback error inference and docs, add focused wrapper regressions, and close the lane.

## Dependencies
- `1133` closeout evidence, especially the next-slice note identifying startup-loop as the next compact boundary seam.
- Existing startup-loop detector in `scripts/run-review.ts`.
- Existing startup-loop and cross-stream fragmented tests in `tests/run-review.spec.ts`.

## Validation
- Checks / tests:
  - docs-first guard bundle
  - focused `tests/run-review.spec.ts`
  - build / lint / docs guards / review / pack-smoke on the final tree
- Rollback plan:
  - remove startup-loop boundary plumbing and return to the `1133` contract if the slice starts broadening generic timeout/stall behavior.

## Risks & Mitigations
- Risk: classifying generic timeout behavior as startup-loop.
  - Mitigation: keep the explicit `run-review` startup-loop detector authoritative and preserve the cross-stream fragmented negative test.
- Risk: overengineering `ReviewExecutionState`.
  - Mitigation: thread an explicit boundary record from `run-review` instead of migrating the full startup-loop detector into state.
