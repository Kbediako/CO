---
id: 20260412-linear-95011595-52df-4ad8-9cb5-256e7eee5424
title: CO: stop released provider claims from burning Linear issue-by-id polls
relates_to: docs/PRD-linear-95011595-52df-4ad8-9cb5-256e7eee5424.md
risk: high
owners:
  - Codex
last_review: 2026-04-12
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-95011595-52df-4ad8-9cb5-256e7eee5424.md`
- PRD: `docs/PRD-linear-95011595-52df-4ad8-9cb5-256e7eee5424.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-95011595-52df-4ad8-9cb5-256e7eee5424.md`
- Task checklist: `tasks/tasks-linear-95011595-52df-4ad8-9cb5-256e7eee5424.md`

## Traceability
- Linear issue: `CO-160` / `95011595-52df-4ad8-9cb5-256e7eee5424`
- Linear URL: https://linear.app/asabeko/issue/CO-160/co-stop-released-provider-claims-from-burning-linear-issue-by-id-polls

## Summary
- Objective: stop deferred provider polls from burning direct issue-by-id reads for already released claims while preserving bounded reopen semantics.
- Scope:
  - deferred poll fail-closed classification and refresh routing in `providerIssueHandoff.ts`
  - focused regressions in `ProviderIssueHandoff.test.ts`
- Constraints:
  - preserve `CO-159` dead-active handling and the existing released-claim reopen helpers
  - keep queued or in-progress release cleanup intact where cancellation is still pending
  - avoid widening into request-budget policy or status-surface redesign

## Technical Requirements
- Functional requirements:
  - deferred polls with empty `trackedIssues` must not call direct issue-by-id resolution for retained released inactive or non-mutable claims
  - those claims must remain locally visible without per-poll `updated_at` churn
  - deferred polls with all-retained released claims must not trigger fresh discovery because of those claims
  - existing reopen or revalidation paths for released claims must still work when newer evidence says the issue is runnable again
  - queued or in-progress release cleanup must still retry cancellation when cleanup is genuinely pending
- Non-functional requirements:
  - keep the fix local-first and fail closed
  - keep the implementation narrow to the claim classification and deferred poll routing seam
  - keep the acceptance proof machine-checkable through tests rather than narrative-only inspection
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused `ProviderIssueHandoff` regressions covering two consecutive deferred polls with 128 retained released claims
  - required repo validation floor after implementation
- Rollout verification:
  - no `resolveTrackedIssue` or `dispatch_source_issue_by_id` calls occur for all-released retained claims during deferred polls
  - no fresh discovery refetch occurs in that all-released deferred-poll case
  - released inactive and non-mutable claims remain present with stable local timestamps
  - a non-deferred refresh or newer tracked-issue evidence can still reopen a released claim through the existing bounded seam
- Monitoring / alerts:
  - rely on existing intake-budget telemetry and provider poll source attribution; no new external alerting surface is required in this lane

## Open Questions
- Whether the smallest truthful implementation is to extend `resolveProviderIssuePollFailClosedReason(...)` for released inactive or non-mutable claims only during deferred polls, or to add a released-claim-specific guard before the direct `resolveTrackedIssue(...)` fallback.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-12
