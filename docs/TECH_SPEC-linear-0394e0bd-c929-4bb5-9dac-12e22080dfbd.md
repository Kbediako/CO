---
id: 20260501-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd
title: "CO-424 prevent provider-worker post-handoff closeout parallelization false failures"
relates_to: docs/PRD-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md
risk: high
owners:
  - Codex
last_review: 2026-05-05
---

# TECH_SPEC - CO-424 prevent provider-worker post-handoff closeout parallelization false failures

This mirror points to the canonical task spec at `tasks/specs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`.

## Implementation Summary
- Keep the CO-424 docs-first traceability packet and registry mirrors current while landing the source/test fix.
- Preserve the protected failure modes `parallelization_serial_conflict` and `parallelization_decision_missing`.
- Preserve serial/no-parallel decisions `stay_serial` and `forbid_parallel`.
- Preserve the exact lifecycle surfaces `review handoff`, `merge handoff`, and `post-merge/Done closeout`.
- Preserve `same-issue child lanes`, `provider-linear-worker`, `proof lock`, `CO-423`, and `PR #721` as issue-shaping anchors.
- Implement lineage-aware child-lane filtering and lifecycle-closeout handling in `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- Demote duplicate stale proof-lock diagnostics in provider-worker command closeout when another terminal cause exists.

## Implementation Boundaries
- Source and test edits are limited to:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- Proof-lock diagnostic summary edits are limited to:
  - `orchestrator/src/cli/services/commandRunner.ts`
  - `orchestrator/tests/CommandRunnerReviewEvidenceConsistency.test.ts`
- Implementation must keep active-turn parallelization invariants strict:
  - active turns still fail on true `parallelization_decision_missing`
  - active turns still fail on true `parallelization_serial_conflict`
  - active `parallelize_now` still requires successful current-turn same-issue child lanes or explicit recovered child-lane proof
- Implementation prevents post-handoff closeout from being reclassified as an active implementation turn merely because proof sidecars contain older or unrelated child-lane records.
- Implementation must not weaken `proof lock` safety or mutate historical `CO-423` / `PR #721` evidence.

## Validation Contract
- File scope:
  - packet/mirror files and registry mirrors
  - provider-worker runner source and focused tests
  - command-runner proof-lock diagnostic summary source and focused test
- Required validation sequence before ready-review handoff:
  - same-issue tests child-lane evidence or accepted/recorded parent import evidence
  - `npm run build`
  - focused `ProviderLinearWorkerRunner` regression tests
  - focused `CommandRunnerReviewEvidenceConsistency` proof-lock diagnostic test
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
