---
id: 20260521-linear-91fd1820-50cd-4d33-97b6-8d62b64ce22f
title: CO-574 Control-Host Recovery Admission Spec
relates_to: docs/PRD-linear-91fd1820-50cd-4d33-97b6-8d62b64ce22f.md
risk: high
owners:
  - Codex
last_review: 2026-05-21
---

## Summary

- Objective: make provider-worker recovery produce durable, truthful state for accepted pending-revalidation no-run claims and stop machine-status/probe churn from hiding recovery truth.
- Scope: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/observabilityApiController.ts`, `orchestrator/src/cli/control/machineStatusController.ts`, machine-status presenter/runtime typing, control-host supervision if needed, and focused tests.
- Constraints: preserve WIP caps, fail closed for stale source/dead host, and keep Linear state transitions governed.

## Issue-Shaping Contract

- User-request translation carried forward: repeated orchestration issues must be root-caused and fixed rather than worked around with state cycling.
- Protected terms / exact artifact and surface names: `control-host`, `/ui/machine-status.json`, `co-status --format json`, `provider_issue_rehydration_pending_revalidation`, `provider_worker_recover_no_launch_evidence`, `provider_issue_start_blocked:max_concurrency`, `launch_token`, `run_id`, `run_manifest_path`.
- Nearby wrong interpretations to reject: raising timeouts only, weakening admission caps, hiding no-run claims from all status, manually editing `provider-intake-state.json`, or unblocking CO-575 by Linear churn.
- Explicit non-goals carried forward: no docs freshness owner repair in this lane, no direct worker launch outside control-host authority unless separately waived, no cloud/CO-490 posture change.

## Parity / Alignment Matrix

- Current truth: explicit `nudge` can observe an accepted pending-revalidation claim without launch evidence and return `provider_worker_recover_no_launch_evidence`; rehydrate refreshes `updated_at` on manifestless accepted claims; `/ui/machine-status.json` has no controller-level timeout/degraded response; machine-status probe timeouts can restart the host while active workers retain stale owner context.
- Reference truth: a recovery state machine should distinguish intermediate pending from terminal failed/released/not-executable outcomes and should keep a stable age anchor for manifestless recovery.
- Target truth / intended delta: accepted/no-run pending-revalidation is intermediate until launch evidence, retry/failure, release, or bounded pending acknowledgement is persisted, and machine-status returns bounded current or degraded JSON even when the presenter read stalls.
- Explicitly out-of-scope differences: broad provider-worker architecture and docs freshness maintenance policy remain unchanged.

## Readiness Gate

- Not done if: `provider_worker_recover_no_launch_evidence` can still be returned from a fresh accepted/no-run pending-revalidation observation while recovery is in flight; repeated rehydrate can reset the stale clock; `/ui/machine-status.json` can hang behind read-model work; active-worker probe timeouts cause restart loops without degraded classification.
- Pre-implementation issue-quality review evidence: live CO-575 and CO-574 nudges reproduced accepted/no-run claims with no launch identity; GPT Pro advisory and read-only subagent review converged on recovery acknowledgement, stable stale anchor, and control-host probe behavior.
- Safeguard ownership split: parent owns docs packet and implementation; no separate provider worker currently owns the CO-574 workspace because control-host admission itself is the blocker.

## Technical Requirements

- Functional requirements:
  - Treat accepted pending-revalidation without launch evidence as queued/pending acknowledgement unless the handoff operation has completed with a terminal result.
  - Preserve or introduce a stable manifestless recovery anchor that rehydrate does not refresh.
  - Bound `/ui/machine-status.json` reads with an explicit degraded fail-closed dataset when the read path times out or fails.
  - Keep capacity-blocked claims truthful and recoverable without hiding real full-capacity states.
  - Classify active-worker machine-status probe timeouts without repeatedly restarting a healthy-enough host.
- Non-functional requirements: bounded status reads, deterministic tests, no extra long-lived processes, no quota-wasting worker loops.
- Interfaces / contracts: existing control-host recover/nudge API response schema remains compatible; new or changed reason values must be explicit and tested.

## Fallback Expiry / Refactor Decision

- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| provider recovery | accepted/no-run pending-revalidation observation | remove fallback | CO-574 | explicit recover/nudge sees accepted claim without launch evidence | 2026-05-21 | 2026-05-21 | immediate | recovery returns queued pending or terminal handoff result, never terminal no-launch observation | Observability API regression |
| provider rehydrate | manifestless accepted stale clock based on refreshed `updated_at` | remove fallback | CO-574 | repeated rehydrate of accepted pending-revalidation | 2026-05-21 | 2026-05-21 | immediate | stable launch/recovery anchor survives rehydrate | ProviderIssueHandoff regression |
| machine-status endpoint | unbounded controller read | expire fallback | CO-574 | presenter/read-model stall under active workers | 2026-05-21 | 2026-05-21 | 30 days | endpoint returns current or `machine_status_degraded` JSON within the controller timeout; remove only if the read path is proven non-blocking by construction | ControlMachineStatusContract regression |
| control-host supervision | restart loop on active-worker probe timeout | justify retaining fallback only for fail-closed dead-host restart | CO-574 | probe timeout while active workers exist | 2026-05-21 | 2026-05-21 | 30 days | degraded active-worker classification has tests and true dead-host restart remains fail-closed | ControlHostSupervision regression |

- Large-refactor check: this lane may touch several related recovery predicates because authority is split across API acknowledgement, provider-intake rehydrate, and supervision. A bounded consolidation is preferred over another narrow timeout patch.

## Architecture & Data

- Architecture / design adjustments: keep the control-host as admission authority but make intermediate accepted/no-run recovery states explicit and non-terminal to callers.
- Data model changes / migrations: prefer reusing existing `launch_started_at` as the stable manifestless anchor where safe; introduce a field only if tests prove existing fields cannot represent the state.
- External dependencies / integrations: none.

## Validation Plan

- Tests / checks: focused `ObservabilityApiController.test.ts`, `ProviderIssueHandoff.test.ts`, and any needed control-host supervision test; then `node scripts/spec-guard.mjs --dry-run`, build/lint/test/docs gates as feasible.
- Rollout verification: CO-574 nudge should stop returning `provider_worker_recover_no_launch_evidence` for the no-run accepted intermediate state after the fix lands.
- Monitoring / alerts: provider-intake status should make accepted/no-run pending-revalidation older than the configured threshold actionable.

## Open Questions

- Whether state-specific capacity caps should be surfaced in `co-status` separately from global `active/max_allowed`.

## Approvals

- Reviewer: parent orchestrator with GPT Pro advisory and read-only subagent evidence
- Date: 2026-05-21
