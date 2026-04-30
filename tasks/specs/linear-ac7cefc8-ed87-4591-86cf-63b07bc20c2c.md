---
id: 20260425-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c
title: "CO-330 stale-owner/provider-refresh recurrence after PR #624 and PR #658"
relates_to: docs/PRD-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md
risk: high
owners:
  - Codex
last_review: 2026-04-28
related_action_plan: docs/ACTION_PLAN-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md
task_checklists:
  - tasks/tasks-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md
---

## Canonical Reference
- PRD: `docs/PRD-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- Task checklist: `tasks/tasks-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- Source anchor: `ctx:sha256:d14a6cd66c90db64bf91248f6f68d329bf0b540a68b4243aec21a6770b4dce3b#chunk:c000001`

## Summary
- Objective: complete the reopened CO-330 stale-owner/provider-refresh recurrence after PR #624 and PR #658 by pairing the docs refresh with parent-owned recovery fixes and regression coverage.
- Current evidence: the 2026-04-24/2026-04-25 recurrence shows provider workers for `CO-351`, `CO-352`, and `CO-355` still observed `stale_control_host_owner` plus `fetch failed` / `refresh request timeout`, while live `co-status freshness` / `control-host` freshness still timed out or reported stale.
- Current 2026-04-27/2026-04-28 evidence: `CO-403` retained `stale_control_host_owner` plus repeated `refresh request timeout` / `fetch failed`, and `CO-399` `control-host recover` returned `provider_refresh_lifecycle_stuck` even though explicit recovery should preserve provider-worker progress.
- Scope:
  - CO-330 PRD, TECH_SPEC, ACTION_PLAN, task checklist, and `.agent` mirror
  - explicit provider recovery after stale refresh lifecycle evidence
  - focused tests for the repeated probe-timeout recurrence and recovery recurrence
- Constraints:
  - keep stale-owner artifacting and provider refresh retry behavior from PR #624 intact
  - do not broaden the fix into generic host restart, provider queue redesign, or admission/backfill work
  - preserve provider-worker progress while the active worker series remains visible in local provider-intake state

## Issue-Shaping Contract
- User-request translation carried forward: CO-330 must diagnose stale control-host owner failures distinctly, write auditable stale-owner and provider-refresh-failure artifacts, safely reclaim only stale owners, verify `co-status freshness`, and keep provider refresh queue work retryable/resumable after reclaim.
- Protected terms / exact artifact and surface names:
  - `stale_control_host_owner`
  - `stale_reclaimed`
  - `control-host`
  - `provider-linear-worker could not request control-host refresh`
  - `refresh request timeout`
  - `fetch failed`
  - `control-host-stale-owner.json`
  - `provider-control-host-refresh-failure.json`
  - `active_worker_probe_timeout_quarantine`
  - `provider_refresh_lifecycle_stuck`
  - `control-host recover`
  - `/api/v1/provider-worker/recover`
  - `owner pid/host/task/run`
  - `attempted pid/host`
  - `co-status freshness`
  - `owner reclaim`
  - `provider refresh`
  - `retry/resumable queue behavior`
  - `PR #624`
  - `CO-351`
  - `CO-352`
  - `CO-355`
  - `CO-403`
  - `CO-399`
- Related prior context:
  - `CO-152` stale-owner ownership: reference only as prior owner-safety context
  - `CO-119` refresh-timeout recovery: reference only as prior refresh-timeout recovery context
  - PR #624: reference only as the single-retry baseline that proved insufficient for this recurrence
- Nearby wrong interpretations to reject:
  - already owned by `CO-41`
  - only `CO-317` admission/backfill
  - generic host restart workaround
  - stdin bootstrap regression
  - provider refresh queue deletion or terminalization during reclaim

## Not Done If
- A stale owner still appears only as `provider-linear-worker could not request control-host refresh`, `refresh request timeout`, or `fetch failed`.
- No `control-host-stale-owner.json` artifact exists for stale-owner diagnosis.
- `control-host-stale-owner.json` omits `owner pid/host/task/run` or `attempted pid/host`.
- `stale_reclaimed` is recorded, but `co-status freshness` / `control-host` freshness still times out or reports stale state without a failure artifact.
- Persistent refresh failure after reclaim does not write `provider-control-host-refresh-failure.json`.
- `control-host recover` returns `provider_refresh_lifecycle_stuck` for a recoverable provider issue after stale-owner reclaim.
- Owner reclaim can run against an active owner or without liveness evidence.
- Provider refresh queue state is dropped, duplicated, or marked terminal during reclaim.
- Focused validation does not cover the `CO-351` / `CO-352` / `CO-355` recurrence shape.
- The implementation is described as CO-41, CO-317-only, a host restart workaround, or stdin bootstrap regression handling.

## Parity / Alignment Matrix
- Current truth:
  - the prior CO-330 implementation from PR #624 added one bounded retry after `stale_reclaimed`
  - the recurrence still shows stale owner plus provider refresh failures in `CO-351`, `CO-352`, and `CO-355`
  - live `co-status freshness` / `control-host` freshness still timed out or reported stale
- Reference truth:
  - CO-152 owner metadata protects against duplicate/stale owner hazards and must not be weakened
  - CO-119 refresh-timeout recovery preserves truthful provider-worker progress and stuck lifecycle truth
  - PR #624 is a baseline retry implementation, not sufficient completion for the reopened recurrence
