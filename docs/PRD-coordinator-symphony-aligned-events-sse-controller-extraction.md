# PRD - Coordinator Symphony-Aligned Events SSE Controller Extraction

## Problem

After `1041`, `controlServer.ts` still owns the standalone `GET /events` SSE route inline. That branch mixes SSE response bootstrap, client registration, and disconnect cleanup into the main server entrypoint instead of behind a dedicated controller boundary.

## Goal

Extract a dedicated events SSE controller helper so stream bootstrap and client lifecycle handling live behind one stable controller boundary while auth ordering, runner-only gating, observability routes, webhook routes, and mutating control behavior stay unchanged.

## User Value

- Continues the Symphony-aligned thinning of `controlServer.ts` in another bounded, auditable step.
- Makes the live event-stream path easier to reason about without changing CO’s control authority model.
- Prepares a cleaner seam for later transport and presentation hardening while keeping broadcast fanout explicit.

## Scope

- Extract the `/events` route-local handling out of `controlServer.ts`.
- Move SSE response bootstrap, client registration, and disconnect cleanup behind that controller boundary.
- Keep current SSE headers, initial keep-alive comment, and connected-client behavior unchanged.

## Non-Goals

- No auth, CSRF, or runner-only policy changes.
- No webhook, Telegram, Linear, `/ui`, or `/api/v1/*` changes.
- No event payload framing or broadcast fanout changes.
- No control-action or question-route changes.

## Constraints

- Preserve the current `/events` SSE contract for headers, initial heartbeat payload, and client lifecycle cleanup.
- Keep `controlServer.ts` responsible for route ordering plus auth/runner-only gating before the SSE branch.
- Keep the extraction bounded to the `/events` route and its tests.
