# PRD - Coordinator Symphony-Aligned Linear Webhook Branch Shell Extraction

## Problem Statement

After the public and UI-session branches, `controlServer.ts` still owns the `/integrations/linear/webhook` branch shell inline. The host file is still responsible for detecting the webhook pathname, wiring the controller dependencies, invoking the Linear webhook controller, and returning from `handleRequest(...)`.

## Desired Outcome

Move the Linear webhook branch shell into a controller-owned entrypoint so `controlServer.ts` keeps request-entry ordering while the webhook-specific branch choreography leaves the host file without introducing another router/helper layer.

## Scope

- Extract the control-server-side `/integrations/linear/webhook` branch shell that covers:
  - pathname detection for `/integrations/linear/webhook`
  - controller dependency assembly for the existing `handleLinearWebhookRequest(...)` path
  - the handled-route early return from `handleRequest(...)`
- Preserve existing webhook behavior, response shapes, and runtime/audit side effects.
- Keep request-entry ordering unchanged.

## Non-Goals

- Changes to `linearWebhookController.ts` delivery/auth/timestamp logic.
- Changes to public-route, UI-session, or authenticated-route ordering.
- Broader router or middleware abstractions over `handleRequest(...)`.
- Review-wrapper reliability work unless it directly blocks this product seam again.

## Constraints

- Keep the extracted boundary minimal and controller-owned; do not add another route-helper layer unless implementation friction proves it necessary.
- Preserve the current ordering: public routes, `/auth/session`, Linear webhook, then authenticated routes.
- Do not change Linear webhook method, status-code, persistence, audit, or runtime-publish contracts.

## Acceptance Criteria

- `controlServer.ts` delegates the `/integrations/linear/webhook` branch shell through one controller-owned entrypoint.
- Existing Linear webhook route behavior remains unchanged.
- Focused tests cover the extracted branch shell seam and preserve route-level Linear webhook behavior.
