# ACTION_PLAN - Coordinator Symphony-Aligned Security Violation Controller Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1044` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the `/security/violation` controller extraction boundary against the post-`1043` server shape before editing runtime code.
- [ ] Capture docs-review approval or an explicit docs-review override before editing runtime code.

## Phase 2 - Security Violation Controller Extraction

- [ ] Introduce a dedicated `/security/violation` controller helper.
- [ ] Move route-local JSON parsing, redacted payload shaping, event emission, and response shaping into that module.
- [ ] Keep top-level auth/CSRF ordering, broader control-plane policy, and the harder authority-bearing routes on their current seams.

## Phase 3 - Verification + Closeout

- [ ] Add focused server/unit regressions that prove `/security/violation` behavior parity after extraction.
- [ ] Capture a manual mock security-violation controller artifact.
- [ ] Run the standard validation lane, including `npm run pack:smoke` because packaged CLI paths are touched, and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
