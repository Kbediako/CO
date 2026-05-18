---
id: 20260417-linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378
title: CO prevent operator-autopilot Backlog to Ready re-promotion churn after a manual Ready to Backlog demotion
relates_to: docs/PRD-linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378.md
risk: high
owners:
  - Codex
last_review: 2026-04-17
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378.md`
- PRD: `docs/PRD-linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378.md`
- Task checklist: `tasks/tasks-linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378.md`

## Traceability
- Linear issue: `CO-216` / `8578d3d3-adc7-4391-8d69-0a0fa5e6e378`
- Linear URL: https://linear.app/asabeko/issue/CO-216
- Source anchor: `ctx:sha256:ce6083384b86554ab408103b1cb76c240fe7afc936fa45247ec8a65e67938015#chunk:c000001`
- Source object id: `sha256:ce6083384b86554ab408103b1cb76c240fe7afc936fa45247ec8a65e67938015`
- Expected source payload: `.runs/linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378-docs-packet/cli/2026-04-17T12-58-03-686Z-124efce4/memory/source-0/source.txt`
- Docs packet child lane: `.runs/linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378-docs-packet/cli/2026-04-17T12-58-03-686Z-124efce4/manifest.json`
- Source note: the provided `.runs` payload and manifest are absent in this child checkout, so the packet uses the protected wording from the request plus direct inspection of `providerOperatorAutopilot.ts`, `providerLinearWorkflowFacade.ts`, `providerWorkflowConfigStore.ts`, and `observabilityReadModel.ts`.

## Summary
- Objective: prevent operator-autopilot backlog re-promotion churn after a manual `Ready -> Backlog` demotion while preserving the existing safe backlog-head promotion path, keeping expected-state metadata at the shared transition-helper seam, and improving observability truth.
- Scope:
  - docs-first packet and registry/checklist mirrors for `CO-216`
  - parent-owned backlog-promotion hold logic in `providerOperatorAutopilot.ts`
  - parent-owned autopilot result persistence/projection updates in `providerWorkflowConfigStore.ts` and `observabilityReadModel.ts`
  - parent-owned focused validation in `ProviderOperatorAutopilot.test.ts`, `ProviderWorkflowConfigStore.test.ts`, `ObservabilityReadModel.test.ts`, and existing `ProviderLinearWorkflowFacade.test.ts` preserve coverage where needed
- Constraints:
  - child lane remains docs-only; parent owns implementation, tests, docs-review, validation, Linear/workpad reconciliation, PR, and merge
  - preserve normal safe backlog-head promotion when no manual-demotion signal exists
  - preserve existing `CO-215` transition-guard semantics rather than reopening generic transition design

## Issue-Shaping Contract
- User-request translation carried forward: this is a bounded `operator-autopilot` backlog-promotion hold lane that prevents `Backlog -> Ready` re-promotion churn after a manual `Ready -> Backlog` demotion, keeps normal safe backlog-head promotion when no manual-demotion signal exists, keeps backlog-promotion expected-state metadata at the shared transition-helper seam, and surfaces `issue updated_at`, hold reason, and force-path usage through observability.
- Protected terms / exact artifact and surface names:
  - `operator-autopilot`
  - `Backlog to Ready`
  - `manual Ready to Backlog demotion`
  - `re-promotion churn`
  - `providerOperatorAutopilot.ts`
  - `runProviderOperatorAutopilot(...)`
  - `maybeRunBacklogPromotion(...)`
  - `previous_result`
  - `ProviderOperatorAutopilotResult`
  - `ProviderOperatorAutopilotActionRecord`
  - `ProviderOperatorAutopilotHoldRecord`
  - `providerLinearWorkflowFacade.ts`
  - `transitionProviderLinearIssueState(...)`
  - `expectedStateName`
  - `expectedStateType`
  - `expectedUpdatedAt`
  - `force`
  - `forceReason`
  - `transition_guard`
  - `providerWorkflowConfigStore.ts`
  - `observabilityReadModel.ts`
- Nearby wrong interpretations to reject:
  - broad scheduler or queue-order redesign
  - generic `CO-215` CAS/transition work
  - reclaim, refresh-stall, or control-host lifecycle repair
  - permanent suppression of all future backlog promotion for the issue
  - dropping expected-state metadata from backlog promotion
  - child-lane source or test edits
- Explicit non-goals carried forward:
  - no queue-ranking redesign
  - no reclaim or refresh-stall remediation
  - no generic transition-contract expansion
  - no source/test edits from this child lane

## Parity / Alignment Matrix
- Current truth:
  - `maybeRunBacklogPromotion(...)` already passes `expectedStateName`, `expectedStateType`, and `expectedUpdatedAt`
  - `transitionProviderLinearIssueState(...)` already supports `transition_guard` including force metadata
  - `mapTransitionRecord(...)` narrows autopilot transition output to state names, `issue_updated_at`, and error
  - `runProviderOperatorAutopilot(...)` does not currently use `previous_result` to suppress a newer manual demotion snapshot
  - `observabilityReadModel.ts` exposes hold reason and action `issue_updated_at`, but not force-path usage
- Reference truth:
  - backlog promotion should remain safe and explicit
  - a manual demotion should not cause churn on the next autopilot cycle
  - operators should be able to explain promotions and holds from stored result and observability payloads
