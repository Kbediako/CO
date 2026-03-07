---
id: 20260308-1054-coordinator-symphony-aligned-control-action-execution-extraction
title: Coordinator Symphony-Aligned Control Action Execution Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-action-execution-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Action Execution Extraction

- Task ID: `1054-coordinator-symphony-aligned-control-action-execution-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-execution-extraction.md`
- Action Plan: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-execution-extraction.md`

## Summary

- Objective: extract the remaining post-resolution `/control/action` execution orchestration into a dedicated helper.
- Scope: replay resolution, `transportContext` assembly, `controlStore.updateAction(...)`, replay-entry handoff, and typed persist/publish requirements.
- Constraints: preserve replay ordering and keep actual persistence, runtime publish, audit emission, and response writes in `controlServer.ts`.

## Technical Requirements

- Functional requirements:
  - preserve replayed versus applied behavior exactly
  - preserve transport cancel replay precedence and canonical replay ids
  - preserve controller-owned persist/publish/audit boundaries
- Non-functional requirements (performance, reliability, security):
  - continue to replay from a fresh snapshot
  - fail closed when replay or execution inputs are inconsistent
  - keep the extraction narrow and testable
- Interfaces / contracts:
  - new helper returns a discriminated typed result, not raw HTTP responses
  - `controlServer.ts` continues to own side effects and response writes

## Architecture & Data

- Architecture / design adjustments:
  - add `controlActionExecution.ts`
  - move replay resolution out of `controlActionPreflight.ts`
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - no new external integrations

## Validation Plan

- Tests / checks:
  - direct helper tests for replayed and applied execution paths
  - targeted `ControlServer` regressions for transport replay precedence and persist/publish behavior
  - full build/lint/test/docs lane
- Rollout verification:
  - manual mock execution artifact
- Monitoring / alerts:
  - n/a for this bounded extraction

## Open Questions

- None blocking; keep helper outputs typed and narrow rather than widening into a capability bag in this slice.

## Approvals

- Reviewer: Codex self-review plus delegated bounded research streams
- Date: 2026-03-08
