---
id: 20260425-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c
title: "CO-330 stale-owner/provider-refresh recurrence after PR #624 and PR #658"
relates_to: docs/PRD-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md
risk: high
owners:
  - Codex
last_review: 2026-04-28
---

# TECH_SPEC - CO-330 stale-owner/provider-refresh recurrence after PR #624 and PR #658

This mirror points to the canonical task spec at `tasks/specs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`.

## Implementation Summary
- Preserve CO-330 as the reopened stale control-host owner recovery lane for provider refresh failures that still surface as `provider-linear-worker could not request control-host refresh`, `refresh request timeout`, or `fetch failed` after PR #624.
- The 2026-04-24/2026-04-25 recurrence is specific: `CO-351`, `CO-352`, and `CO-355` provider workers still observed `stale_control_host_owner` plus failed refresh, and live `co-status freshness` / `control-host` freshness still timed out or reported stale.
- A bounded child lane refreshed the packet. The parent implementation targets the surviving recurrence in control-host supervision: first timeout restart remains fail-closed, then repeated same-worker `probe_timeout` churn is quarantined while provider refresh is active before `restart_required`, including active retries that still carry a historical `last_error`.
- The 2026-04-27/2026-04-28 recurrence adds a second surviving seam after PR #658: `CO-403` kept logging stale-owner `refresh request timeout` / `fetch failed`, and `CO-399` `control-host recover` returned `provider_refresh_lifecycle_stuck` instead of preserving provider progress through explicit recovery.
- The current implementation target is the explicit provider recovery path: `control-host recover` / `/api/v1/provider-worker/recover` must reset the stale refresh lifecycle for a recovery attempt and then recover/resume/release from the latest tracked issue state instead of failing with a stuck-lifecycle 500.
- Preserve source/test behavior from PR #624 for `stale_control_host_owner`, `stale_reclaimed`, `control-host-stale-owner.json`, `provider-control-host-refresh-failure.json`, safe owner reclaim, provider refresh retry/resume semantics, and `co-status freshness` verification.
- CO-152 stale-owner ownership, CO-119 refresh-timeout recovery, and PR #624 are prior related context only; they do not make the reopened recurrence complete.

## Issue-Shaping Contract
- Protected terms / exact artifact and surface names: `stale_control_host_owner`, `stale_reclaimed`, `control-host`, `provider-linear-worker could not request control-host refresh`, `refresh request timeout`, `fetch failed`, `control-host-stale-owner.json`, `provider-control-host-refresh-failure.json`, `active_worker_probe_timeout_quarantine`, `provider_refresh_lifecycle_stuck`, `control-host recover`, `/api/v1/provider-worker/recover`, `owner pid/host/task/run`, `attempted pid/host`, `co-status freshness`, `owner reclaim`, `provider refresh`, `retry/resumable queue behavior`.
- Nearby wrong interpretations to reject: already owned by `CO-41`, only `CO-317` admission/backfill, generic host restart workaround, stdin bootstrap regression.
- Explicit non-goals: Linear mutation outside the workpad/state workflow, `tasks/index.json` edits, docs-freshness registry edits, broad control-host restart redesign, provider queue deletion during reclaim.

## Not Done If
- A stale owner still appears only as `provider-linear-worker could not request control-host refresh`, `refresh request timeout`, or `fetch failed`.
- `stale_reclaimed` is recorded without provider refresh plus `co-status freshness` / `control-host` freshness proof or an explicit failed-freshness artifact path.
- `control-host-stale-owner.json` omits `owner pid/host/task/run` or `attempted pid/host`.
- Persistent refresh failure after reclaim does not write `provider-control-host-refresh-failure.json`.
- `control-host recover` returns `provider_refresh_lifecycle_stuck` for a recoverable provider issue after stale-owner reclaim.
- Provider refresh queue state is dropped, duplicated, or falsely marked terminal during reclaim.
- Focused validation does not cover the `CO-351`, `CO-352`, `CO-355`, `CO-403`, and `CO-399` recurrence shape.

## Recurrence Parity Matrix
| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| Owner metadata | PR #624 can report `stale_reclaimed`, but recurrence evidence still shows `stale_control_host_owner` during provider refresh. | Active owners fail closed; stale owners may be reclaimed only after liveness proof. | `control-host-stale-owner.json` includes owner/attempt metadata, stale reason, reclaim result, and freshness follow-up. |
| Provider refresh | `CO-351`, `CO-352`, and `CO-355` still saw `fetch failed` / `refresh request timeout` after stale-owner handling. | Retryable provider refresh work remains recoverable until a truthful terminal state exists. | Refresh remains retryable/resumable until freshness succeeds or `provider-control-host-refresh-failure.json` records the recurrence. |
| Supervision | Probe timeout restart churn can rotate the owner while refresh is active before `restart_required`. | First timeout restart remains fail-closed for unknown health. | Repeated same-worker `probe_timeout` churn is quarantined while active provider refresh remains visible. |
| Explicit recovery | `CO-403` retained stale-owner refresh failures and `CO-399` `control-host recover` hit `provider_refresh_lifecycle_stuck`. | Operator recovery should safely reset stale lifecycle state and preserve provider-worker progress. | `control-host recover` / `/api/v1/provider-worker/recover` resets stale lifecycle state for recovery and returns a recovery result instead of a stuck-lifecycle 500 for a recoverable issue. |

## Acceptance Criteria
- `stale_control_host_owner` remains distinct from duplicate active owner, provider cooldown, API budget exhaustion, and generic `fetch failed`.
- `stale_reclaimed` is not terminal success unless the subsequent provider refresh and `co-status freshness` prove the owner is current.
- `control-host-stale-owner.json` records `owner pid/host/task/run`, `attempted pid/host`, stale reason, reclaim outcome, and freshness follow-up.
- Persistent recurrence after reclaim writes `provider-control-host-refresh-failure.json` with failure kind, issue identity, owner status, retry attempts, and the ownership diagnostic payload.
- Provider refresh queue state remains retryable/resumable and is not discarded, duplicated, or falsely marked terminal.
- Control-host supervision quarantines repeated same-worker `probe_timeout` restarts while provider refresh is active before `restart_required`, including retries with retained historical `last_error`.
- Explicit provider recovery preserves progress after stale-owner reclaim and stale refresh lifecycle evidence instead of requiring manual rerun/recovery.
- Focused validation covers the observed `CO-351`, `CO-352`, `CO-355`, `CO-403`, and `CO-399` recurrence shape.

## Validation Contract
- Child lane:
  - bounded refresh of the six declared packet/checklist files only
  - protected-term text check across the packet
  - scoped diff/status check showing only declared files changed
  - no full repo validation suites
- Parent lane:
  - docs-review before implementation
  - focused tests for repeated same-worker probe-timeout churn while provider refresh is active before `restart_required`
  - focused tests for explicit provider recovery when prior polling is stuck with `provider_refresh_lifecycle_stuck`
  - recurrence evidence for the `CO-351`, `CO-352`, and `CO-355` active worker series after PR #624's single retry path
  - normal parent-owned validation and PR lifecycle
