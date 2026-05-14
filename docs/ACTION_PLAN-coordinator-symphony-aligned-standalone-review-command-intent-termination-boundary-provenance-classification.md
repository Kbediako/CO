# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Command-Intent Termination Boundary Provenance Classification

## Summary
- Goal: extend the first-class standalone-review `termination_boundary` contract to the already-existing command-intent family.
- Scope: command-intent classification/provenance only.
- Assumptions: `1130` already settled the supported four-family contract; this slice adds parity for command-intent without reopening shell-probe, active-closeout, or timeout taxonomy work.

## Milestones & Sequencing
1. Register the `1131` docs-first package and capture the narrowed post-`1130` parity gap.
2. Extend `review-execution-state` to emit a compact command-intent termination-boundary record from the existing violation state.
3. Carry that record through `run-review` telemetry/stderr without changing rejection order or human-readable failure prose.
4. Add focused execution-state + wrapper regressions, rerun the final gate stack, and close the lane.

## Dependencies
- `1130` closeout evidence, especially the next-slice note and the now-stable boundary transport path.
- Existing command-intent violation state in `scripts/lib/review-execution-state.ts`.
- Existing telemetry/logging path in `scripts/run-review.ts`.

## Validation
- Checks / tests:
  - docs-first guard bundle
  - focused `tests/review-execution-state.spec.ts`
  - focused `tests/run-review.spec.ts`
  - build / lint / full test / docs guards / review / pack-smoke on the final tree
- Rollback plan:
  - remove the command-intent record plumbing and revert to the `1130` contract if parity work broadens into other out-of-scope families or changes rejection order.

## Risks & Mitigations
- Risk: broadening `1131` into shell-probe or active-closeout parity.
  - Mitigation: keep the slice anchored to the existing command-intent violation kinds only.
- Risk: regressing `1130` null behavior for non-command-intent out-of-scope families.
  - Mitigation: add explicit negative regressions for shell-probe, active-closeout, and timeout-style failures.
