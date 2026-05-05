# ACTION PLAN - CO-424 Provider-Worker Closeout Invariants
## Milestones
- [x] Refresh docs-first packet, registry mirrors, and one parallelization decision with bounded same-issue tests child lane.
- [x] Implement lineage-aware child-lane filtering, clean no-child lifecycle closeout for `review handoff` / `merge handoff` / Done, fail-closed active-turn enforcement, and proof-lock diagnostic demotion.
- [x] Run standalone review, address findings, and complete an elegance pass.
- [ ] Push PR update, wait for checks and `ready-review`, then transition Linear to `In Review`.
## Validation Plan
- Required gates: delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, repo:stewardship, diff budget, standalone review, pack:smoke.
- Focused tests cover `parallelization_serial_conflict`, `parallelization_decision_missing`, lineage mismatch, merge handoff, and proof-lock diagnostic summary behavior.
- Handoff requires attached PR, zero unresolved actionable review threads, green checks, and clean ready-review drain.
## Rollback
Revert the CO-424 commit if lineage or lifecycle closeout guards weaken active-turn enforcement; prior issues and `PR #721` are trace context only.
