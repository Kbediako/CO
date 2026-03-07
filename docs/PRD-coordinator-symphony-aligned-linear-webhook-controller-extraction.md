# PRD - Coordinator Symphony-Aligned Linear Webhook Controller Extraction

## Problem

After `1040`, `controlServer.ts` still owns the standalone `/integrations/linear/webhook` route inline. That branch mixes route matching, delivery validation, advisory-state mutation, audit emission, and provider-facing response writing into the server entrypoint instead of behind a dedicated controller boundary.

## Goal

Extract a dedicated Linear webhook controller helper so provider-ingress validation and response handling live behind one stable controller boundary while route ordering, auth ordering, observability routes, and mutating control behavior stay unchanged.

## User Value

- Continues the Symphony-aligned thinning of `controlServer.ts` in another bounded, auditable step.
- Makes the Linear ingress path easier to reason about without softening its fail-closed posture.
- Prepares a cleaner seam for future live Linear-provider hardening while keeping CO’s stricter authority model explicit.

## Scope

- Extract the `/integrations/linear/webhook` route handling out of `controlServer.ts`.
- Move route-local webhook validation, advisory outcome recording/writing, and provider-facing response writing behind that controller boundary.
- Keep current webhook acceptance, ignore, duplicate, and rejection semantics unchanged.

## Non-Goals

- No webhook signature-policy changes.
- No delivery replay-window or advisory-policy changes.
- No `/api/v1/*`, Telegram, or UI session changes.
- No auth or CSRF ordering changes.
- No control-action, event-stream, or mutating transport changes.

## Constraints

- Preserve the current `/integrations/linear/webhook` contract for success, duplicate, ignored, and rejected deliveries.
- Keep `controlServer.ts` responsible for route ordering around UI assets, `/auth/session`, the Linear webhook, then auth/CSRF-gated routes.
- Keep the extraction bounded to the Linear webhook route and its tests.
