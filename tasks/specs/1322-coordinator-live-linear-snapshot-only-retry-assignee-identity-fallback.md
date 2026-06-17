---
id: 20260324-1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback
title: Coordinator Live Linear Snapshot-Only Retry Assignee-Identity Fallback
status: in_progress
owner: Codex
created: 2026-03-24
last_review: 2026-06-17
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md
related_action_plan: docs/ACTION_PLAN-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md
related_tasks:
  - tasks/tasks-1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-03-24: Opened for CO-9 after auditing the queued retry ownership mismatch between the live-resolver path and snapshot-only fallback.
  - 2026-03-24: Upstream authority for the broader orchestration contract remains `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`.
  - 2026-03-24: Current CO truth is that snapshot-only retry fallback reconstructs `assignee_id` from persisted claim state but drops `viewer_id`, which makes self-assigned retries look foreign when live resolution is unavailable.
  - 2026-03-24: The bounded corrective seam is additive persisted viewer identity plus an auth-context fingerprint so fallback reconstruction only replays viewer identity when the current Linear token still matches; the ownership predicate itself should stay unchanged.
  - 2026-04-24: Re-reviewed for CO-343 Apr 24 freshness restoration; the packet remains active historical/operator evidence, so only freshness metadata changed.
  - 2026-05-18: CO-522 active-spec audit found 4 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Technical Specification

## Context

The live-resolver retry path already has the right ownership inputs because it evaluates the current tracked issue with both `viewer_id` and `assignee_id`. The remaining gap is isolated to snapshot-only queued retries. When live resolution is unavailable, `providerIssueHandoff.ts` rebuilds a tracked-issue snapshot from the persisted claim, but that reconstruction hardcodes `viewer_id: null`. For self-assigned issues, this produces a false `assignee_changed` release even though the persisted snapshot still belongs to the same worker.

## Requirements

1. Register the lane across PRD, TECH_SPEC, ACTION_PLAN, checklist, `.agent` mirror, task registry, task snapshot, and docs freshness registry.
2. Capture the Symphony baseline plus the current CO live-resolver and snapshot-only ownership paths before implementation.
3. Persist a separate viewer identity field and auth-context fingerprint in provider intake claims whenever live tracked-issue data is written.
4. Rebuild snapshot-only queued-retry tracked issues with the persisted viewer identity instead of `null`, but only when the current auth fingerprint still matches.
5. Preserve explicit foreign-assignee release behavior when the persisted snapshot already shows ownership moved away.
6. Keep older claims without persisted viewer identity backward-compatible.
7. Run focused regressions for snapshot-only same-worker continuation, mismatched-auth conservative release, and foreign-assignee release, then the full validation floor.

## Current Truth

- Live ownership truth is `isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(...)` in `linearDispatchSource.ts`.
- Snapshot-only queued retries currently use `buildTrackedIssueSnapshotFromClaim(...)`.
- That fallback preserves `assignee_id` but hardcodes `viewer_id: null`.
- Because self-assigned ownership requires `viewer_id === assignee_id`, the fallback misclassifies same-worker queued retries as `provider_issue_released:assignee_changed`.
- The correct fix is to preserve viewer identity separately; deriving it from assignee identity would incorrectly mark persisted foreign assignees as owned.
- The persisted viewer identity also needs an auth-context guard, so stale viewer state is not trusted after a Linear token change.

## Validation Plan

- docs-review before implementation
- focused `ProviderIssueHandoff` regressions for snapshot-only same-worker continuation, mismatched-auth conservative release, foreign-assignee release, and backward compatibility
- full repo validation floor
- review/elegance pass before handoff
