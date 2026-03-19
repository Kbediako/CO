# PRD - Coordinator Symphony-Aligned Control Action Preflight Extraction

## User Request Translation

Continue the Symphony-aligned controller extraction program by taking the next bounded seam after `1050`: extract the `/control/action` request parsing, normalization, transport preflight, and early reject mapping into a dedicated helper/controller boundary while preserving CO's harder control authority model.

## Problem

After the confirmation-route extractions, the largest remaining inline surface in `controlServer.ts` is the `/control/action` route. That path still mixes request-body parsing, session gating, transport metadata resolution, transport-policy validation, idempotent replay branching, confirmation-scope transport re-resolution, and the final authority-bearing control mutation in one route block.

## Goal

Extract the `/control/action` preflight layer into a dedicated helper module that owns request parsing, normalization, transport preflight, replay-or-confirmation decision shaping, and canonical traceability derivation, while keeping final control mutation, persistence, runtime publish, audit emission, and final HTTP response ownership in `controlServer.ts`.

## Non-Goals

- No change to the externally visible `/control/action` response contract, status codes, or traceability payloads.
- No change to auth/CSRF/runner-only gating ownership in `controlServer.ts`.
- No change to final control mutation semantics, runtime publish policy, or audit-event authority.
- No widening into Telegram, Linear, or other controller families.

## Requirements

- Extract `/control/action` request-body parsing and field normalization from `controlServer.ts`.
- Preserve session-only restrictions and UI metadata rejection for session-authenticated requests.
- Preserve transport mutation resolution, policy validation, confirmation-scope re-resolution, and idempotent replay handling.
- Preserve canonical early reject/error mapping and traceability payload construction.
- Keep final `controlStore.updateAction(...)`, persistence sequencing, runtime publish, and final audit emission in `controlServer.ts`.

## Constraints

- Preserve current request-id / intent-id normalization, including camel-case aliases.
- Preserve the current transport hardening behavior: fail closed, nonce expiry/replay checks, transport allow-list checks, and deferred cancel transport resolution through confirmation scope.
- Keep the extraction reviewable and bounded; do not collapse the remaining mutation path into a larger generic abstraction.

## Acceptance Criteria

1. `/control/action` preflight handling moves into a dedicated helper module.
2. Existing early reject and idempotent replay contracts remain unchanged after extraction.
3. `controlServer.ts` keeps auth/CSRF gating, route ordering, final control mutation, persistence, runtime publish, and audit emission authority.
4. Direct preflight controller tests, targeted `ControlServer` regressions, manual mock evidence, and standard validation are recorded before closeout.
