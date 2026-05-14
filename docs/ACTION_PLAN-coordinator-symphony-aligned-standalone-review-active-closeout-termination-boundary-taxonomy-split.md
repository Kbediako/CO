# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Active-Closeout Termination Boundary Taxonomy Split

## Summary
- Goal: make the active-closeout taxonomy explicit by promoting only the deterministic reread guard into the first-class `termination_boundary` contract.
- Scope: active-closeout bundle reread classification/provenance only; active-closeout search remains meta-surface expansion.
- Assumptions: `1130`/`1131`/`1132` already closed the parity-ready families, so this slice starts from a taxonomy decision rather than a generic parity gap.

## Milestones & Sequencing
1. Register the `1133` docs-first package and capture why active-closeout is a taxonomy split, not a single parity family.
2. Extend `review-execution-state` to project only the dedicated active-closeout reread guard into a first-class boundary record.
3. Carry that record through `run-review` telemetry/stderr while leaving active-closeout search classified as meta-surface expansion.
4. Add focused execution-state + wrapper regressions, rerun the final gate stack, and close the lane.

## Dependencies
- `1132` closeout evidence, especially the next-slice note showing shell-probe was the last pure parity seam.
- Existing active-closeout bundle reread state in `scripts/lib/review-execution-state.ts`.
- Existing meta-surface-expansion behavior for active-closeout/self-reference search in `scripts/run-review.ts` and `tests/run-review.spec.ts`.

## Validation
- Checks / tests:
  - docs-first guard bundle
  - focused `tests/review-execution-state.spec.ts`
  - focused `tests/run-review.spec.ts`
  - build / lint / full test / docs guards / review / pack-smoke on the final tree
- Rollback plan:
  - remove the dedicated reread boundary plumbing and revert to the `1132` contract if the slice starts collapsing active-closeout search into the new family.

## Risks & Mitigations
- Risk: introducing a misleading umbrella active-closeout boundary.
  - Mitigation: keep the slice explicitly framed as a taxonomy split and retain meta-surface classification for search behavior.
- Risk: regressing current active-closeout search behavior while plumbing reread parity.
  - Mitigation: add explicit negative wrapper regressions showing active-closeout search still terminates as meta-surface expansion.
