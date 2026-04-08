# PRD - Coordinator Symphony-Aligned Control Action Cancel Confirmation Resolution Extraction

## User Request Translation

Continue the Symphony-aligned decomposition after `1052` by taking the next bounded `/control/action` seam: separate cancel-confirmation resolution from `controlServer.ts` while preserving CO's harder authority model.

## Problem

After the preflight and outcome-shaping extractions, the remaining `/control/action` block in `controlServer.ts` still inlines the cancel-only confirmation-resolution branch: nonce validation, canonical id rebinding, confirmation persistence, `confirmation_resolved` event emission, confirmed transport-scope resolution, and mismatch traceability shaping.

## Goal

Extract the cancel-confirmation resolution sequence into a dedicated helper module that returns structured confirmed-scope data or a structured reject result, while keeping route ordering, error writes, transport preflight/replay checks, final control mutation, transport nonce consumption, runtime publish, and audit emission authority in `controlServer.ts`.

## Non-Goals

- No change to externally visible `/control/action` status codes, error codes, or payload contracts.
- No move of auth/CSRF/runner-only gating ownership out of `controlServer.ts`.
- No move of shared transport preflight, replay execution, nonce consume/rollback, `controlStore.updateAction(...)`, runtime publish, or final audit emission out of `controlServer.ts`.
- No widening into a generic control executor or a full route-controller rewrite.

## Requirements

- Extract the cancel-only confirmation-resolution sequence from `controlServer.ts`.
- Preserve canonical `request_id` / `intent_id` rebinding from validated confirmation params.
- Preserve confirmation persistence and `confirmation_resolved` event semantics.
- Preserve confirmed-scope mismatch traceability and reject behavior exactly.
- Return structured confirmed-scope data so `controlServer.ts` can keep the existing post-resolution preflight/replay/update flow unchanged.

## Constraints

- Preserve the current sequencing where `validateNonce()` consumes the nonce before confirmation persistence and before confirmed-scope mismatch rejection.
- Preserve the requirement that validated confirmation scope overrides caller-supplied transport metadata exactly.
- Keep the extraction bounded and reviewable; do not collapse the remaining execution path into one opaque runtime call.

## Acceptance Criteria

1. The cancel-only confirmation-resolution branch moves into a dedicated helper module.
2. Existing `/control/action` confirmation-invalid, confirmation-scope-mismatch, confirmed-scope binding, and nonce-reuse behavior remain unchanged.
3. `controlServer.ts` keeps HTTP writes, transport preflight/replay, final control mutation, nonce consumption, runtime publish, and audit emission authority.
4. Direct helper tests, targeted `ControlServer` regressions, manual mock evidence, and standard validation are recorded before closeout.
