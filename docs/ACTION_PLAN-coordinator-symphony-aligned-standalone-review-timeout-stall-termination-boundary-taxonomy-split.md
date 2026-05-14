# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Timeout-Stall Termination Boundary Taxonomy Split

## Summary
- Goal: promote the existing generic timeout and output-stall failures into the first-class `termination_boundary` contract.
- Scope: timeout/stall classification/provenance only; no startup-loop or broader retry-semantics redesign.
- Assumption: `run-review` remains the runtime source of truth for timeout/stall detection, while `review-execution-state` owns the compact boundary contract and fallback parsing.

## Milestones & Sequencing
1. Register the `1135` docs-first package and capture why timeout/stall is the next truthful compact parity seam after `1134`.
2. Extend the standalone-review boundary kind/provenance unions for timeout/stall families.
3. Thread explicit boundary records from the existing `run-review` timeout and stall termination sites.
4. Extend fallback error inference and docs, add focused wrapper regressions, and close the lane.

## Dependencies
- `1134` closeout evidence, especially the next-slice note identifying the deferred generic timeout/stall family.
- Existing timeout and stall branches in `scripts/run-review.ts`.
- Existing timeout/stall regressions in `tests/run-review.spec.ts`.

## Validation
- Checks / tests:
  - docs-first guard bundle
  - focused `tests/run-review.spec.ts` and `tests/review-execution-state.spec.ts`
  - build / lint / docs guards / review / pack-smoke on the final tree
- Rollback plan:
  - remove timeout/stall boundary plumbing and return to the `1134` contract if the slice starts broadening error semantics.

## Risks & Mitigations
- Risk: regressing startup-loop or existing timeout retry behavior.
  - Mitigation: keep the explicit timeout/stall branches authoritative and preserve adjacent boundary-family tests.
- Risk: broadening into a general retry/termination rewrite.
  - Mitigation: limit the lane to explicit boundary record threading plus fallback inference.
