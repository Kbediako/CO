# ACTION_PLAN - Coordinator Symphony-Aligned Control Action Cancel Confirmation Resolution Extraction

## Phase 1 - Docs / Boundary Confirmation

- Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1053`.
- Record the narrower cancel-confirmation seam as the next step after `1052`, while noting the larger Symphony-inspired execution-boundary direction for later slices.
- Capture docs-review approval or an explicit override before implementation.

## Phase 2 - Cancel Confirmation Resolution Extraction

- Extract the cancel-only confirmation-resolution sequence into a dedicated helper.
- Keep `controlServer.ts` limited to route ordering, auth/CSRF/runner-only gating, raw response writes, shared transport preflight/replay flow, nonce consume/rollback, final control mutation authority, runtime publish, and audit emission.
- Preserve existing confirmation invalid/mismatch/confirmed-scope contracts exactly.

## Phase 3 - Validation / Closeout

- Add direct helper tests and confirm existing `/control/action` regressions still pass.
- Run the standard validation lane and record any honest docs-review, stacked-branch, or review-loop overrides.
- Sync task/docs mirrors to completed and record the next bounded execution seam.
