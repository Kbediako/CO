# ACTION PLAN - CO-426 Provider Validation Audit Isolation
## Milestones
- [x] Create docs-first packet and registry mirrors before CO-426 leaves Backlog.
- [x] Reproduce the fixture-audit leak shape under a provider-worker audit environment.
- [x] Isolate mutating Linear CLI test audit writes from the live provider audit path while preserving real audit logging.
- [x] Add focused regressions and run the full provider-worker validation gate set.
- [ ] Open PR, address automated feedback, drain `ready-review`, and transition Linear to review state.
## Validation Plan
- Required gates: delegation guard, spec guard, build, lint, focused `LinearCliShell` tests, full test, docs:check, docs:freshness, repo:stewardship, diff budget, standalone review, elegance review, pack:smoke, GitHub checks, unresolved-thread sweep, and `ready-review`.
## Rollback
Revert the CO-426 implementation if test isolation suppresses real provider audit rows or weakens `create-follow-up` parity-matrix enforcement.
