# TECH SPEC Mirror - CO-424 Provider-Worker Closeout Invariants
Canonical spec: `tasks/specs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`.
## Summary / Behavior
Fix `provider-linear-worker` so stale implementation-turn proof cannot false-fail successful `review handoff`, `merge handoff`, or post-merge/Done closeout as `parallelization_serial_conflict` or `parallelization_decision_missing`: compare `same-issue child lanes` with active decision lineage; allow no-child closeout only for closeout-only audit plus live handoff, merge handoff, or terminal state; keep blocked queued states, dirty source proof, non-closeout audit work, and true same-decision serial/forbid launches fail-closed; dedupe stale `proof lock` diagnostics as secondary.
## Protected Terms
`parallelization_serial_conflict`, `parallelization_decision_missing`, `stay_serial`, `forbid_parallel`, `same-issue child lanes`, `review handoff`, `merge handoff`, `post-merge/Done closeout`, `provider-linear-worker`, `proof lock`, `CO-423`, `PR #721`.
## Validation
Required gates: delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, repo:stewardship, diff budget, standalone/elegance review, ready-review, pack:smoke.
