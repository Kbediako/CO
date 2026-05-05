# PRD - CO-424 Provider-Worker Closeout Invariants
## Request / Problem
Fix the `CO-423` / `PR #721` closeout class: successful `review handoff`, `merge handoff`, and post-merge/Done bookkeeping must not fail as `parallelization_serial_conflict` or `parallelization_decision_missing` only because stale implementation-turn proof no longer maps to the closeout turn.
## Protected Terms
`parallelization_serial_conflict`, `parallelization_decision_missing`, `stay_serial`, `forbid_parallel`, `same-issue child lanes`, `review handoff`, `merge handoff`, `post-merge/Done closeout`, `provider-linear-worker`, `proof lock`, `CO-423`, `PR #721`.
## Scope / Non-Goals
Separate implementation child-lane lineage from later closeout decisions; allow only clean no-child lifecycle-only handoff/merge/Done turns to skip a fresh implementation decision; keep same-decision serial/forbid launches, dirty source proof, blocked queued states, and non-closeout audit work fail-closed; demote duplicate proof-lock noise. No global bypass, retry scheduler rewrite, `CO-423` / `PR #721` mutation, or reopening `CO-326`, `CO-403`, `CO-408`, or `CO-417`.
## Acceptance Criteria
- [ ] CO-423-style `review handoff`, `merge handoff`, and Done closeout do not fail from earlier child-lane history.
- [ ] True same-decision `stay_serial` / `forbid_parallel` child-lane launches still fail closed.
- [ ] Implementation lineage, closeout decisions, and secondary proof-lock diagnostics are tested.
