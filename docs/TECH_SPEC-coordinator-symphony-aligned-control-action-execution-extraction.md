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

## Scope

- Extract the remaining post-resolution `/control/action` execution path from `controlServer.ts`.
- Move replay resolution out of `controlActionPreflight.ts` into a new execution helper.
- Preserve `controlStore.updateAction(...)` coordination, replay-entry handoff, and the controller-owned persistence/publish/audit boundaries.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/controlActionPreflight.ts`
- `orchestrator/src/cli/control/controlActionOutcome.ts`
- `orchestrator/tests/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce `controlActionExecution.ts` under `orchestrator/src/cli/control/`.
2. Move the remaining execution logic that:
   - refreshes the snapshot before replay lookup
   - resolves replay matches and canonical replay ids
   - preserves transport-vs-generic cancel replay precedence
   - assembles optional `transportContext` for `controlStore.updateAction(...)`
   - runs `controlStore.updateAction(...)`
   - returns a typed discriminated result containing:
     - replayed or applied outcome kind
     - snapshot
     - canonical request and intent ids
     - replay entry when present
     - `persistRequired`
     - `publishRequired`
3. Keep `controlServer.ts` responsible for:
   - route ordering and auth/CSRF/runner-only gating
   - `confirmation_required` fast reject and cancel-confirmation helper orchestration
   - transport preflight rejection writes
   - transport nonce consume/rollback plus durable `persist.control()` sequencing
   - actual `runtime.publish(...)`
   - final audit emission
   - raw HTTP success/error writes
4. Trim `controlActionPreflight.ts` so it owns only normalization, traceability helpers, and transport validation logic.

## Risks / Guardrails

- Replay lookup must continue to use a fresh snapshot because nonce checks can prune expired replay entries before execution begins.
- Transport cancel replay precedence must remain unchanged: replay short-circuiting still occurs before confirmation resolution when the transport metadata is already fully provided.
- The helper must not absorb persistence or publish side effects, because those stay coupled to nonce durability and explicit controller authority.
- Preserve canonical replay-entry actor/source/principal precedence when building downstream outcome and audit inputs.

## Acceptance Criteria

- The remaining `/control/action` execution orchestration is extracted into `controlActionExecution.ts`.
- `resolveControlActionReplay(...)` no longer resides in `controlActionPreflight.ts`.
- `controlServer.ts` becomes narrower without losing ownership of persistence, publish, audit, or raw response writing.

## Validation

- Direct helper tests covering replay match, applied mutation, transport replay precedence, and persist/publish flag behavior.
- Targeted `ControlServer` regressions for duplicate replay, transport cancel replay-before-confirmation, persist-failure retry, and canonical replay traceability.
- Manual mock execution artifact.
- Standard closeout lane: delegation guard, spec guard, build, lint, test, docs check, docs freshness, diff budget, review, and `pack:smoke` only if downstream-facing paths change.
