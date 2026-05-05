# Agent Mirror - CO-424 Provider-Worker Closeout Invariants

Canonical checklist: `tasks/tasks-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`.

## Scope
- Fix `provider-linear-worker` post-handoff/post-merge closeout false failures for `parallelization_serial_conflict` and `parallelization_decision_missing`.
- Preserve fail-closed behavior for real current-turn `stay_serial` / `forbid_parallel` child-lane violations.
- Keep `proof lock` diagnostics secondary when another terminal cause exists.

## Protected Terms
- [x] `parallelization_serial_conflict`, `parallelization_decision_missing`, `stay_serial`, `forbid_parallel`
- [x] `same-issue child lanes`, `review handoff`, `merge handoff`, `post-merge/Done closeout`
- [x] `provider-linear-worker`, `proof lock`, `CO-423`, `PR #721`

## Validation
- [x] Full repo gates and pack smoke passed locally; see canonical checklist.
- [ ] PR checks, `unresolved-review-threads`, and `ready-review` must be clean before Linear handoff.
