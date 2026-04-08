# PRD - Coordinator Symphony-Aligned UI Session Controller Extraction

## Problem

After `1039`, `controlServer.ts` still owns the standalone `/auth/session` route inline. That branch mixes route matching, loopback/origin/host validation, and UI session-token issuance into the server entrypoint instead of behind a dedicated controller boundary.

## Goal

Extract a dedicated UI session controller helper so `/auth/session` policy and response writing live behind one stable controller boundary while auth ordering, CSRF rules, webhook handling, event streaming, and mutating control behavior stay unchanged.

## User Value

- Continues the Symphony-aligned thinning of `controlServer.ts` in a bounded, auditable step.
- Preserves the current hardened UI session bootstrap behavior while making the server entrypoint easier to reason about.
- Keeps CO’s stricter auth/session posture explicit instead of blending it into broader controller or provider work.

## Scope

- Extract the `/auth/session` route handling out of `controlServer.ts`.
- Move the route-local loopback/allowed-host/origin checks and JSON response writing behind that controller boundary.
- Keep UI session-token issuance semantics unchanged.

## Non-Goals

- No token-policy changes.
- No CSRF or auth-order changes.
- No `/api/v1/*` changes.
- No Telegram or Linear behavior changes.
- No webhook, event-stream, or mutating control-surface changes.

## Constraints

- Preserve the current `/auth/session` contract for `GET` and `POST`.
- Keep loopback-only, allowed-host, and origin validation behavior identical.
- Keep `controlServer.ts` responsible for route ordering around static UI assets, webhooks, event streams, auth, and mutating control endpoints.
- Keep the extraction bounded to the UI session route and its tests.
