# Task Checklist - CO-424 Provider-Worker Closeout Invariants

- Linear Issue: `CO-424` / `0394e0bd-c929-4bb5-9dac-12e22080dfbd`
- Branch / PR: `kb/co-424-traceability-packet` / `#764`
- Spec: `tasks/specs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task checklist, and agent mirror preserve protected terms and non-goals.
- [x] Registry mirrors updated: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Protected Terms
- [x] `parallelization_serial_conflict`, `parallelization_decision_missing`, `stay_serial`, `forbid_parallel`
- [x] `same-issue child lanes`, `review handoff`, `merge handoff`, `post-merge/Done closeout`
- [x] `provider-linear-worker`, `proof lock`, `CO-423`, `PR #721`

## Implementation
- [x] Lineage-aware filtering prevents prior implementation child-lane residue from tripping later closeout serial/forbid decisions.
- [x] Clean no-child lifecycle closeout can finish without a fresh implementation-turn decision only for closeout-only audit/live state.
- [x] Active-turn violations remain fail-closed: same-decision child-lane launch, dirty source proof, blocked queued state, non-closeout audit work, and mismatched lineage.
- [x] Repeated stale proof-lock diagnostics are recorded as secondary diagnostics when another terminal provider-worker cause exists.
- [x] Same-issue tests child lane completed (`2026-05-05T17-36-54-901Z-aeadba63`); parent applied the verified patch after stale-base ledger invalidation.

## Validation
- [x] `node scripts/delegation-guard.mjs` and `node scripts/spec-guard.mjs --dry-run` passed.
- [x] `npm run build`, `npm run lint`, and `npm run test` passed; test summary: 359 files, 5380 tests.
- [x] Focused provider-worker regressions passed: CO-423 handoff/Done, blocked queued state, non-closeout audit work, dirty source, lineage mismatch, and same-decision serial/forbid failures.
- [x] Focused proof-lock diagnostic regression passed in `CommandRunnerReviewEvidenceConsistency.test.ts`.
- [x] `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke` passed locally.
- [x] Standalone review passed with `review_outcome=bounded-success`; telemetry: `.runs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd/cli/2026-05-05T17-34-04-030Z-d6775985/review/telemetry.json`.
- [x] Elegance pass recorded: `out/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd/manual/elegance-review.md`.
- [ ] `unresolved-review-threads` = 0, PR checks green, and `ready-review` quiet window clean before Linear handoff.

## Notes
- Adjacent issues `CO-326`, `CO-403`, `CO-408`, and `CO-417` are prior art only.
