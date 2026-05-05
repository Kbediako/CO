---
id: 20260501-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd
title: CO-424 prevent provider-worker post-handoff closeout parallelization false failures
status: implementation
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
  - 2026-05-01: Initial worker drafted the traceability packet before source/test work.
  - 2026-05-04: Parent refreshed the draft onto current origin/main, added registry mirrors, and allowed normal packet PR/workpad attachment while keeping source-fix PR lifecycle out of scope.
  - 2026-05-05: Implementation updates provider-worker closeout filtering, focused tests, and proof-lock diagnostic summarization while preserving active-turn fail-closed invariants.
---

# TECH_SPEC - CO-424 prevent provider-worker post-handoff closeout parallelization false failures

## Canonical Reference
- PRD: `docs/PRD-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- Task checklist: `tasks/tasks-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- Agent mirror: `.agent/task/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`

## Summary
- Objective: implement the CO-424 provider-worker source/test fix and keep the traceability packet current.
- Scope:
  - packet files and task mirrors
  - registry mirror updates in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - issue-shaping contract for post-handoff closeout false failures
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/src/cli/services/commandRunner.ts`
  - `orchestrator/tests/CommandRunnerReviewEvidenceConsistency.test.ts`
- Constraints:
  - preserve active-turn parallelization invariants
  - do not mutate `CO-423` / `PR #721`
  - do not weaken proof-lock acquisition or proof durability

## Issue-Shaping Contract
- User-request translation carried forward:
  - CO-424 concerns `provider-linear-worker` post-handoff closeout falsely failing on parallelization invariants after `review handoff`, `merge handoff`, or `post-merge/Done closeout`.
  - The protected false-failure names are `parallelization_serial_conflict` and `parallelization_decision_missing`.
  - The fix must preserve valid serial/no-parallel outcomes `stay_serial` and `forbid_parallel`.
  - The fix must not weaken ordinary active-turn same-issue child lanes enforcement.
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
  - no broad retry scheduler rewrite
  - no fake child lanes for review/merge/Done closeout
  - no active-turn invariant weakening
  - no direct proof JSON or proof-lock mutation
  - no shared-root mutation

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `parallelization_decision_missing` | Missing current-turn decisions fail active turns. | Active implementation turns must record exactly one decision. | Implementation still fails active turns but allows terminal lifecycle closeout without a fresh decision when no child lane launched and the source checkout is not dirty. | Global disablement. |
| `parallelization_serial_conflict` | `stay_serial` or `forbid_parallel` plus fresh current-turn child lanes is invalid. | Serial/no-parallel decisions must mean no new current-turn child lane launch. | Implementation filters prior `parallelize_now` lineage residue out of later closeout serial decisions while preserving same-decision failures. | No-op child lanes or broad allowance. |
| `review handoff` / `merge handoff` | Handoff states are lifecycle boundaries. | Handoff closeout should not be classified as ordinary active implementation work. | Implementation rereads terminal/handoff issue truth for the narrow no-child-lane missing-decision closeout case. | Changing team workflow states. |
| `post-merge/Done closeout` | Done closeout should reflect terminal lifecycle proof. | Successful merge/Done closeout should not fail because current active-turn evidence is no longer required. | Implementation returns lifecycle success for terminal closeout when no implementation child-lane launch or dirty source artifact remains. | Merge automation or PR handling outside this issue. |
| `proof lock` | Proof writes rely on durable lock behavior. | Lock safety remains independent of closeout classification. | Implementation keeps proof-lock behavior intact and demotes repeated stale-lock diagnostics to secondary error details when another provider terminal cause exists. | Manual lock deletion or lock weakening. |

## Readiness Gate
- Not done if:
  - protected terms are absent from packet files
  - registry mirrors omit the CO-424 packet
  - active-turn invariant enforcement is weakened
  - handoff closeout is solved by fake same-issue child lanes
  - `proof lock` safety is weakened
- Pre-implementation issue-quality review evidence:
  - 2026-05-04: micro-task path is unavailable because correctness depends on exact failure names, lifecycle surfaces, and proof artifact names.
  - 2026-05-04: the setup packet is sufficient to prepare Backlog promotion; implementation remains future work.
- Safeguard ownership split:
  - parent owns source, docs, validation, Linear, GitHub, PR, and review handoff
  - tests child lane owned the focused `ProviderLinearWorkerRunner.test.ts` patch artifact, then parent imported the patch after helper ledger recovery marked the stale-base child lane invalidated

## Technical Requirements
- Functional requirements:
  - Keep the six CO-424 packet/mirror files current.
  - Keep the `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` CO-424 entries current.
  - Preserve all protected terms exactly.
  - Add focused regressions for post-handoff false `parallelization_decision_missing`.
  - Add focused regressions for post-handoff false `parallelization_serial_conflict`.
  - Preserve true active-turn failures for missing decisions, multiple decisions, `parallelize_now` launch missing, and serial/no-go with fresh current-turn child lanes.
  - Preserve `proof lock` behavior and proof sidecar durability.
- Non-functional requirements:
  - bounded source/test/docs diff
  - no historical issue/PR mutation
  - clear parent/child lane ownership evidence

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes, for no-lineage child-lane timestamp fallback and stale proof-lock diagnostics.
- Required decision: retain the legacy timestamp fallback for child-lane records without decision lineage; prefer decision lineage when available. Owner: CO-424. Review date: next docs freshness cycle. Removal condition: live same-issue child-lane records consistently carry decision lineage and no legacy record family remains.
- Large-refactor check: not required; authority stays in provider-worker closeout and command-runner summary code.

## Architecture & Data
- Architecture / design adjustments: provider-worker closeout now distinguishes raw child-lane history from decision-relevant child-lane launches.
- Data model changes / migrations: none; existing `decision_lineage` and audit entries are reused.
- External dependencies / integrations:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `provider-linear-worker-proof.json`
  - `provider-linear-worker-linear-audit.jsonl`
  - `provider-linear-worker-child-lanes.json`

## Validation Plan
- Implementation lane:
  - `git status --short --branch`
  - protected-term scan with `rg`
  - packet-path scan with `rg`
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - required validation sequence before ready-review handoff:
    - same-issue tests child-lane evidence or recorded parent import evidence
    - `node scripts/spec-guard.mjs --dry-run`
    - `npm run build`
    - `npm run lint`
    - `npm run test`
    - `npm run docs:check`
    - `npm run docs:freshness`
  - focused provider worker regressions for post-handoff false failures
  - focused active-turn invariant regressions remain green
  - normal repo validation floor and review loop
- Rollout verification:
  - this lane proves a CO-423 / PR #721 style closeout no longer ends as `parallelization_decision_missing` or `parallelization_serial_conflict` when handoff/closeout is already terminal.
- Monitoring / alerts:
  - future PR review should verify no weakening of ordinary same-issue child lanes enforcement.

## Open Questions
- Whether provider observability should show both raw and lineage-filtered child-lane counts can be split into a follow-up if review asks for it.

## Approvals
- Reviewer: implementation worker
- Date: 2026-05-05
