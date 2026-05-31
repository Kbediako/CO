# TECH SPEC - CO-424 Provider-Worker Closeout Invariants
last_review: 2026-05-31
## Source / Intent
Linear `CO-424`; implementation `orchestrator/src/cli/providerLinearWorkerRunner.ts`; diagnostics `orchestrator/src/cli/services/commandRunner.ts`; tests `ProviderLinearWorkerRunner.test.ts` and `CommandRunnerReviewEvidenceConsistency.test.ts`. Prevent `provider-linear-worker` from false-failing after `review handoff`, `merge handoff`, or post-merge/Done closeout because stale implementation-turn proof is applied to lifecycle bookkeeping, while preserving fail-closed current-turn enforcement.
## Protected Terms
`parallelization_serial_conflict`, `parallelization_decision_missing`, `stay_serial`, `forbid_parallel`, `same-issue child lanes`, `review handoff`, `merge handoff`, `post-merge/Done closeout`, `provider-linear-worker`, `proof lock`, `CO-423`, `PR #721`.
## Design / Regressions
Filter child-lane evidence by active decision lineage before deriving `child_lane_count`, serial/forbid conflicts, or `parallelize_now` launch proof. Defer missing-decision closeout only for clean no-child lifecycle-only audit plus live handoff, merge handoff, or terminal state. Keep non-closeout audit work, blocked queued states, dirty source proof, and same-decision serial/forbid child launches fail-closed. Move repeated stale proof-lock diagnostics to secondary diagnostics. Cover CO-423 review handoff, merge handoff, Done closeout, prior `parallelize_now` residue, same-decision serial/forbid violations, mismatched lineage under current `parallelize_now`, blocked queued states, non-closeout audit work, dirty source proof, and proof-lock noise.
## Non-Goals
No global bypass, retry scheduler rewrite, `CO-423` / `PR #721` changes, or reopening `CO-326`, `CO-403`, `CO-408`, or `CO-417`.
## Validation Contract
Run: delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, repo:stewardship, diff budget, manifest-backed review, elegance review, pack:smoke, PR checks, unresolved-review-threads check, ready-review, and Linear handoff.
