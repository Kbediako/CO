# ACTION_PLAN - Coordinator Symphony-Aligned Delegation Register Controller Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1045` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the `/delegation/register` controller extraction boundary against the post-`1044` server shape before editing runtime code.
- [ ] Capture docs-review approval or an explicit docs-review override before editing runtime code.

## Phase 2 - Delegation Register Controller Extraction

- [ ] Introduce a dedicated `/delegation/register` controller helper.
- [ ] Move route-local JSON parsing, required-field validation, token registration invocation, persistence trigger, and response shaping into that module.
- [ ] Keep top-level auth/CSRF ordering, broader control-plane policy, and the harder authority-bearing routes on their current seams.

## Phase 3 - Verification + Closeout

- [ ] Add focused server/unit regressions that prove `/delegation/register` behavior parity after extraction.
- [ ] Capture a manual mock delegation-register controller artifact.
- [ ] Run the standard validation lane, including `npm run pack:smoke` because packaged CLI paths are touched, and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
