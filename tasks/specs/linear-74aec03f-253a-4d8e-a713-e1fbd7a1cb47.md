---
id: 20260412-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47
title: CO: stop stale review and dead-claim reconciliation from burning Linear requests
status: in_progress
owner: Codex
created: 2026-04-12
last_review: 2026-04-12
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md
related_action_plan: docs/ACTION_PLAN-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md
related_tasks:
  - tasks/tasks-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md
review_notes:
  - 2026-04-12: Opened from Linear issue `CO-159` after rechecking the live CO workflow states with `linear issue-context`; the team exposes `Ready`, `In Progress`, `In Review`, `Merging`, and `Rework`, and the issue started this lane in `Ready` with no attached PR and no prior workpad comment.
  - 2026-04-12: The worker recorded the required same-turn `stay_serial` / `overlapping_scope` parallelization decision, moved the issue from `Ready` to `In Progress`, created the single persistent workpad comment `112fe5a7-e635-4631-a67a-25ac8d02e4b7`, and switched the detached workspace at `121e25b2e` onto branch `linear/co-159-stale-review-dead-claim-burn` before repo edits.
  - 2026-04-12: Pre-implementation issue-quality review approves the bounded seam: preserve `CO-144` and `CO-156`, stop stale dead-claim and review-wait live-read churn through existing provider and control-host reconciliation paths, and do not widen into provider scheduling redesign or manual-state operational workarounds.
---

# Technical Specification

## Context

`CO-159` follows the already-landed webhook-first targeted reconcile and shared request-headroom governor work. Current `main` already has:

- `CO-144` webhook-first targeted reconcile behavior
- `CO-156` shared request-headroom governor and request-burn tracking
- provider-side stale-proof and review-handoff promotion logic in `providerIssueHandoff.ts`
- request-burn source attribution for tracked issue refresh and issue-context helper reads

The remaining gap is stale local truth handling during restart and reconcile. The issue evidence shows:

- `CO-139` stayed locally active as `In Progress` / `running` even though the proof PID was dead and the manifest never reached terminal state
- `CO-96` stayed as a completed review-handoff claim with stale wrapper failure while PR checks or reviews were still pending
- restart and subsequent guarded restarts continued to spend live reads on `dispatch_source_issue_by_id`, `dispatch_source_tracked_issues:fresh_discovery`, and `provider-linear:issue-context:read-issue-context`

This lane must make those stale claim classes fail closed from local manifest or proof evidence sooner, and it must stop no-work recovery from continuing live refresh loops once a bounded snapshot has already confirmed nothing runnable remains.

## Requirements

1. Preserve `CO-144` webhook-first targeted reconcile behavior and `CO-156` shared request-headroom governor behavior.
2. Ensure dead active claims can be released, paused, or demoted from authoritative local manifest or proof staleness evidence before repeated live issue-by-id reads.
3. Ensure completed review-handoff claims waiting on external PR checks or reviewers remain locally classified as review wait and do not schedule provider retry or repeated helper refresh loops.
4. Ensure startup or recovery performs at most one bounded live refresh before cached fail-closed behavior when there is no runnable work or reserve is low.
5. Preserve paused stale workspaces and child-lane artifacts so the operator can resume later.
6. Attribute stale-claim and review-wait reconciliation request burn separately from useful runnable worker operations.
7. Cover the dead active claim and review-wait claim regressions with focused tests.

## Current Truth

- `providerIssueHandoff.ts` already reclassifies several stale running claims from proof evidence, but there is no explicit dead-PID liveness admission path that fails closed before another live tracked-issue refresh.
- `maybeHandleReviewHandoffPromotion(...)` can persist review-handoff blocker truth, but the overall control-host refresh path can still keep pulling live issue data for claims that are already in review wait.
- `controlHostCliShell.ts` currently resolves tracked issues through direct live issue-by-id refresh rather than through the cache-aware helper context reader.
- `controlServerPublicLifecycle.ts` still performs full recovery sweep and fresh discovery scheduling even when no runnable work remains after a bounded restart snapshot.
- `linearDispatchSource.ts` already emits request-burn sources for the observed live-read loops, so the attribution seam exists and should be extended rather than replaced.

## Proposed Design

### 1. Local-first stale active claim suppression

- Teach the provider reconciliation path to treat dead or stale active claims as locally non-runnable earlier from manifest/proof evidence, so a dead worker does not keep forcing issue-by-id refresh.
- Keep the resulting local state resumable by preserving paused workspace and child-lane artifacts.

### 2. Review-wait reconciliation suppression

- When a claim has already reached review handoff and the local evidence says it is waiting on external PR checks or reviewer action, persist that as review-wait truth and avoid retry or helper refresh churn.
- Preserve workpad, PR attachment, and eventual merge-closeout semantics.

### 3. Bounded startup and recovery refresh

- Let startup or recovery perform one bounded live snapshot refresh for stale reconciliation, then fail closed to cached local truth when there is no runnable work or request headroom is below reserve.
- Keep `fresh_discovery` and similar live reads from looping after the bounded refresh confirms there is nothing runnable.

### 4. Request-burn attribution

- Add or refine request-burn attribution labels so stale active reconciliation and review-wait reconciliation remain separately inspectable from useful runnable worker operations.

## Validation Plan

- Run audited docs-review through `linear child-stream --pipeline docs-review`.
- Add or update focused coverage in:
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/LinearDispatchSource.test.ts`
  - `orchestrator/tests/ControlServerPublicLifecycle.test.ts` if startup or recovery gating needs direct coverage
- Verify:
  - dead active claims stop causing repeated live issue-by-id refresh after the bounded reconciliation pass
  - review-wait claims do not trigger retry churn while external PR work is pending
  - no-work startup or recovery does not keep spending requests after the bounded refresh
  - attribution surfaces identify stale-claim and review-wait burn distinctly
- Run the required repo validation floor after implementation.
