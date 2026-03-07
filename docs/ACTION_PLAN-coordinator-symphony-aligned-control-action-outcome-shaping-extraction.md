# ACTION_PLAN - Coordinator Symphony-Aligned Control Action Outcome Shaping Extraction

## Phase 1 - Docs / Boundary Confirmation

- Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1052`.
- Record the bounded-seam rationale for extracting `/control/action` outcome shaping after `1051`.
- Capture the delegation-blocked docs-review override explicitly if the current account usage limit still prevents bounded subagent work.

## Phase 2 - Outcome Shaping Extraction

- Extract `/control/action` confirmation-required/confirmation-invalid response mapping, replay-versus-apply payload shaping, and post-mutation traceability shaping into a dedicated helper module.
- Keep `controlServer.ts` limited to route ordering, auth/CSRF/runner-only gating, confirmation validation/persistence, nonce consumption, control mutation authority, runtime publish, and audit emission.
- Preserve existing confirmation, replay, and applied payload contracts exactly.

## Phase 3 - Validation / Closeout

- Add direct helper tests and confirm existing `/control/action` regressions still pass.
- Run the standard validation lane and record any honest delegation-limit, stacked-branch, or review-loop overrides.
- Sync task/docs mirrors to completed and record the next bounded seam.
