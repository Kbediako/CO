# ACTION_PLAN - Coordinator Symphony-Aligned Linear Webhook Controller Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1041` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the Linear webhook controller extraction boundary against the post-`1040` server shape before editing runtime code.
- [ ] Capture docs-review approval or an explicit docs-review override before editing runtime code.

## Phase 2 - Linear Webhook Controller Extraction

- [ ] Introduce a dedicated `/integrations/linear/webhook` controller helper.
- [ ] Move webhook validation, advisory-state recording, audit emission, and route-local response writing into that module.
- [ ] Keep UI assets, `/auth/session`, auth ordering, event streaming, `/api/v1/*`, and mutating control endpoints on their current seams.

## Phase 3 - Verification + Closeout

- [ ] Add focused server/unit regressions that prove webhook behavior parity after extraction.
- [ ] Capture a manual mock Linear webhook controller artifact.
- [ ] Run the standard validation lane, including `npm run pack:smoke` because packaged CLI paths are touched, and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
