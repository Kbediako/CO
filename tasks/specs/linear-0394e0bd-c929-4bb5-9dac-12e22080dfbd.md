# TECH SPEC - CO-424 Provider-Worker Closeout Invariants

last_review: 2026-05-05

## Source
Linear `CO-424` / `0394e0bd-c929-4bb5-9dac-12e22080dfbd`; primary implementation `orchestrator/src/cli/providerLinearWorkerRunner.ts`; diagnostic summary surface `orchestrator/src/cli/services/commandRunner.ts`; tests `orchestrator/tests/ProviderLinearWorkerRunner.test.ts` and `orchestrator/tests/CommandRunnerReviewEvidenceConsistency.test.ts`.

## Intent
Prevent `provider-linear-worker` from false-failing after successful `review handoff`, `merge handoff`, or post-merge/Done closeout because stale implementation-turn proof is applied to lifecycle bookkeeping. Preserve fail-closed behavior for real current-turn violations.

## Protected Terms
`parallelization_serial_conflict`, `parallelization_decision_missing`, `stay_serial`, `forbid_parallel`, `same-issue child lanes`, `review handoff`, `merge handoff`, `post-merge/Done closeout`, `provider-linear-worker`, `proof lock`, `CO-423`, `PR #721`.

## Design
Filter current-turn child-lane evidence against the current parallelization decision lineage before deriving `child_lane_count`, serial/forbid conflict proof, or `parallelize_now` launch proof. Permit missing-decision closeout only for clean no-child turns whose Linear audit is lifecycle-closeout-only and whose live state is handoff or terminal. Treat non-closeout audit entries such as `attach-pr`, `runtime-proof`, failed `parallelization`, `child-lane`, or `child-stream` plus dirty source-root proof as active parent work that still requires the explicit decision. Move repeated stale `provider-linear-worker-proof.json.lock` diagnostics into secondary diagnostics when provider proof already gives a terminal reason.

## Required Regressions
Cover CO-423-style `review handoff`, post-merge/Done closeout, prior `parallelize_now` residue before later `stay_serial` / `forbid_parallel`, same-decision serial/forbid child-lane violations, mismatched child-lane lineage under current `parallelize_now`, blocked queued states, non-closeout audit work, dirty source proof, and secondary proof-lock noise.

## Non-Goals
No global parallelization bypass, retry scheduler rewrite, changes to `CO-423` / `PR #721`, or reopening `CO-326`, `CO-403`, `CO-408`, or `CO-417`.

## Validation Contract
Run, in order: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, manifest-backed `npm run review` / `codex-orchestrator review`, and `npm run pack:smoke`.

## Done
Done only when PR checks, unresolved-review-threads, ready-review quiet window, workpad, and Linear handoff are clean.