- Target truth:
  - packet and mirrors state that `stale_reclaimed` must be followed by successful provider refresh and `co-status freshness` proof
  - `control-host-stale-owner.json` includes `owner pid/host/task/run` and `attempted pid/host`
  - `provider-control-host-refresh-failure.json` records unrecovered refresh/freshness failures after reclaim
  - control-host supervision allows one fail-closed timeout restart, then quarantines repeated same-worker `probe_timeout` churn, while provider refresh is actively in a `refresh:*` phase before `restart_required`
- Explicitly out-of-scope differences:
  - source/test edits in this child lane
  - `tasks/index.json` or docs-freshness registry edits in this child lane
  - broad CO-152 duplicate-host redesign
  - broad CO-119 refresh route redesign
  - CO-317-only admission/backfill behavior
  - generic host restart or stdin bootstrap fixes

## Technical Requirements
- Functional requirements:
  1. Refresh the six CO-330 packet/checklist surfaces for the 2026-04-24/2026-04-25 recurrence.
  2. Preserve the 2026-04-25 source anchor and parent manifest pointer.
  3. Preserve protected terms and wrong-interpretation guardrails in the packet.
  4. Treat active provider refresh polling (`checking=true`, `refresh_phase=refresh:*`, no `restart_required`, no current stuck `reason`) as eligible for the same repeated same-worker probe-timeout quarantine used after lifecycle-stuck restarts, even when a historical `last_error` from the previous retry remains.
  5. Let explicit provider recovery (`control-host recover` / `/api/v1/provider-worker/recover`) reset a stale refresh lifecycle boundary for the recovery attempt so `recoverIssue` can resolve the tracked issue and preserve progress.
  6. State that PR #624's single retry and PR #658's supervision quarantine are insufficient acceptance when operator recovery still fails with `provider_refresh_lifecycle_stuck`.
- Non-functional requirements:
  - concise packet suitable for parent patch export
  - no Linear mutations
  - no full validation suites
  - no edits outside declared file scope
- Interfaces / contracts:
  - `control-host-stale-owner.json` remains the stale-owner ownership diagnostic artifact
  - `provider-control-host-refresh-failure.json` is the unrecovered retry-failure artifact for CO-330
  - `co-status freshness` is a required recovery signal
  - provider refresh queue semantics must remain retryable/resumable after safe reclaim

## Acceptance Criteria
- `stale_control_host_owner` is distinct from duplicate active owner, provider cooldown, API budget exhaustion, and generic `fetch failed`.
- `stale_reclaimed` is followed by provider refresh plus `co-status freshness` / `control-host` freshness proof before the recurrence is considered recovered.
- `control-host-stale-owner.json` records `owner pid/host/task/run`, `attempted pid/host`, stale reason, reclaim outcome, and freshness follow-up.
- Unrecovered `fetch failed` or `refresh request timeout` after reclaim writes `provider-control-host-refresh-failure.json`.
- Provider refresh queue state is preserved without duplicate launch, dropped work, or false terminal state.
- Control-host supervision returns `active_worker_probe_timeout_quarantine` to stop repeated same-worker restart churn during active provider refresh before `restart_required`, preserving the active provider workers instead of rotating the owner again, including retries with a retained historical `last_error`.
- Explicit recovery through `control-host recover` / `/api/v1/provider-worker/recover` preserves provider progress after stale-owner reclaim and stale refresh lifecycle evidence.
- Focused validation covers the reopened recurrence from `CO-351`, `CO-352`, `CO-355`, `CO-403`, and `CO-399`.

## Validation Plan
- Child-lane scoped checks:
  - protected-term text check across the six packet files
  - `git diff --name-only`
  - `git status --short`
- Parent-owned checks:
  - docs-review before implementation
  - focused tests for repeated probe-timeout churn while provider refresh is active before `restart_required`
  - focused tests for explicit recovery when prior provider polling is stuck with `provider_refresh_lifecycle_stuck`
  - explicit regression scenario that keeps `CO-351`, `CO-352`, and `CO-355` visible as active worker series through the quarantine path
  - normal parent validation floor and PR lifecycle

## Risks
- Source payload ambiguity.
  - Mitigation: this packet records source 0 as recurrence provenance, while Linear issue/workpad truth remains parent-owned.
- PR #624 false closure.
  - Mitigation: this packet explicitly says the single retry was insufficient because provider workers still observed stale owner plus refresh failure and freshness staleness.
- Misclassification as generic restart work.
  - Mitigation: protected wrong interpretations reject generic host restart workaround as the durable fix.
- Active owner safety regression.
  - Mitigation: parent implementation must fail closed unless liveness evidence proves the recorded owner is stale.
- Queue state loss.
  - Mitigation: parent implementation must preserve retry/resumable queue behavior through reclaim.
- Freshness drift after reclaim.
  - Mitigation: parent acceptance requires `co-status freshness` / control-host freshness success or explicit unrecovered failure artifacting.

## Completion Criteria
- CO-330 packet and mirrors are refreshed for the recurrence.
- The packet preserves protected terms and rejects wrong interpretations.
- Source/test implementation remains untouched by this child lane.
- `tasks/index.json` and docs-freshness registry remain untouched by this child lane.
- Parent can proceed with docs-review and implementation from the packet.
