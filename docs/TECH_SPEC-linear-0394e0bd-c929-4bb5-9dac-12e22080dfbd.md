# TECH SPEC Mirror - CO-424 Provider-Worker Closeout Invariants

Canonical spec: `tasks/specs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`.

## Summary
Fix `provider-linear-worker` lifecycle closeout so stale implementation-turn parallelization proof cannot false-fail a successful `review handoff`, `merge handoff`, or post-merge/Done closeout as `parallelization_serial_conflict` or `parallelization_decision_missing`.

## Required Behavior
- Separate implementation `same-issue child lanes` lineage from later `stay_serial` / `forbid_parallel` lifecycle decisions.
- Allow clean no-child closeout bookkeeping without a fresh implementation decision only when audit evidence is closeout-only and live state is handoff or terminal.
- Keep blocked queued states, dirty source proof, non-closeout audit work, and true same-decision serial/forbid launches fail-closed.
- Deduplicate stale `proof lock` diagnostics as secondary when another terminal cause exists.

## Protected Terms
`parallelization_serial_conflict`, `parallelization_decision_missing`, `stay_serial`, `forbid_parallel`, `same-issue child lanes`, `review handoff`, `merge handoff`, `post-merge/Done closeout`, `provider-linear-worker`, `proof lock`, `CO-423`, `PR #721`.

## Validation
Required gates: delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, repo:stewardship, diff budget, standalone review, elegance review, ready-review, and pack:smoke.
