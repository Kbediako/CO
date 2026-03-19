# ACTION_PLAN - Coordinator Symphony-Aligned Confirmation Issue Consume Controller Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1046` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the `/confirmations/issue` + `/confirmations/consume` extraction boundary against the post-`1045` server shape before editing runtime code.
- [ ] Capture docs-review approval or an explicit docs-review override before editing runtime code.

## Phase 2 - Confirmation Issue Consume Controller Extraction

- [ ] Introduce a dedicated confirmation-issue-consume controller helper.
- [ ] Move route-local confirmation expiry, JSON parsing, missing-request validation, nonce issuance invocation, persistence trigger, and response shaping into that module.
- [ ] Keep top-level auth ordering, broader control-plane policy, and the harder `/confirmations/validate` plus `/control/action` authority seams on their current boundaries.

## Phase 3 - Verification + Closeout

- [ ] Add focused server and unit regressions that prove `/confirmations/issue` and `/confirmations/consume` behavior parity after extraction.
- [ ] Capture a manual mock confirmation-issue-consume controller artifact.
- [ ] Run the standard validation lane, including `npm run pack:smoke` because packaged CLI paths are touched, and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
