# ACTION_PLAN - Coordinator Symphony-Aligned Control Action Execution Extraction

## Phase 1 - Docs / Boundary Confirmation

- Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1054`.
- Record the post-resolution execution seam as the next step after `1053`, explicitly moving replay resolution out of the preflight helper and into a new execution helper.
- Capture docs-review approval or an explicit override before implementation.

## Phase 2 - Control Action Execution Extraction

- Add `controlActionExecution.ts` and move replay resolution plus `updateAction(...)` orchestration into it.
- Keep `controlServer.ts` limited to route ordering, auth/CSRF/runner-only gating, fast rejects, cancel-confirmation authority, transport preflight rejection, nonce consume/rollback durability, actual persistence/publish side effects, audit emission, and raw response writes.
- Preserve existing replayed-versus-applied contracts exactly.

## Phase 3 - Validation / Closeout

- Add direct helper tests and confirm existing `/control/action` regressions still pass.
- Run the standard validation lane and record any honest docs-review, stacked-branch, or review-loop overrides.
- Sync task/docs mirrors to completed and record the next bounded seam after execution extraction.
