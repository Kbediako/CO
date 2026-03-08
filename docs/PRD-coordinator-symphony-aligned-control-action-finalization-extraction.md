# PRD - Coordinator Symphony-Aligned Control Action Finalization Extraction

## User Request Translation

Continue the Symphony-aligned `/control/action` decomposition after `1054` by extracting the remaining controller-level finalization planning seam without widening into a full controller rewrite.

## Problem

After the outcome-shaping, cancel-confirmation, and execution extractions, the remaining `/control/action` branch in `controlServer.ts` is now mostly the finalization envelope: replay/applied response selection, traceability and audit payload shaping, and the decision surface that pairs those payloads with persistence and runtime publish behavior.

The current code still carries duplicated replay finalization handling between the pre-confirm cancel replay path and the post-execution replay path, and the response/audit composition remains spread across `controlServer.ts` and `controlActionOutcome.ts`.

## Goal

Introduce a dedicated finalization helper under `orchestrator/src/cli/control/` that centralizes response and audit payload assembly for replayed and applied `/control/action` outcomes, while leaving actual persistence, runtime publish, nonce consume/rollback durability, confirmation authority, and raw HTTP writes in `controlServer.ts`.

## Non-Goals

- No change to externally visible `/control/action` status codes, error codes, or payload contracts.
- No move of auth, CSRF, request parsing, or confirmation authority out of `controlServer.ts`.
- No move of actual `persist.control()`, actual `runtime.publish(...)`, or actual audit emission side effects out of `controlServer.ts`.
- No move of transport nonce consume/rollback durability out of `controlServer.ts`.
- No change to replay precedence or canonical request/intent id behavior.
- No widening into a standalone `handleControlActionRequest(...)` controller extraction in this slice.

## Requirements

- Add a dedicated finalization helper under `orchestrator/src/cli/control/`.
- Centralize replay and applied success payload assembly around the existing outcome builders.
- Centralize the audit payload inputs needed by `emitControlActionAuditEvent(...)`.
- Preserve the existing persist and publish requirements determined upstream by execution logic.
- Remove the remaining duplicate replay-success finalization logic from `controlServer.ts` without moving raw response writes or side effects.

## Constraints

- Preserve the current ordering where pre-confirm cancel replay still short-circuits before confirmation challenge.
- Preserve the controller-owned coupling between transport nonce durability and persistence calls.
- Keep `controlActionOutcome.ts` as the contract source for success payload structure unless there is a compelling need to move a helper into the new module.
- Keep the change reviewable and narrow; this slice is about finalization extraction, not broader control-route ownership changes.

## Acceptance Criteria

1. A dedicated finalization helper exists under `orchestrator/src/cli/control/`.
2. Replay/applied response and audit payload assembly is centralized through that helper.
3. `controlServer.ts` becomes narrower while still owning actual persist/publish/audit side effects and raw HTTP writes.
4. Replay precedence, canonical ids, traceability, and HTTP contracts remain unchanged.
5. Direct helper coverage, targeted `ControlServer` regressions, manual mock evidence, and standard validation are recorded before closeout.
