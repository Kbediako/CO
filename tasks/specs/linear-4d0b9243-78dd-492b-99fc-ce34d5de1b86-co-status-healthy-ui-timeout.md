---
id: 20260428-linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86
title: CO-407 co-status healthy control-host UI timeout classification
relates_to: docs/PRD-linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86.md
risk: high
owners:
  - Codex
last_review: 2026-04-28
related_action_plan: docs/ACTION_PLAN-linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86.md
task_checklists:
  - tasks/tasks-linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86.md
---

## Added by Docs Packet 2026-04-28

## Summary
- Objective: Define the CO-407 docs-first contract for `co-status --format json` when a `healthy control host` with `provider intake fresh` evidence has a `slow /ui/data.json` read and reports `control-host ui request timeout after 15000ms`.
- Scope: Docs packet, task registry, task checklist, and `.agent` mirror only. Parent lane owns live issue reconciliation, implementation, validation, Linear state, workpad, PR lifecycle, and merge.
- Constraints: Preserve protected terms exactly, keep `stale endpoint/dead-port recovery` separate from slow current-endpoint reads, and verify `CO-246`, `CO-404`, and `CO-406` boundaries before implementation.

## Issue-Shaping Contract
- User-request translation carried forward: CO-407 should keep `co-status --format json` truthful when the host is healthy and provider intake is fresh but `/ui/data.json` times out after 15000ms; the timeout must be visible without making the host look stale, dead, or unavailable.
- Protected terms / exact artifact and surface names: `co-status --format json`, `healthy control host`, `provider intake fresh`, `slow /ui/data.json`, `control-host ui request timeout after 15000ms`, `stale endpoint/dead-port recovery`, `CO-246`, `CO-404`, `CO-406`.
- Nearby wrong interpretations to reject: Same-endpoint slowness is not `stale endpoint/dead-port recovery`; a healthy host with fresh provider intake is not dead solely because `/ui/data.json` exceeded 15000ms; timeout reasons must not disappear; CO-407 must not silently absorb CO-246, CO-404, or CO-406.
- Explicit non-goals carried forward: No source/test edits in this child lane, no Linear mutation, no PR lifecycle work, no broad provider-intake truth redesign, no launch/restart policy redesign, and no unrelated CO-404/CO-406 implementation.

## Parity / Alignment Matrix
- Current truth: The current direct JSON status path can conflate `slow /ui/data.json` timeout behavior with degraded or unavailable host classification even when host health and provider intake evidence are fresh.
- Reference truth: `CO-246` protects stale/dead endpoint recovery, while CO-407 protects slow current-endpoint timeout classification for a healthy host. `CO-404` and `CO-406` remain related boundaries that parent must verify against live issue text or implementation evidence.
- Target truth / intended delta: `co-status --format json` emits a distinct timeout/degraded-read reason for `control-host ui request timeout after 15000ms`, preserves healthy host and provider intake freshness evidence, and reserves `stale endpoint/dead-port recovery` for stale/dead endpoint cases.
- Explicitly out-of-scope differences: Current-state authority consolidation, provider-intake model redesign, control-host supervision changes, stale/dead endpoint recovery redesign, and code/test changes in this docs packet.

## Readiness Gate
- Not done if:
  - `control-host ui request timeout after 15000ms` makes a `healthy control host` with `provider intake fresh` appear dead.
  - `slow /ui/data.json` is handled by `stale endpoint/dead-port recovery`.
  - Timeout evidence is hidden or dropped from JSON output.
  - `CO-246`, `CO-404`, or `CO-406` behavior regresses or is widened without parent-owned evidence.
- Pre-implementation issue-quality review evidence: The issue is not merely a retry or dead-port recovery lane. It specifically requires distinguishing slow current UI reads from stale/dead endpoints while retaining healthy-host and provider-intake truth.
- Safeguard ownership split: This child lane owns only the declared docs files. Parent owns implementation files, test selection, live Linear/workpad state, PR lifecycle, and full validation.

## Technical Requirements
- Functional requirements:
  - Preserve `healthy control host` and `provider intake fresh` evidence in `co-status --format json` even when `/ui/data.json` is slow.
  - Classify `control-host ui request timeout after 15000ms` as an auditable timeout/degraded-read reason, not as a dead host.
  - Keep `stale endpoint/dead-port recovery` scoped to stale/dead endpoint cases and verify the `CO-246` boundary.
  - Verify related `CO-404` and `CO-406` behavior before implementation changes shared status/timeout surfaces.
  - Add parent-owned focused regression coverage for the healthy-host slow UI read case and negative stale/dead endpoint boundary.
