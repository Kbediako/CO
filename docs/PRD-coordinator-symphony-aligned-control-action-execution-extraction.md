# PRD - Coordinator Symphony-Aligned Control Action Execution Extraction

## User Request Translation

Continue the Symphony-aligned decomposition after `1053` by taking the next bounded `/control/action` seam: extract the remaining execution orchestration from `controlServer.ts` into a dedicated helper while preserving CO's harder authority model.

## Problem

After the preflight, outcome-shaping, and cancel-confirmation extractions, the remaining `/control/action` branch in `controlServer.ts` still inlines the execution orchestration: refresh-snapshot replay resolution, transport-vs-generic replay precedence, `transportContext` assembly for `controlStore.updateAction(...)`, and the decision surface for whether control persistence and runtime publish should happen.

`resolveControlActionReplay(...)` currently lives in `controlActionPreflight.ts`, but it now reads as execution logic rather than request normalization or transport validation logic.

## Goal

Extract the post-resolution `/control/action` execution path into a dedicated execution helper under `orchestrator/src/cli/control/`, including replay resolution and update-action coordination, while keeping raw HTTP writes, transport preflight rejects, cancel-confirmation authority, transport nonce consume/rollback durability, actual `persist.control()` calls, actual `runtime.publish(...)`, and audit emission in `controlServer.ts`.

## Non-Goals

- No change to externally visible `/control/action` status codes, error codes, or payload contracts.
- No move of auth, CSRF, or runner-only gating out of `controlServer.ts`.
- No move of `confirmation_required` fast reject or cancel-confirmation authority out of `controlServer.ts`.
- No move of transport preflight validation or error shaping out of `controlActionPreflight.ts`.
- No move of final response writes, actual persistence side effects, runtime publish side effects, or audit emission out of `controlServer.ts`.
- No widening into a full route-controller rewrite or a generic runtime executor.

## Requirements

- Extract the remaining `/control/action` execution orchestration into a dedicated execution helper under `orchestrator/src/cli/control/`.
- Move replay resolution out of `controlActionPreflight.ts` and into the new execution helper.
- Preserve replay-before-mutation ordering, including transport cancel replay precedence.
- Preserve canonical request and intent id handling for replayed and applied outcomes.
- Preserve optional `transportContext` assembly for `controlStore.updateAction(...)`.
- Return a typed execution result that tells `controlServer.ts` whether persistence and runtime publish are required, without letting the helper own those side effects.

## Constraints

- Preserve the current ordering where replay resolution runs against a fresh snapshot before any mutation or nonce consumption.
- Preserve the current separation where transport nonce consume/rollback durability remains coupled to `persist.control()` in `controlServer.ts`.
- Preserve canonical replay-entry actor/source/principal precedence for transport replays.
- Keep the extraction narrow and reviewable; do not collapse response shaping, persistence, publish, and audit into one opaque helper.

## Acceptance Criteria

1. The remaining `/control/action` execution orchestration moves into `controlActionExecution.ts`.
2. `resolveControlActionReplay(...)` no longer lives in `controlActionPreflight.ts`.
3. Existing replayed-versus-applied behavior, transport cancel replay precedence, and persistence/publish decisions remain unchanged.
4. `controlServer.ts` keeps route ordering, fast rejects, transport nonce durability, actual persistence/publish side effects, audit emission, and raw HTTP writes.
5. Direct helper tests, targeted `ControlServer` regressions, manual mock evidence, and standard validation are recorded before closeout.
