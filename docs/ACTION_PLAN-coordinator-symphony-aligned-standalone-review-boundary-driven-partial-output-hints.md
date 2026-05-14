# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Boundary-Driven Partial Output Hints

## Summary
- Goal: align the partial-output hint with first-class termination-boundary families.
- Scope: `run-review` partial-output hint behavior only.
- Assumption: `termination_boundary.kind` is now the canonical source of failure-family truth for this behavior.

## Milestones & Sequencing
1. Register the `1137` docs-first package and capture why the partial-output hint is the next bounded seam after `1136`.
2. Add a local boundary-driven helper in `scripts/run-review.ts`.
3. Replace the primary and retry `error.timedOut` hint branches with the helper.
4. Add focused wrapper regressions, run validation, and close the lane.

## Dependencies
- `1130`-`1136` standalone-review boundary-family work, especially the new timeout/stall/startup-loop classification baseline.
- Existing primary/retry failure handling in `scripts/run-review.ts`.

## Validation
- Checks / tests:
  - docs-first guard bundle
  - focused `tests/run-review.spec.ts` partial-output hint regressions
  - build / lint / test / docs guards / review / pack-smoke on the final tree
- Rollback plan:
  - restore the legacy `error.timedOut` partial-output hint behavior if boundary-driven routing broadens unexpectedly or regresses expected timeout-adjacent hint coverage.

## Risks & Mitigations
- Risk: losing the partial-output hint on an expected timeout-adjacent family.
  - Mitigation: cover `timeout`, `stall`, and `startup-loop` explicitly in wrapper tests.
- Risk: broadening into a larger `CodexReviewError` semantics rewrite.
  - Mitigation: keep the slice limited to the partial-output hint behavior only.
