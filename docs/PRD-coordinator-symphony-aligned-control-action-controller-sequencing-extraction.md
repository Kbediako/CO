# PRD - Coordinator Symphony-Aligned Control Action Controller Sequencing Extraction

## User Request Translation

Continue the Symphony-aligned `/control/action` decomposition after `1055` by extracting the remaining controller-owned sequencing shell without widening into a generic route wrapper or moving authority away from `controlServer.ts`.

## Problem

After the preflight, outcome, cancel-confirmation, execution, and finalization extractions, the `/control/action` branch in `controlServer.ts` is now concentrated around one remaining concern: sequencing. The route still decides when to:

- validate transport mutation preflight
- short-circuit pre-confirm replay
- require or resolve cancel confirmation
- re-validate transport mutation state after confirmation resolution
- invoke the extracted execution/finalization helpers

That sequencing is smaller than the earlier seams, but it still mixes controller branching and mutable route-local state in a way that keeps `controlServer.ts` larger and harder to reason about than the Symphony-aligned target shape.

## Goal

Introduce a dedicated controller-sequencing helper under `orchestrator/src/cli/control/` that centralizes the `/control/action` branch decisions around replay, confirmation resolution, and execution handoff while preserving `controlServer.ts` as the final authority for persistence, publish, audit emission, and raw HTTP response writes.

## Non-Goals

- No change to external `/control/action` status codes, error codes, or payload contracts.
- No move of auth, CSRF, request parsing, or normalization out of `controlServer.ts`.
- No move of transport preflight rules out of `controlActionPreflight.ts`.
- No move of execution logic out of `controlActionExecution.ts`.
- No move of finalization planning out of `controlActionFinalization.ts`.
- No move of actual persistence, runtime publish, audit emission, or raw HTTP writes out of `controlServer.ts`.
- No change to replay precedence, confirmation semantics, or transport nonce durability behavior.

## Requirements

- Add a dedicated sequencing helper under `orchestrator/src/cli/control/`.
- Centralize the branch contract that decides whether `/control/action` should:
  - reject early
  - short-circuit replay
  - require confirmation
  - resolve cancel confirmation and continue
  - execute and finalize
- Keep explicit controller-owned authority over:
  - actual persistence
  - actual runtime publish
  - actual audit emission
  - raw HTTP response writes
- Preserve the current post-confirmation re-validation behavior for transport mutations.

## Constraints

- Preserve the existing cancel-only confirmation path.
- Preserve the current ordering where replay can short-circuit before confirmation when transport resolution is not deferred.
- Keep the solution smaller than a full `/control/action` controller extraction; this slice is about sequencing only.
- Prefer a typed helper contract over hidden callback chains or opaque “run everything” abstractions.

## Acceptance Criteria

1. A dedicated sequencing helper exists under `orchestrator/src/cli/control/`.
2. `controlServer.ts` no longer owns the detailed branch sequencing for replay, confirmation gating/resolution, and execution handoff.
3. `controlServer.ts` still owns final authority over persistence, publish, audit emission, and raw response writes.
4. Existing `/control/action` replay, confirmation, and applied-action behavior remains unchanged.
5. Direct helper coverage, targeted `ControlServer` regressions, manual mock evidence, and standard validation are recorded before closeout.
