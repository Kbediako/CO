# ACTION_PLAN - Coordinator Symphony-Aligned UI Session Controller Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1040` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the UI session controller extraction boundary against the post-`1039` server shape before editing runtime code.
- [ ] Capture docs-review approval or an explicit docs-review override before editing runtime code.

## Phase 2 - UI Session Controller Extraction

- [ ] Introduce a dedicated `/auth/session` controller helper.
- [ ] Move loopback/host/origin validation and route-local response writing into that module.
- [ ] Keep auth ordering, webhooks, event stream setup, `/api/v1/*`, and mutating control endpoints on their current seams.

## Phase 3 - Verification + Closeout

- [ ] Add focused server/unit regressions that prove `/auth/session` behavior parity after extraction.
- [ ] Capture a manual mock UI-session artifact.
- [ ] Run the standard validation lane, including `npm run pack:smoke` because packaged CLI paths are touched, and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
