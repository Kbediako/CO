---
id: 20260423-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c
title: "CO-330 stale control-host owner reclaim and provider refresh retry recovery"
relates_to: docs/PRD-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md
risk: high
owners:
  - Codex
last_review: 2026-04-23
related_action_plan: docs/ACTION_PLAN-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md
task_checklists:
  - tasks/tasks-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md
---

## Canonical Reference
- PRD: `docs/PRD-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- Task checklist: `tasks/tasks-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- Source anchor: `ctx:sha256:dd72505af8602844d9a722f7d0cac31d98fe08f25d84adb745ed3f979b6c8cf8#chunk:c000001`

## Summary
- Objective: create the docs-first packet and task registration for CO-330 stale control-host owner reclaim and provider refresh retry recovery.
- Current evidence: parent handoff identifies stale owner recovery as the issue shape and protects the terms `stale_control_host_owner`, `control-host`, `provider-linear-worker could not request control-host refresh`, `refresh request timeout`, `fetch failed`, `control-host-stale-owner.json`, `provider-control-host-refresh-failure.json`, `owner reclaim`, `provider refresh`, and `retry/resumable queue behavior`.
- Scope:
  - CO-330 PRD, TECH_SPEC, ACTION_PLAN, task checklist, and `.agent` mirror
  - `tasks/index.json` registration
  - parent-owned implementation plan for stale-owner artifact, owner reclaim, and provider refresh queue resume behavior
- Constraints:
  - child lane must not edit source or tests
  - parent owns Linear state, workpad, PR lifecycle, implementation, and full validation
  - do not call Linear mutation helpers
  - do not run full repo validation suites

## Issue-Shaping Contract
- User-request translation carried forward: CO-330 must diagnose stale control-host owner failures distinctly, write an auditable stale-owner artifact, safely reclaim only stale owners, and keep provider refresh queue work retryable/resumable after reclaim.
- Protected terms / exact artifact and surface names:
  - `stale_control_host_owner`
  - `control-host`
  - `provider-linear-worker could not request control-host refresh`
  - `refresh request timeout`
  - `fetch failed`
  - `control-host-stale-owner.json`
  - `provider-control-host-refresh-failure.json`
  - `owner reclaim`
  - `provider refresh`
  - `retry/resumable queue behavior`
- Related prior context:
  - `CO-152` stale-owner ownership: reference only as prior owner-safety context
  - `CO-119` refresh-timeout recovery: reference only as prior refresh-timeout recovery context
- Nearby wrong interpretations to reject:
  - already owned by `CO-41`
  - only `CO-317` admission/backfill
  - generic host restart workaround
  - stdin bootstrap regression
  - provider refresh queue deletion or terminalization during reclaim

## Parity / Alignment Matrix
- Current truth:
  - the CO-330 packet is absent before this lane
  - the parent-provided issue shape centers on stale control-host owner recovery during provider refresh request failures
  - source-0 payload is present in the parent workspace and records run metadata/provenance
- Reference truth:
  - CO-152 owner metadata protects against duplicate/stale owner hazards and must not be weakened
  - CO-119 refresh-timeout recovery preserves truthful provider-worker progress and stuck lifecycle truth
  - docs-first packets register canonical specs in `tasks/index.json`
- Target truth:
  - CO-330 packet and mirrors are present
  - stale-owner recovery requirements are clear before source edits begin
  - `tasks/index.json` links the canonical spec and task checklist
  - parent can implement focused stale-owner artifact, reclaim, and provider refresh queue resume behavior
- Explicitly out-of-scope differences:
  - source/test edits in this child lane
  - broad CO-152 duplicate-host redesign
  - broad CO-119 refresh route redesign
  - CO-317-only admission/backfill behavior
  - generic host restart or stdin bootstrap fixes

## Technical Requirements
- Functional requirements:
  1. Create the six CO-330 packet/checklist surfaces.
  2. Link the canonical spec and checklist in `tasks/index.json`.
  3. Preserve protected terms and wrong-interpretation guardrails in the packet.
  4. Define parent-owned implementation requirements for `stale_control_host_owner`, `control-host-stale-owner.json`, `provider-control-host-refresh-failure.json`, owner reclaim, provider refresh, and retry/resumable queue behavior.
  5. Record source payload provenance for parent reconciliation.
- Non-functional requirements:
  - concise packet suitable for parent patch export
  - no Linear mutations
  - no full validation suites
  - no edits outside declared file scope
- Interfaces / contracts:
  - `tasks/index.json` remains canonical under `items[]`
  - `control-host-stale-owner.json` remains the stale-owner ownership diagnostic artifact
  - `provider-control-host-refresh-failure.json` is the unrecovered retry-failure artifact for CO-330
  - provider refresh queue semantics must remain retryable/resumable after safe reclaim

## Validation Plan
- Child-lane scoped checks:
  - JSON parse for `tasks/index.json`
  - `git diff --name-only`
  - `git status --short`
- Parent-owned checks:
  - docs-review before implementation
  - standalone review approval recorded: `bounded-success` (command-intent retry against the user-intent handoff)
  - focused tests for active owner refusal, stale owner reclaim, stale-owner artifact shape, and provider refresh queue resume behavior
  - normal parent validation floor and PR lifecycle

## Risks
- Source payload ambiguity.
  - Mitigation: this packet records that source-0 is run metadata/provenance while the Linear issue text remains the requirements source.
- Misclassification as generic restart work.
  - Mitigation: protected wrong interpretations reject generic host restart workaround as the durable fix.
- Active owner safety regression.
  - Mitigation: parent implementation must fail closed unless liveness evidence proves the recorded owner is stale.
- Queue state loss.
  - Mitigation: parent implementation must preserve retry/resumable queue behavior through reclaim.

## Completion Criteria
- CO-330 packet and mirrors exist.
- `tasks/index.json` includes the CO-330 item and parses as JSON.
- The packet preserves protected terms and rejects wrong interpretations.
- Source/test implementation remains untouched by this child lane.
- Parent can proceed with docs-review and implementation from the packet.
