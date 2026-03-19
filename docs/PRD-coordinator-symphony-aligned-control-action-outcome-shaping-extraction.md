# PRD - Coordinator Symphony-Aligned Control Action Outcome Shaping Extraction

## User Request Translation

Continue the Symphony-aligned decomposition after `1051` by taking the next bounded `/control/action` seam: separate the post-preflight confirmation-versus-apply outcome shaping from `controlServer.ts` while preserving CO's harder authority model.

## Problem

After the preflight extraction, the remaining `/control/action` block in `controlServer.ts` still mixes confirmation-required fast paths, confirmation-resolution branching, replay-versus-apply response shaping, audit request/intention resolution, and final payload construction alongside the authority-bearing mutation and persistence path.

## Goal

Extract the post-preflight `/control/action` outcome-shaping layer into a dedicated helper module that owns confirmation-required and confirmation-invalid response mapping, replay-versus-apply payload shaping, and canonical post-mutation traceability derivation, while keeping nonce consumption, control mutation, persistence ordering, runtime publish, and audit emission authority in `controlServer.ts`.

## Non-Goals

- No change to the externally visible `/control/action` status codes, response bodies, or traceability payloads.
- No move of auth/CSRF/runner-only gating ownership out of `controlServer.ts`.
- No move of final control mutation, persistence rollback, runtime publish, or audit emission authority out of `controlServer.ts`.
- No widening into `controlState.ts` replay-index dedupe, Telegram/Linear surfaces, or generic controller abstractions.

## Requirements

- Extract the post-preflight confirmation-required and confirmation-invalid response shaping from `controlServer.ts`.
- Extract replay-versus-apply payload shaping for the already-validated `/control/action` path.
- Preserve the current request-id / intent-id resolution semantics for replayed and applied outcomes.
- Preserve canonical transport traceability for replayed/applied transport mutations.
- Keep nonce consumption, confirmation persistence, `controlStore.updateAction(...)`, runtime publish, and audit emission in `controlServer.ts`.

## Constraints

- Preserve the current `409 confirmation_required` and `409 confirmation_invalid` contracts exactly.
- Preserve replay payload semantics, including `idempotent_replay: true` and the current nullability rules for request and intent ids.
- Keep the extraction reviewable and bounded; do not turn this into a generalized control executor or full route controller rewrite.

## Acceptance Criteria

1. `/control/action` confirmation-versus-apply outcome shaping moves into a dedicated helper module.
2. Existing confirmation-required, confirmation-invalid, replay, and applied response contracts remain unchanged.
3. `controlServer.ts` keeps nonce consumption, confirmation persistence, control mutation, runtime publish, and audit emission authority.
4. Direct helper tests, targeted `ControlServer` regressions, manual mock evidence, and standard validation are recorded before closeout.
