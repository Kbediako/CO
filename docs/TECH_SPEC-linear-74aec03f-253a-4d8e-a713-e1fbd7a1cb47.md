---
id: 20260412-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47
title: CO: stop stale review and dead-claim reconciliation from burning Linear requests
relates_to: docs/PRD-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md
risk: high
owners:
  - Codex
last_review: 2026-04-12
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`
- PRD: `docs/PRD-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`
- Task checklist: `tasks/tasks-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`

## Traceability
- Linear issue: `CO-159` / `74aec03f-253a-4d8e-a713-e1fbd7a1cb47`
- Linear URL: https://linear.app/asabeko/issue/CO-159/co-stop-stale-review-and-dead-claim-reconciliation-from-burning-linear

## Summary
- Objective: stop stale active claims, completed review-handoff claims, and no-work restart or recovery loops from repeatedly burning live Linear requests.
- Scope:
  - provider stale-claim and review-handoff reconciliation in `providerIssueHandoff.ts`
  - control-host tracked-issue refresh and recovery decisions in `controlHostCliShell.ts` and `controlServerPublicLifecycle.ts`
  - live tracked-issue read behavior and request-burn attribution in `linearDispatchSource.ts`
- Constraints:
  - preserve `CO-144` webhook-first targeted reconcile behavior
  - preserve `CO-156` shared request-headroom governor
  - keep workpads, PR attachment, review handoff, and merge closeout intact

## Technical Requirements
- Functional requirements:
  - dead active claims must be downgraded, paused, or released from manifest/proof staleness evidence before repeated issue-by-id reads
  - completed review-handoff claims waiting on external PR checks or reviewers must not schedule retry or repeated refresh loops
  - startup or recovery performs at most one bounded live snapshot refresh, then uses cached local truth when there is no runnable work or request headroom is below reserve
  - request-burn telemetry attributes stale-claim and review-wait reconciliation separately from useful runnable worker work
  - paused stale workspaces remain resumable later without losing docs-first or child-lane artifacts
- Non-functional requirements:
  - keep the logic local-first and fail-closed rather than inventing another polling lane
  - use bounded cached state and existing manifests or proofs as the source of truth wherever possible
  - keep telemetry machine-checkable and bounded
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused regressions for `CO-139` dead active claim behavior and `CO-96` completed review-handoff wait behavior
  - required repo validation floor after implementation
- Rollout verification:
  - a dead active claim stops causing repeated `dispatch_source_issue_by_id` reads after one bounded refresh
  - a completed review-handoff claim in `In Review` or `Human Review` remains locally visible without provider retry churn
  - no-work startup or recovery does not continue fresh discovery or repeated recovery sweeps once cached state says there is nothing runnable
- Monitoring / alerts:
  - rely on shared request-burn telemetry plus existing local diagnostics and status consumers; no new external alerting surface is required in this lane

## Open Questions
- Whether the smallest truthful fix is to make the tracked issue refresh path cache-aware, or to add a narrow reconciliation suppression layer around stale active and review-wait classifications while keeping live tracked-issue readers otherwise unchanged.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-12
