# ACTION_PLAN - Coordinator Symphony-Aligned Confirmation List Controller Extraction

## Phase 1 - Docs / Boundary Confirmation

- Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1050`.
- Record the bounded-seam rationale for confirmation-list extraction after `1049`.
- Run docs-first guard bundle and capture any docs-review override honestly before implementation.

## Phase 2 - Controller Extraction

- Extract `GET /confirmations` into a dedicated confirmation-list controller.
- Keep `controlServer.ts` limited to route ordering, auth/CSRF/runner-only gating, and injected runtime/control callbacks.
- Preserve expiry-before-read behavior, sanitized response shaping, and the existing response contract.

## Phase 3 - Validation / Closeout

- Add direct controller tests and confirm existing server regressions still pass.
- Run the standard validation lane and record any honest stacked-branch/review overrides.
- Sync task/docs mirrors to completed and record the next bounded seam.