- Non-functional requirements: Output must remain deterministic, machine-readable, and operator-auditable; slow-read recovery must not create extra host restarts, duplicate control hosts, or provider-intake churn.
- Interfaces / contracts:
  - `co-status --format json` JSON status output.
  - `/ui/data.json` direct dashboard read path and timeout budget.
  - Provider-intake freshness projection.
  - Stale/dead endpoint recovery path protected by `CO-246`.
  - Parent-verified related `CO-404` and `CO-406` status/timeout behavior.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `co-status --format json` / `/ui/data.json` | `slow /ui/data.json` is classified like unavailable/dead endpoint recovery. | `remove fallback` | CO-407 parent lane | `/ui/data.json` exceeds 15000ms while control-host health and provider-intake evidence are fresh. | 2026-04-28 | 2026-04-28 | Immediate removal in CO-407 | Slow UI read has a distinct timeout/degraded-read reason while healthy-host and fresh-intake truth remain visible. | Focused healthy-control-host timeout regression. |
| `stale endpoint/dead-port recovery` | Dead-port recovery remains available for stale or refused endpoints. | `justify retaining fallback` | CO-246 with CO-407 boundary check | Resolved endpoint is stale, dead, refused, or no longer points at the live host. | CO-246 era; boundary reviewed 2026-04-28 | 2026-04-28 | Durable recovery contract | Retained only for stale/dead endpoints; not used for slow current endpoint timeout classification. | Existing stale/dead endpoint regression plus CO-407 negative boundary assertion. |
| Related issue boundaries | Shared status/timeout changes could weaken `CO-404` or `CO-406`. | `justify retaining fallback` | Parent lane verifies CO-404 / CO-406 | Parent implementation touches shared co-status/control-host timeout surfaces. | 2026-04-28 | 2026-04-28 | Durable boundary guard | Related behavior is preserved or parent records explicit reconciliation evidence before handoff. | Parent-owned related regression or no-touch evidence. |

- For `justify retaining fallback`, contract name: direct status endpoint recovery boundary.
- Owning surface: `co-status --format json` and control-host direct-read status classification.
- Steady-state proof expectation: Parent captures JSON output or focused tests proving slow current endpoint, stale/dead endpoint, and related CO-404/CO-406 boundaries remain distinguishable.
- Large-refactor check: A narrow fix is acceptable if the existing status read path can distinguish host health, provider-intake freshness, UI timeout, and dead endpoint authority. Escalate if the implementation requires a new current-state authority model.

## Architecture & Data
- Architecture / design adjustments: Parent should preserve separate fields or reasons for host health, provider-intake freshness, UI data timeout, and endpoint liveness rather than collapsing them into one degraded status.
- Data model changes / migrations: None required by this docs packet. Parent may add or preserve structured timeout/degraded-read metadata if needed.
- External dependencies / integrations: Local control-host endpoint metadata, `/ui/data.json`, provider-intake state, and related issue contracts `CO-246`, `CO-404`, and `CO-406`.

## Validation Plan
- Tests / checks:
  - Focused regression where `co-status --format json` sees a `healthy control host`, `provider intake fresh`, and `slow /ui/data.json` that hits `control-host ui request timeout after 15000ms`.
  - Negative boundary test proving `stale endpoint/dead-port recovery` remains reserved for stale/dead endpoints.
  - Parent-owned related coverage or no-touch evidence for `CO-246`, `CO-404`, and `CO-406`.
  - Scoped packet checks in this child lane: JSON parse for `tasks/index.json`, protected-term grep over touched docs, and `git diff --check` over touched files.
- Rollout verification: Parent captures the focused test output and representative JSON before PR handoff.
- Monitoring / alerts: JSON output should keep timeout reasons and healthy/fresh evidence visible for operator triage.

## Open Questions
- The parent-provided source artifact in this child checkout contains run metadata rather than full issue text. Parent should verify live CO-407, CO-404, and CO-406 wording before implementation.

## Approvals
- Reviewer: Pending parent lane review.
- Date: 2026-04-28
