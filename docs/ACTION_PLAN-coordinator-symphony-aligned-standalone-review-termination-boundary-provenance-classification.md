# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Termination Boundary Provenance Classification

## Summary
- Goal: make bounded standalone-review termination classes first-class in telemetry and terminal output.
- Scope: startup-anchor, meta-surface expansion, verdict-stability, and relevant-reinspection dwell classification/provenance only.
- Assumptions: existing runtime heuristics and rejection order are already correct after `1129`; this slice is output contract work, not guard tuning.

## Milestones & Sequencing
1. Register the `1130` docs-first package and capture the narrowed post-`1129` problem statement.
2. Add a compact shared termination-boundary record in `review-execution-state`.
3. Persist the record in telemetry and print one stable boundary line in stderr.
4. Add focused execution-state + wrapper regressions, rerun the final gate stack, and close the lane.

## Dependencies
- `1129` closeout evidence, especially the next-slice note and manual runtime proof.
- Existing bounded boundary getters in `scripts/lib/review-execution-state.ts`.
- Existing telemetry/logging path in `scripts/run-review.ts`.

## Validation
- Checks / tests:
  - docs-first guard bundle
  - focused `tests/review-execution-state.spec.ts`
  - focused `tests/run-review.spec.ts`
  - build / lint / full test / docs guards / review / pack-smoke on the final tree
- Rollback plan:
  - remove the new telemetry/output record plumbing and revert to the prior `1129` behavior if the classification contract changes the rejection order or destabilizes existing review output.

## Risks & Mitigations
- Risk: broadening into parity for every review failure family.
  - Mitigation: keep `1130` scoped to the four termination classes called out by `1129`.
- Risk: changing existing failure strings and breaking operator/test expectations.
  - Mitigation: add classification alongside the current prose rather than replacing it.
