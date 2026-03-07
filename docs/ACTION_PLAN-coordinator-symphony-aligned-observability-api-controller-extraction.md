# ACTION_PLAN - Coordinator Symphony-Aligned Observability API Controller Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1038` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the API controller extraction boundary against the real Symphony controller shape before editing runtime code.

## Phase 2 - Observability API Controller Extraction

- [ ] Introduce a dedicated observability API controller helper.
- [ ] Move `/api/v1/*` route matching, method guards, and route-local response writing into that module.
- [ ] Keep `/ui/data.json`, presenter/read-model builders, auth/session/webhook handling, and mutating control endpoints on their current seams.

## Phase 3 - Verification + Closeout

- [ ] Add focused server/unit regressions that prove behavior parity after extraction.
- [ ] Capture a manual mock observability API artifact.
- [ ] Run the standard validation lane and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
