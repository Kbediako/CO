---
id: 20260308-1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction
title: Coordinator Symphony-Aligned Control Action Outcome Shaping Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Action Outcome Shaping Extraction

- Task ID: `1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md`
- Action Plan: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md`

## Scope

- Extract the post-preflight `/control/action` confirmation-versus-apply outcome shaping from `controlServer.ts`.
- Preserve canonical confirmation-required and confirmation-invalid response mapping, replay payload shaping, and post-mutation traceability construction.
- Keep final control mutation, persistence sequencing, runtime publish, and audit emission in `controlServer.ts`.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated `/control/action` outcome helper module under `orchestrator/src/cli/control/`.
2. Move confirmation-required/confirmation-invalid response shaping, replay-versus-apply payload shaping, and canonical post-mutation traceability derivation into that module.
3. Keep the extracted surface data-oriented so `controlServer.ts` still owns:
   - auth/CSRF/runner-only gating
   - route ordering
   - confirmation nonce validation and persistence
   - transport nonce consumption and rollback
   - `controlStore.updateAction(...)`
   - runtime publish decisions
   - final audit-event emission
4. Preserve the existing `/control/action` response contract exactly, including replay semantics and nullability of request/intent ids.

## Risks / Guardrails

- The extraction must not change any existing `/control/action` status code, error code, or payload contract.
- Confirmation-required and confirmation-invalid fast paths must remain byte-for-byte equivalent at the JSON contract level.
- Transport replay/apply traceability must keep replay-entry actor context precedence.
- The seam must stay bounded to outcome shaping and avoid pulling persistence or mutation authority out of `controlServer.ts`.

## Acceptance Criteria

- No `/control/action` contract regressions for confirmation-required, confirmation-invalid, replay, or applied flows.
- Outcome shaping leaves final mutation and publish/audit authority in `controlServer.ts`.
- `controlServer.ts` is reduced by the extracted outcome-shaping logic only.

## Validation

- Direct outcome-helper tests under `orchestrator/tests/` for confirmation-required, confirmation-invalid, replay payload shaping, and canonical transport traceability.
- Targeted `ControlServer` regressions covering `/control/action` confirmation-required, confirmation-invalid, replay, and applied transport payloads after extraction.
- Manual mock control-action outcome artifact.
- Standard closeout lane: delegation guard, spec guard, build, lint, test, docs check, docs freshness, diff budget, review, and `pack:smoke` only if downstream-facing paths change.
