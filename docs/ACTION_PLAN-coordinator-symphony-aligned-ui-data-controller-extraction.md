# ACTION_PLAN - Coordinator Symphony-Aligned UI Data Controller Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1039` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the UI controller extraction boundary against the post-`1038` server shape before editing runtime code.
- [ ] Capture docs-review approval or an explicit docs-review override before editing runtime code.

## Phase 2 - UI Data Controller Extraction

- [ ] Introduce a dedicated `/ui/data.json` controller helper.
- [ ] Move UI-route method guards and route-local response writing into that module.
- [ ] Keep `selectedRunPresenter.ts`, `/api/v1/*`, auth/session/webhook handling, and mutating control endpoints on their current seams.

## Phase 3 - Verification + Closeout

- [ ] Add focused server/unit regressions that prove `/ui/data.json` behavior parity after extraction.
- [ ] Capture a manual mock UI-data artifact.
- [ ] Run the standard validation lane, including `npm run pack:smoke` because packaged CLI paths are touched, and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
