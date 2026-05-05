# ACTION PLAN - CO-424 Provider-Worker Closeout Invariants

## Milestones
- [x] Refresh docs-first packet and registry mirrors for `CO-424`.
- [x] Record one explicit parallelization decision and launch the bounded same-issue tests child lane.
- [x] Implement lineage-aware child-lane filtering in `provider-linear-worker` proof and enforcement.
- [x] Add audit-scoped lifecycle closeout handling for clean no-child `review handoff`, `merge handoff`, and post-merge/Done turns.
- [x] Keep active-turn violations fail-closed: same-decision `stay_serial` / `forbid_parallel` child-lane launches, dirty source proof, blocked queued states, and non-closeout audit work.
- [x] Demote repeated stale `proof lock` diagnostics when another terminal cause is present.
- [x] Run standalone review, address findings, and complete an explicit elegance pass.
- [ ] Push PR update, wait for checks and `ready-review`, then transition Linear to `In Review`.

## Validation Plan
- Required repo gates: delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, repo:stewardship, diff budget, standalone review, pack:smoke.
- Focused tests cover `parallelization_serial_conflict`, `parallelization_decision_missing`, lineage mismatch, and proof-lock diagnostic summary behavior.
- Handoff requires attached PR, zero unresolved actionable review threads, green checks, and clean ready-review drain.

## Rollback
Revert the CO-424 commit if the lineage or lifecycle closeout guard weakens active-turn enforcement. Do not mutate `CO-423` / `PR #721` history during rollback.

## Notes
Adjacent issues `CO-326`, `CO-403`, `CO-408`, and `CO-417` are trace context only.
