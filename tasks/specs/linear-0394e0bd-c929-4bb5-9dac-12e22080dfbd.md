---
id: 20260501-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd
title: CO-424 prevent provider-worker post-handoff closeout parallelization false failures
status: packet_setup
owner: Codex
created: 2026-05-01
last_review: 2026-05-05
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md
related_action_plan: docs/ACTION_PLAN-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md
related_tasks:
  - tasks/tasks-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md
review_notes:
  - 2026-05-01: Setup worker drafted the traceability packet only. Future implementation owns source/tests and final validation.
  - 2026-05-04: Parent refreshed the draft onto current origin/main, added registry mirrors, and allowed normal packet PR/workpad attachment while keeping source-fix PR lifecycle out of scope.
---

# TECH_SPEC - CO-424 prevent provider-worker post-handoff closeout parallelization false failures

## Canonical Reference
- PRD: `docs/PRD-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- Task checklist: `tasks/tasks-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- Agent mirror: `.agent/task/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`

## Summary
- Objective: create the CO-424 setup/traceability packet for a future provider-worker source fix.
- Scope:
  - packet files and task mirrors
  - registry mirror updates in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - issue-shaping contract for post-handoff closeout false failures
- Constraints:
  - no implementation source or test edits
  - no source-fix Linear/GitHub lifecycle beyond packet PR/workpad attachment
  - no implementation branch push or source-fix PR creation
  - preserve active-turn parallelization invariants

## Issue-Shaping Contract
- User-request translation carried forward:
  - CO-424 concerns `provider-linear-worker` post-handoff closeout falsely failing on parallelization invariants after `review handoff`, `merge handoff`, or `post-merge/Done closeout`.
  - The protected false-failure names are `parallelization_serial_conflict` and `parallelization_decision_missing`.
  - The future fix must preserve valid serial/no-parallel outcomes `stay_serial` and `forbid_parallel`.
  - The future fix must not weaken ordinary active-turn same-issue child lanes enforcement.
- Protected terms / exact artifact and surface names:
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
  - `provider-linear-worker-proof.json`
  - `provider-linear-worker-linear-audit.jsonl`
  - `provider-linear-worker-child-lanes.json`
- Nearby wrong interpretations to reject:
  - disabling active-turn parallelization enforcement
  - making `stay_serial` or `forbid_parallel` pass even when a fresh current-turn child lane was actually launched
  - requiring child-lane launch during `review handoff`, `merge handoff`, or `post-merge/Done closeout`
  - treating older same-issue child lanes as a fresh serial conflict
  - using `CO-423` or `PR #721` as mutable state instead of trace evidence
  - weakening `proof lock` behavior or manually editing proof files
- Explicit non-goals carried forward:
  - no source implementation in this setup lane
  - no focused test implementation in this setup lane
  - no source-fix Linear/GitHub lifecycle beyond packet PR/workpad attachment
  - no implementation PR lifecycle work
  - no proof lock change
  - no shared-root mutation

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `parallelization_decision_missing` | Missing current-turn decisions fail active turns. | Active implementation turns must record exactly one decision. | Future implementation preserves this for active turns but avoids applying it after confirmed handoff closeout. | Global disablement. |
| `parallelization_serial_conflict` | `stay_serial` or `forbid_parallel` plus fresh current-turn child lanes is invalid. | Serial/no-parallel decisions must mean no new current-turn child lane launch. | Future implementation preserves this active-turn check and filters handoff/residue cases correctly. | No-op child lanes or broad allowance. |
| `review handoff` / `merge handoff` | Handoff states are lifecycle boundaries. | Handoff closeout should not be classified as ordinary active implementation work. | Future implementation classifies handoff/closeout before false parallelization failure can override it. | Changing team workflow states. |
| `post-merge/Done closeout` | Done closeout should reflect terminal lifecycle proof. | Successful merge/Done closeout should not fail because current active-turn evidence is no longer required. | Future implementation keeps terminal closeout truth while preserving proof/audit evidence. | Merge automation or PR handling in this packet. |
| `proof lock` | Proof writes rely on durable lock behavior. | Lock safety remains independent of closeout classification. | Future implementation leaves lock safety intact. | Manual lock deletion or lock weakening. |

## Readiness Gate
- Not done if:
  - protected terms are absent from packet files
  - registry mirrors omit the CO-424 packet
  - the packet implies implementation happened
  - active-turn invariant enforcement is weakened
  - handoff closeout is solved by fake same-issue child lanes
  - `proof lock` safety is weakened
- Pre-implementation issue-quality review evidence:
  - 2026-05-04: micro-task path is unavailable because correctness depends on exact failure names, lifecycle surfaces, and proof artifact names.
  - 2026-05-04: the setup packet is sufficient to prepare Backlog promotion; implementation remains future work.
- Safeguard ownership split:
  - setup worker owns packet files and registry mirrors only
  - future provider-worker lane owns source/tests, reproduction, validation, Linear, GitHub, PR, and review handoff

## Technical Requirements
- Functional requirements:
  - Add the six CO-424 packet/mirror files.
  - Add a `tasks/index.json` entry for CO-424.
  - Add a `docs/TASKS.md` snapshot for CO-424.
  - Add six docs-freshness registry rows for the packet/mirror files.
  - Preserve all protected terms exactly.
- Future implementation requirements:
  - Add focused regressions for post-handoff false `parallelization_decision_missing`.
  - Add focused regressions for post-handoff false `parallelization_serial_conflict`.
  - Preserve true active-turn failures for missing decisions, multiple decisions, `parallelize_now` launch missing, and serial/no-go with fresh current-turn child lanes.
  - Preserve `proof lock` behavior and proof sidecar durability.
- Non-functional requirements:
  - file-only setup diff
  - no external mutations
  - clear parent/future implementation boundaries

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? No for this setup packet.
- Required decision table: not applicable.
- Large-refactor check: not applicable for packet setup. Future implementation must record a fresh decision if it adds a fallback or lifecycle seam.

## Architecture & Data
- Architecture / design adjustments: none in this setup lane.
- Data model changes / migrations: none in this setup lane.
- External dependencies / integrations:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `provider-linear-worker-proof.json`
  - `provider-linear-worker-linear-audit.jsonl`
  - `provider-linear-worker-child-lanes.json`

## Validation Plan
- Setup lane:
  - `git status --short --branch`
  - protected-term scan with `rg`
  - packet-path scan with `rg`
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - required validation sequence before ready-review handoff:
    - `node scripts/delegation-guard.mjs` or a documented setup-only delegation override
    - `node scripts/spec-guard.mjs --dry-run`
    - `npm run build`
    - `npm run lint`
    - `npm run test`
    - `npm run docs:check`
    - `npm run docs:freshness`
- Future implementation lane:
  - focused provider worker regressions for post-handoff false failures
  - focused active-turn invariant regressions remain green
  - normal repo validation floor and review loop
- Rollout verification:
  - future lane proves a CO-423 / PR #721 style closeout no longer ends as `parallelization_decision_missing` or `parallelization_serial_conflict` when handoff/closeout is already terminal.
- Monitoring / alerts:
  - future PR review should verify no weakening of ordinary same-issue child lanes enforcement.

## Open Questions
- Which exact historical artifact should seed the future CO-423 / PR #721 fixture?
- Should post-handoff closeout be detected before or after reading refreshed issue state?
- How should older child-lane records be filtered during closeout: timestamp, decision status, turn lineage, or a combination?

## Approvals
- Reviewer: setup packet worker
- Date: 2026-05-04