- Target truth / intended delta:
  - a manual `Ready -> Backlog` demotion creates a bounded hold for that exact snapshot
  - normal safe backlog-head promotion remains unchanged when the signal is absent
  - backlog promotion continues to pass expected-state metadata through the shared transition helper
  - observability includes `issue updated_at`, hold reason, and whether a force path was used
- Explicitly out-of-scope differences:
  - scheduler redesign
  - reclaim or refresh-stall repair
  - generic `CO-215` transition redesign
  - new broad backlog lifecycle framework

## Readiness Gate
- Not done if:
  - autopilot still re-promotes the same issue immediately after a manual `Ready -> Backlog` demotion
  - normal safe backlog-head promotion regresses when no manual-demotion signal exists
  - backlog promotion no longer passes expected-state metadata into the shared transition helper
  - observability still cannot report `issue updated_at`, hold reason, and force-path usage for this lane
  - the parent implementation must redesign scheduling to close the issue
- Pre-implementation issue-quality review evidence:
  - 2026-04-17: current code audit confirms the narrow seam. `maybeRunBacklogPromotion(...)` already passes `expectedStateName`, `expectedStateType`, and `expectedUpdatedAt`; `transitionProviderLinearIssueState(...)` already exposes `transition_guard` including force fields; `mapTransitionRecord(...)` strips that metadata from autopilot action output; and backlog promotion does not currently consult `previous_result`. The issue is therefore narrower than scheduler redesign and narrower than generic `CO-215` work. The micro-task path is ineligible because correctness depends on exact protected wording, exact result/observability surfaces, and exact acceptance coverage.
- Safeguard ownership split:
  - child lane owns only the packet files and listed registry/checklist mirrors
  - parent lane owns implementation, focused tests, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and patch integration

## Technical Requirements
- Functional requirements:
  1. Create the docs-first packet and registry/checklist mirrors for `CO-216`.
  2. Detect when the same issue was autopilot-promoted to `Ready` and later appears as `Backlog` with a newer snapshot consistent with manual demotion.
  3. Record a bounded hold for that exact manual-demotion snapshot so the next autopilot cycle does not re-promote it immediately.
  4. Preserve normal safe backlog-head promotion when no manual-demotion signal exists.
  5. Preserve backlog-promotion expected-state metadata (`expectedStateName`, `expectedStateType`, `expectedUpdatedAt`) at the shared transition-helper seam.
  6. Surface the relevant `issue updated_at`, hold reason, and whether a force path was used in operator-facing observability.
  7. Keep any force-path handling observational and additive; no new generic force behavior is required for backlog promotion by default.
  8. Keep the hold bounded so later distinct backlog snapshots can still be reevaluated.
  9. Avoid broad scheduler, reclaim, or refresh redesign.
- Non-functional requirements:
  - preserve current ownership, claim-state, and blocked-by gating
  - keep result and projection fields machine-checkable
  - fail closed when the manual-demotion signal is ambiguous
  - keep schema changes additive and parent-owned
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerOperatorAutopilot.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - persisted `operator_autopilot.last_result`

## Architecture & Data
- Architecture / design adjustments:
  - prefer deriving the manual-demotion hold from existing autopilot promotion result plus current tracked-issue `updated_at` truth
  - preserve `providerLinearWorkflowFacade.ts` as the owner of generic transition-guard semantics
  - extend autopilot result projection rather than inventing a second observability truth path
  - keep the hold logic in backlog-promotion evaluation rather than queue ordering
- Data model changes / migrations:
  - additive result/projection fields only
  - no broad queue or lifecycle migration expected
  - no changes to reclaim or refresh-stall artifacts
- External dependencies / integrations:
  - parent-owned focused regression harness in `ProviderOperatorAutopilot.test.ts`, `ProviderWorkflowConfigStore.test.ts`, `ObservabilityReadModel.test.ts`, and existing `ProviderLinearWorkflowFacade.test.ts`

## Validation Plan
- Child-lane checks:
  - `jq empty tasks/index.json`
  - `git diff --check -- docs/PRD-linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378.md docs/TECH_SPEC-linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378.md docs/ACTION_PLAN-linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378.md tasks/specs/linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378.md tasks/tasks-linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378.md .agent/task/linear-8578d3d3-adc7-4391-8d69-0a0fa5e6e378.md tasks/index.json docs/TASKS.md`
- Parent-lane checks:
  - focused `orchestrator/tests/ProviderOperatorAutopilot.test.ts`
  - focused `orchestrator/tests/ProviderWorkflowConfigStore.test.ts`
  - focused `orchestrator/tests/ObservabilityReadModel.test.ts`
  - preserve-contract `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts` when parent changes transition metadata projection
  - parent-owned docs-review or implementation gate after source edits
- Rollout verification:
  - prove promote -> manual demote -> hold
  - prove normal safe promotion when no manual-demotion signal exists
  - prove stored result / observability expose `issue updated_at`, hold reason, and force-path usage

## Open Questions
- Is a same-issue newer `Backlog` `updated_at` after a prior autopilot promotion sufficient as the bounded manual-demotion signal, or does parent need one additional explicit marker?
- Should the hold clear automatically on any later non-matching `updated_at`, or only after the issue leaves `Backlog` and re-enters?
- Should the projected force-path field be an explicit boolean or a nullable object mirroring the existing `transition_guard` surface?

## Approvals
- Reviewer: docs child lane self-review for packet shape and issue-shaping contract.
- Date: 2026-04-17
