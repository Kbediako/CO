# ACTION_PLAN - Coordinator Symphony-Aligned Events SSE Controller Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1042` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the `/events` SSE controller extraction boundary against the post-`1041` server shape before editing runtime code.
- [ ] Capture docs-review approval or an explicit docs-review override before editing runtime code.

## Phase 2 - Events SSE Controller Extraction

- [ ] Introduce a dedicated `/events` SSE controller helper.
- [ ] Move method rejection, SSE response bootstrap, client registration, and disconnect cleanup into that module.
- [ ] Keep route ordering, auth/runner-only gating, shared event fanout, `/api/v1/*`, webhook routes, and mutating control endpoints on their current seams.

## Phase 3 - Verification + Closeout

- [ ] Add focused server/unit regressions that prove SSE behavior parity after extraction.
- [ ] Capture a manual mock events SSE controller artifact.
- [ ] Run the standard validation lane, including `npm run pack:smoke` because packaged CLI paths are touched, and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
