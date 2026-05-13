---
id: 20260412-linear-e934e6ea-8fdd-480c-9656-22c020cb19cf
title: CO workflow: hard-gate all Linear consumers on shared request headroom
relates_to: docs/PRD-linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md
risk: high
owners:
  - Codex
last_review: 2026-04-12
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`
- PRD: `docs/PRD-linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`
- Task checklist: `tasks/tasks-linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`

## Traceability
- Linear issue: `CO-156` / `e934e6ea-8fdd-480c-9656-22c020cb19cf`
- Linear URL: https://linear.app/asabeko/issue/CO-156/co-workflow-hard-gate-all-linear-consumers-on-shared-request-headroom

## Summary
- Objective: make the configured shared request reserve the hard gate for nonessential Linear consumers and persist shared request-burn attribution over time.
- Scope:
  - `linearBudgetState.ts` reserve-aware shared preflight and shared burn telemetry
  - helper and dispatch callers that already consume shared preflight
  - focused restart/rehydrate/reconcile proof through existing control-host/provider seams
- Constraints:
  - keep `CO-144` webhook-first targeted reconcile intact
  - preserve helper validation/no-op behavior already landed
  - avoid widening into provider replacement or stale-ghost root-cause work

## Technical Requirements
- Functional requirements:
  - reserve-aware preflight fails helper and dispatch live requests before `fetch` when shared request headroom is below reserve
  - existing safe local fallbacks remain available where already supported
  - request-burn telemetry is persisted with source, operation, run/process metadata, request id, remaining delta, reset time, and cooldown reason
  - restart/rehydrate/reconcile paths do not burn live requests below the shared reserve
- Non-functional requirements:
  - keep the implementation centered on the shared governor instead of adding per-caller ad hoc policy
  - keep telemetry bounded and machine-checkable
  - preserve truthful failure classification between request exhaustion, low headroom, and complexity shortfall
- Interfaces / contracts:
  - `orchestrator/src/cli/control/linearBudgetState.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused `LinearBudgetState` and `LinearDispatchSource` regressions
  - required repo validation floor after implementation
- Rollout verification:
  - no live helper or dispatch request is attempted when reserve-aware preflight says headroom is insufficient
  - shared telemetry survives across multiple observations and exposes burn deltas for local diagnostics
- Monitoring / alerts:
  - rely on shared budget state and local diagnostics surfaces; no new external alerting surface is required in this lane

## Open Questions
- Whether the bounded telemetry history should live inline with the shared budget snapshot or in a sibling persisted surface. Default to the smallest truthful shape that local diagnostics can read without extra orchestration.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-12
