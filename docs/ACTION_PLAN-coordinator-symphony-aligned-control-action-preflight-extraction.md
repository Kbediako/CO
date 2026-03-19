# ACTION_PLAN - Coordinator Symphony-Aligned Control Action Preflight Extraction

## Phase 1 - Docs / Boundary Confirmation

- Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1051`.
- Record the bounded-seam rationale for extracting `/control/action` preflight after `1050`.
- Run docs-first guard bundle and capture any docs-review override honestly before implementation.

## Phase 2 - Preflight Extraction

- Extract `/control/action` request parsing, normalization, transport preflight, replay-or-confirmation early exits, and canonical traceability shaping into a dedicated helper module.
- Keep `controlServer.ts` limited to route ordering, auth/CSRF/runner-only gating, early response writes through the existing route shell, and final authority-bearing mutation/publish/audit steps.
- Preserve existing traceability, replay, and confirmation-scope contracts exactly.

## Phase 3 - Validation / Closeout

- Add direct controller tests and confirm existing `/control/action` regressions still pass.
- Run the standard validation lane and record any honest stacked-branch/review overrides.
- Sync task/docs mirrors to completed and record the next bounded seam.
