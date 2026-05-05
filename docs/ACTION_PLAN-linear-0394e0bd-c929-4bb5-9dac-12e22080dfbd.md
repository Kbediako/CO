# ACTION_PLAN - CO-424 prevent provider-worker post-handoff closeout parallelization false failures

## Summary
- Goal: implement CO-424 so provider-worker review/merge/Done closeout does not false-fail on stale parallelization invariants.
- Scope: update the packet/mirrors, provider-worker closeout logic, focused provider-worker tests, and provider-worker command summary proof-lock diagnostic handling.
- Assumptions:
  - `CO-423` and `PR #721` are trace anchors from the issue description.
  - Active implementation turns must still fail closed for true missing decisions, missing `parallelize_now` launches, and same-decision serial/forbid child-lane launches.
  - Proof-lock acquisition safety remains unchanged; only repeated stale-lock diagnostics are demoted when another provider-worker terminal cause exists.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `parallelization_serial_conflict`
  - `parallelization_decision_missing`
  - `stay_serial`
  - `forbid_parallel`
  - `same-issue child lanes`
  - `review handoff`
  - `merge handoff`
  - `post-merge/Done closeout`
  - `provider-linear-worker`
  - `proof lock`
  - `CO-423`
  - `PR #721`
- Not done if:
  - the packet omits protected terms or registry mirrors
  - active-turn parallelization invariants are weakened
  - handoff closeout is fixed by requiring fake same-issue child lanes
  - `proof lock` safety is bypassed
  - `CO-423` / `PR #721` content is mutated instead of used as evidence
- Pre-implementation issue-quality review:
  - 2026-05-04: the fix is narrower than disabling `parallelization_serial_conflict` or `parallelization_decision_missing` and broader than a docs-only wording change.
  - 2026-05-05: implementation keeps legacy timestamp fallback for no-lineage child-lane records but prefers decision lineage when present.
- Fallback / refactor decision: retain legacy timestamp fallback for no-lineage child-lane records; owner CO-424; remove only after live child-lane records consistently carry lineage.

## Milestones & Sequencing
1. Refresh PRD, TECH_SPEC mirror, ACTION_PLAN, canonical spec, task checklist, and `.agent` mirror for implementation scope.
2. Implement lineage-aware child-lane filtering and lifecycle-closeout missing-decision handling in `providerLinearWorkerRunner.ts`.
3. Add focused regressions for CO-423-style review handoff, post-merge/Done closeout, stale prior `parallelize_now` residue, and true same-decision serial/forbid violations.
4. Demote repeated stale provider proof-lock diagnostics in command error details when authoritative provider-worker proof already exposes a separate terminal cause.
5. Run focused validation, full repo gates, standalone review, elegance review, update PR #764, and drain `ready-review` before Linear review handoff.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `provider-linear-worker-proof.json`
- `provider-linear-worker-linear-audit.jsonl`
- `provider-linear-worker-child-lanes.json`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Validation
- Checks / tests:
  - `git status --short --branch`
  - protected-term `rg` across CO-424 packet and registry mirror files
  - packet-path `rg` across registry mirrors
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - optional `npm run docs:check`
  - optional `npm run docs:freshness`
  - focused `ProviderLinearWorkerRunner` tests for CO-424 closeout and invariant behavior
  - focused `CommandRunnerReviewEvidenceConsistency` proof-lock diagnostic test
  - full repo validation floor before handoff
- Rollback plan:
  - revert the CO-424 source/test/doc diff on the PR branch; no historical `CO-423` / `PR #721` or shared-root rollback is expected because those surfaces are not mutated.

## Risks & Mitigations
- Risk: packet wording weakens active-turn child-lane enforcement.
  - Mitigation: explicitly preserve `parallelization_serial_conflict`, `parallelization_decision_missing`, and strict active-turn same-issue child lanes behavior.
- Risk: future implementer treats handoff closeout as permission to launch no-op child lanes.
  - Mitigation: packet rejects fake child lanes for `review handoff`, `merge handoff`, and `post-merge/Done closeout`.
- Risk: proof durability is weakened while fixing closeout.
  - Mitigation: packet names `proof lock` safety as protected and out of scope for weakening.

## Approvals
- Packet setup: completed by parent, 2026-05-04
- Implementation review: pending
