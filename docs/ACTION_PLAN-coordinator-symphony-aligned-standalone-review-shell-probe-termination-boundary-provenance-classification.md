# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Shell-Probe Termination Boundary Provenance Classification

## Summary
- Goal: extend the first-class standalone-review `termination_boundary` contract to the already-existing shell-probe family.
- Scope: shell-probe classification/provenance only.
- Assumptions: `1131` already settled command-intent parity; this slice adds shell-probe parity without reopening active-closeout or timeout taxonomy work.

## Milestones & Sequencing
1. Register the `1132` docs-first package and capture the narrowed post-`1131` parity gap.
2. Extend `review-execution-state` to emit a compact shell-probe termination-boundary record from the existing shell-probe state.
3. Carry that record through `run-review` telemetry/stderr without changing rejection order or human-readable failure prose.
4. Add focused execution-state + wrapper regressions, rerun the final gate stack, and close the lane.

## Dependencies
- `1131` closeout evidence, especially the next-slice note and the now-stable command-intent transport path.
- Existing shell-probe boundary state in `scripts/lib/review-execution-state.ts`.
- Existing telemetry/logging path in `scripts/run-review.ts`.

## Validation
- Checks / tests:
  - docs-first guard bundle
  - focused `tests/review-execution-state.spec.ts`
  - focused `tests/run-review.spec.ts`
  - build / lint / full test / docs guards / review / pack-smoke on the final tree
- Rollback plan:
  - remove the shell-probe record plumbing and revert to the `1131` contract if the parity work broadens into active-closeout policy or changes rejection order.

## Risks & Mitigations
- Risk: broadening `1132` into active-closeout or timeout taxonomy work.
  - Mitigation: keep the slice anchored to the existing shell-probe boundary state only.
- Risk: regressing `1131` or `1130` family behavior while widening the boundary union.
  - Mitigation: add explicit negative regressions for command-intent, active-closeout, and other unsupported families.
