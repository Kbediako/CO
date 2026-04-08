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

## Scope

- Extract the cancel-only confirmation-resolution branch from `/control/action` in `controlServer.ts`.
- Preserve canonical confirmation nonce validation, confirmed request/intent rebinding, confirmation persistence/event emission, confirmed transport-scope resolution, and mismatch traceability construction.
- Keep transport preflight, replay execution, final control mutation, nonce consume/rollback, runtime publish, and audit emission in `controlServer.ts`.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/confirmations.ts`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated cancel-confirmation resolution helper module under `orchestrator/src/cli/control/`.
2. Move the cancel-only sequence that:
   - reads `tool` / `params`
   - calls `confirmationStore.validateNonce(...)`
   - rebinds canonical `request_id` / `intent_id`
   - persists confirmations via injected callback
   - emits `confirmation_resolved` via injected callback
   - resolves confirmed transport scope
   - returns structured confirmed-scope data or a structured reject result
3. Keep the extracted surface narrow and typed so `controlServer.ts` still owns:
   - route ordering and auth/CSRF/runner-only gating
   - raw HTTP error/success writes
   - shared transport preflight adapter and replay execution
   - transport nonce consume / rollback
   - `controlStore.updateAction(...)`
   - runtime publish
   - final audit-event emission
4. Preserve existing `/control/action` contracts exactly, including confirmation sequencing and confirmed-scope override semantics.

## Risks / Guardrails

- `validateNonce()` mutates confirmation state before the route persists confirmations; the extraction must not reorder nonce consumption durability or `confirmation_resolved` emission.
- Confirmed transport scope must override caller transport metadata exactly before rerunning transport preflight/replay checks.
- The extraction must not change any existing `/control/action` status code, error code, or traceability contract.

## Acceptance Criteria

- The cancel-only confirmation-resolution branch is extracted into a dedicated helper without widening scope into replay or mutation execution.
- `/control/action` confirmation-invalid, confirmation-scope-mismatch, confirmed-scope binding, and nonce-reuse behavior remain unchanged.
- `controlServer.ts` is reduced by the extracted confirmation-resolution logic only.

## Validation

- Direct helper tests under `orchestrator/tests/` for confirmation success, confirmed-scope mismatch, and validation failure.
- Targeted `ControlServer` regressions covering `/control/action` confirmed-scope binding, mismatch traceability, and nonce reuse after cancel confirmation.
- Manual mock confirmation-resolution artifact.
- Standard closeout lane: delegation guard, spec guard, build, lint, test, docs check, docs freshness, diff budget, review, and `pack:smoke` only if downstream-facing paths change.
