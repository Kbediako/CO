# PRD - Coordinator Symphony-Aligned Confirmation List Controller Extraction

## User Request Translation

Continue the Symphony-aligned controller extraction program by taking the next bounded confirmation seam after `/confirmations/approve`: extract `GET /confirmations` into its own controller while preserving the current pending-list behavior and keeping broader control authority in `controlServer.ts`.

## Problem

After `1049`, `controlServer.ts` still owns the inline `GET /confirmations` branch. That route is the remaining confirmation lifecycle seam in the main server entrypoint, but it still embeds confirmation expiry, pending confirmation listing, sanitized response shaping, and response writing directly in `controlServer.ts`.

## Goal

Extract `GET /confirmations` into a dedicated controller helper that preserves the current pending-list semantics and leaves higher-authority routing and cross-route policy in `controlServer.ts`.

## Non-Goals

- No changes to `/confirmations/create`, `/confirmations/approve`, `/confirmations/issue`, `/confirmations/consume`, `/confirmations/validate`, `/control/action`, or non-confirmation routes.
- No change to confirmation-store contracts, approval semantics, or nonce behavior.
- No widening into broader confirmation abstraction work unless the list seam proves inseparable.

## Requirements

- Extract the `GET /confirmations` route-local handling out of `controlServer.ts`.
- Preserve confirmation expiry before list reads.
- Preserve the existing `{ pending: ... }` response contract.
- Preserve the existing sanitized pending confirmation payload shape exactly.
- Keep `controlServer.ts` responsible for top-level auth/CSRF/runner-only gating, route ordering, shared runtime hooks, `/control/action`, and the broader transport/control policy.

## Constraints

- Preserve the current sanitized pending confirmation payload shape exactly.
- Do not widen into `/control/action` or broader confirmation-store abstraction work.
- Keep the extraction bounded and reviewable.

## Acceptance Criteria

1. `GET /confirmations` route-local logic moves into a dedicated controller module.
2. Pending confirmation list behavior and response shape remain unchanged after extraction.
3. `controlServer.ts` keeps top-level route ordering, auth/CSRF/runner-only gating, shared runtime wiring, and non-list routes.
4. Direct controller tests, existing list-related server regressions, manual mock evidence, and standard validation are recorded before closeout.
