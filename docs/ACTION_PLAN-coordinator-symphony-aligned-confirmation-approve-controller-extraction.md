# ACTION_PLAN - Coordinator Symphony-Aligned Confirmation Approve Controller Extraction

## Phase 1 - Docs / Boundary Confirmation

- Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1049`.
- Record the bounded-seam rationale for approval extraction after `1048`.
- Run docs-first guard bundle and capture any docs-review override honestly before implementation.

## Phase 2 - Controller Extraction

- Extract `/confirmations/approve` into a dedicated approval controller.
- Keep `controlServer.ts` limited to route ordering, auth/CSRF/runner-only gating, and injected runtime/control callbacks.
- Preserve actor defaulting, persistence order, `ui.cancel` fast-path behavior, `confirmation_resolved` emission, and response contracts.

## Phase 3 - Validation / Closeout

- Add direct controller tests and confirm existing server regressions still pass.
- Run the standard validation lane and record any honest stacked-branch/review overrides.
- Sync task/docs mirrors to completed and record the next bounded seam.
