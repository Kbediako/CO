# ACTION_PLAN - Coordinator Symphony-Aligned Confirmation Create Controller Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1048` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the `/confirmations/create` extraction boundary against the post-`1047` server shape before editing runtime code.
- [ ] Capture docs-review approval or an explicit docs-review override before editing runtime code.

## Phase 2 - Confirmation Create Controller Extraction

- [ ] Introduce a dedicated confirmation-create controller helper.
- [ ] Move route-local confirmation expiry, JSON parsing, action/tool/params normalization, session-only `ui.cancel` restriction handling, confirmation creation invocation, persistence, optional auto-pause, `confirmation_required` event emission, and response shaping into that module.
- [ ] Keep top-level auth ordering, broader control-plane policy, and the harder `/confirmations/approve` plus `/control/action` authority seams on their current boundaries.

## Phase 3 - Verification + Closeout

- [ ] Add focused server and unit regressions that prove `/confirmations/create` behavior parity after extraction.
- [ ] Capture a manual mock confirmation-create controller artifact.
- [ ] Run the standard validation lane, including `npm run pack:smoke` because packaged CLI paths are touched, and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
