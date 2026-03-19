---
id: 20260308-1055-coordinator-symphony-aligned-control-action-finalization-extraction
title: Coordinator Symphony-Aligned Control Action Finalization Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-action-finalization-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Action Finalization Extraction

- Task ID: `1055-coordinator-symphony-aligned-control-action-finalization-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-finalization-extraction.md`
- Action Plan: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-finalization-extraction.md`

## Scope

- Extract the remaining `/control/action` finalization seam from `controlServer.ts`.
- Centralize replay/applied response shaping and audit payload shaping in a dedicated helper.
- Preserve server-owned persistence, publish, nonce durability, and raw HTTP writes.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/controlActionExecution.ts`
- `orchestrator/src/cli/control/controlActionOutcome.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce `controlActionFinalization.ts` under `orchestrator/src/cli/control/`.
2. Move the remaining finalization logic that:
   - takes either a replay result or an execution result plus canonical ids and transport context;
   - builds the success response payload using the existing outcome builders;
   - shapes the audit payload fields needed by `emitControlActionAuditEvent(...)`;
   - returns a typed plan containing:
     - success response status/body
     - audit outcome/request_id/intent_id/traceability
     - the snapshot to persist/publish/write
     - the already-determined `persistRequired` / `publishRequired` flags
3. Keep `controlServer.ts` responsible for:
   - route ordering and auth/CSRF/runner-only gating
   - cancel-confirmation authority and pre-confirm replay gating
   - transport nonce consume/rollback durability and actual `persist.control()`
   - actual `runtime.publish(...)`
   - actual `emitControlActionAuditEvent(...)`
   - raw HTTP response writes
4. Keep `controlActionExecution.ts` focused on replay/update coordination and keep `controlActionOutcome.ts` as the underlying success payload contract surface.

## Risks / Guardrails

- Pre-confirm cancel replay must remain a controller-owned branch even if finalization becomes shared.
- The helper must not obscure when persistence or publish are required; those remain explicit controller decisions.
- Canonical request/intent ids and replay-entry actor/source/principal precedence must stay unchanged.
- Avoid collapsing the route into a generic “do everything” controller helper; that would over-scope the slice.

## Acceptance Criteria

- `controlActionFinalization.ts` owns replay/applied finalization assembly.
- `controlServer.ts` no longer duplicates replay finalization response/audit shaping.
- Existing `/control/action` contracts and side-effect ordering remain unchanged.

## Validation

- Direct helper tests covering replay and applied finalization plans.
- Targeted `ControlServer` regressions for replay-before-confirmation, persistence retry, transport replay traceability, and applied publish/audit behavior.
- Manual mock finalization artifact.
- Standard closeout lane: delegation guard, spec guard, build, lint, test, docs check, docs freshness, diff budget, review, and `pack:smoke` only if downstream-facing paths change.

## Review Notes

- 2026-03-08 read-only bounded review approved this as the next smallest useful seam after `1054`; evidence: `docs/findings/1055-control-action-finalization-deliberation.md`.
- 2026-03-08 docs-review wrapper drifted into low-signal reinspection and was overridden after green deterministic docs gates; evidence: `out/1055-coordinator-symphony-aligned-control-action-finalization-extraction/manual/20260308T005652Z-docs-first/05-docs-review-override.md`.
