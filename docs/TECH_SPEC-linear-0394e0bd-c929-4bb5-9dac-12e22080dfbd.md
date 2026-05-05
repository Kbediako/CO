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
- Create the CO-424 docs-first traceability packet and registry mirrors only.
- Preserve the protected failure modes `parallelization_serial_conflict` and `parallelization_decision_missing`.
- Preserve serial/no-parallel decisions `stay_serial` and `forbid_parallel`.
- Preserve the exact lifecycle surfaces `review handoff`, `merge handoff`, and `post-merge/Done closeout`.
- Preserve `same-issue child lanes`, `provider-linear-worker`, `proof lock`, `CO-423`, and `PR #721` as issue-shaping anchors.
- Do not implement the source fix in this setup lane.

## Future Implementation Boundaries
- Parent/future implementation owns source and test edits in:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- Future implementation must keep active-turn parallelization invariants strict:
  - active turns still fail on true `parallelization_decision_missing`
  - active turns still fail on true `parallelization_serial_conflict`
  - active `parallelize_now` still requires successful current-turn same-issue child lanes or explicit recovered child-lane proof
- Future implementation must prevent post-handoff closeout from being reclassified as an active implementation turn merely because the proof sidecars contain older or unrelated child-lane records.
- Future implementation must not weaken `proof lock` safety or mutate historical `CO-423` / `PR #721` evidence.

## Setup-Lane Validation Contract
- File scope:
  - six packet/mirror files
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
- Required lightweight checks:
  - `git status --short --branch`
  - protected-term `rg` over CO-424 packet and registry mirrors
  - packet path `rg` over registry mirrors
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
- Required validation sequence before ready-review handoff:
  - `node scripts/delegation-guard.mjs` or a documented setup-only delegation override
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
