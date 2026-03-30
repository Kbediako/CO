---
id: 20260330-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1
title: CO: Investigate control-host provider refresh stall that stops new Ready issue pickup until restart
relates_to: docs/PRD-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md
risk: high
owners:
  - Codex
last_review: 2026-03-30
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- PRD: `docs/PRD-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- Task checklist: `tasks/tasks-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`

## Traceability
- Linear issue: `CO-41` / `af97d673-43a4-4a36-8738-b7f61e5b71a1`
- Linear URL: https://linear.app/asabeko/issue/CO-41/co-investigate-control-host-provider-refresh-stall-that-stops-new
- Related evidence issues: `CO-39`, `CO-40` (out of scope)

## Summary
- Objective: Make the control-host provider refresh stall class diagnosable and recoverable without restart as the first operator action.
- Scope:
  - docs-first registration for `CO-41`
  - investigation of the serialized provider refresh / poll lifecycle seam
  - explicit degraded or stuck health evidence in control-host read surfaces
  - minimal safe recovery or restart-required signaling
  - focused reproducer or regression coverage plus normal validation before handoff
- Constraints:
  - keep `CO-39`, `CO-40`, and unrelated Linear write failures out of scope
  - preserve serialized correctness and avoid duplicate or unsafe issue claims
  - do not widen into a broad control-plane rewrite without evidence

## Technical Requirements
- Functional requirements:
  - detect when refresh lifecycle progress has exceeded a safe budget or become wedged
  - expose explicit degraded, stuck, and/or restart-required evidence through operator-facing health surfaces
  - maintain or restore provider progress without requiring blind operator restarts when safe to do so
  - cover the stale-live-instance / healthy-refresh-replay class with focused automated or scripted evidence
- Non-functional requirements (performance, reliability, security):
  - preserve serialized refresh correctness and avoid concurrent refresh corruption
  - keep observability truthful when recovery is unsafe by failing closed into explicit restart-required evidence
  - keep the repair bounded to the local control-host provider refresh lifecycle and adjacent read surfaces
- Interfaces / contracts:
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityApiController.ts`
  - operator-facing `provider-intake-state.json` and related observability payloads

## Architecture & Data
- Architecture / design adjustments:
  - instrument the serialized refresh lifecycle with explicit progress timing and stuck-state tracking
  - add a bounded watchdog or recovery seam where a never-resolving refresh currently blocks future provider progress
  - surface machine-checkable refresh health in the persisted intake snapshot and/or observability API responses
- Data model changes / migrations:
  - widen intake or observability state with refresh health metadata if required
  - no repo data migration expected
- External dependencies / integrations:
  - stale intake snapshot and cited worker manifests from the incident
  - Linear dispatch-source query behavior used by control-host provider refresh

## Validation Plan
- Tests / checks:
  - focused refresh serialization / control runtime / observability tests covering the wedge class
  - required repo validation floor after implementation
- Rollout verification:
  - confirm explicit stuck or degraded evidence appears when refresh exceeds budget
  - confirm eligible `Ready` issues can be picked up again after safe recovery, or that restart-required evidence is emitted when recovery is unsafe
- Monitoring / alerts:
  - rely on persisted intake state, observability API evidence, and the workpad/task packet for this lane

## Open Questions
- Which exact layer should own restart-required signaling versus safe self-recovery?
- Does the operator-facing evidence need to live in both persisted intake state and API reads to remain useful under partial outages?

## Approvals
- Reviewer: docs-review approved via `/Users/kbediako/Code/CO/.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-review/cli/2026-03-30T01-25-36-879Z-17cd2f7d/manifest.json`
- Date: 2026-03-30
