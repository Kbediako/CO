# ACTION_PLAN - Coordinator Symphony-Aligned Confirmation Validate Controller Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1047` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the `/confirmations/validate` extraction boundary against the post-`1046` server shape before editing runtime code.
- [ ] Capture docs-review approval or an explicit docs-review override before editing runtime code.

## Phase 2 - Confirmation Validate Controller Extraction

- [ ] Introduce a dedicated confirmation-validate controller helper.
- [ ] Move route-local confirmation expiry, JSON parsing, missing-confirm-nonce validation, tool and params normalization, nonce-validation invocation, persistence, control-event emission, and response shaping into that module.
- [ ] Keep top-level auth ordering, broader control-plane policy, and the higher-authority `/confirmations/approve` plus `/control/action` seams on their current boundaries.

## Phase 3 - Verification + Closeout

- [ ] Add focused server and unit regressions that prove `/confirmations/validate` behavior parity after extraction.
- [ ] Capture a manual mock confirmation-validate controller artifact.
- [ ] Run the standard validation lane, including `npm run pack:smoke` because packaged CLI paths are touched, and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
