---
id: 20260308-1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction
title: Coordinator Symphony-Aligned Control Action Cancel Confirmation Resolution Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Action Cancel Confirmation Resolution Extraction

- Task ID: `1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md`
- Action Plan: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md`

## Summary

- Objective: extract the cancel-only confirmation-resolution branch from `/control/action` into a dedicated helper.
- Scope: validation, canonical id rebinding, confirmation persistence/event emission, confirmed transport-scope resolution, and mismatch traceability shaping.
- Constraints: preserve existing sequencing and keep transport preflight/replay, mutation, publish, and audit authority in `controlServer.ts`.

## Technical Requirements

- Functional requirements:
  - preserve `confirmation_invalid` and `confirmation_scope_mismatch` behavior exactly
  - preserve confirmed-scope binding when top-level transport metadata is omitted
  - preserve nonce-reuse handling for `/control/action`
- Non-functional requirements (performance, reliability, security):
  - fail closed on invalid/reused confirmations
  - do not weaken confirmed-scope override semantics
  - keep the extraction narrow and testable
- Interfaces / contracts:
  - helper returns structured success or structured reject data
  - `controlServer.ts` keeps raw HTTP writes and downstream execution control

## Architecture & Data

- Architecture / design adjustments:
  - add a cancel-confirmation resolution helper under `orchestrator/src/cli/control/`
  - inject persistence/event side-effect callbacks instead of widening helper authority
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - confirmation store and control event emission remain local runtime dependencies

## Validation Plan

- Tests / checks:
  - direct helper tests for success, mismatch, and validation failure
  - targeted `ControlServer` regressions for confirmed-scope binding and nonce reuse
  - full build/lint/test/docs lane
- Rollout verification:
  - manual mock confirmation-resolution artifact
- Monitoring / alerts:
  - n/a for this bounded extraction

## Open Questions

- None blocking; the next broader execution-boundary extraction is intentionally deferred until this narrower seam lands.

## Approvals

- Reviewer: Codex self-review plus delegated bounded research streams
- Date: 2026-03-08
