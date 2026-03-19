# ACTION_PLAN - Coordinator Symphony-Aligned Question Queue Controller Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1043` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the `/questions*` controller extraction boundary against the post-`1042` server shape before editing runtime code.
- [ ] Capture docs-review approval or an explicit docs-review override before editing runtime code.

## Phase 2 - Questions Controller Extraction

- [ ] Introduce a dedicated `/questions*` controller helper.
- [ ] Move route-local request parsing, queue mutation calls, child-question resolution, and response shaping into that module.
- [ ] Keep top-level auth/CSRF ordering, expiry/background helpers, runtime publish hooks, Telegram projection signaling, and non-question routes on their current seams.

## Phase 3 - Verification + Closeout

- [ ] Add focused server/unit regressions that prove question-route behavior parity after extraction.
- [ ] Capture a manual mock questions controller artifact.
- [ ] Run the standard validation lane, including `npm run pack:smoke` because packaged CLI paths are touched, and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
