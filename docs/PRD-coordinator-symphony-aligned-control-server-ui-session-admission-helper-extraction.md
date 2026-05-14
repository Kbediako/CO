# PRD - Coordinator Symphony-Aligned Control Server UI Session Admission Helper Extraction

## Problem Statement

`controlServer.ts` is now down to one remaining pre-auth helper cluster before the webhook and authenticated-route branches: UI session admission wiring. The file still assembles the `/auth/session` branch inline by normalizing allowed hosts, passing the session issuer, and supplying the loopback admission seam directly to `handleUiSessionRequest(...)`.

## Desired Outcome

Extract the UI session admission helper assembly behind the existing UI-session controller boundary, or a tiny adjacent controller-owned helper, so `controlServer.ts` keeps request-entry and branch-order ownership while the session-admission assembly logic moves out of the shell.

## Scope

- Extract the control-server-side UI session admission helper assembly that covers:
  - the `handleUiSessionRequest(...)` branch wiring
  - allowed-host normalization for the UI session route
  - loopback-address admission helper ownership for the UI session route
- Preserve existing `/auth/session` behavior and response shapes.
- Keep request-entry branch ordering unchanged.

## Non-Goals

- Changes to `uiSessionController.ts` request/Origin/Host enforcement behavior.
- Changes to question-child resolution host normalization.
- Public-route/UI-asset changes.
- Authenticated-route or Linear webhook changes.
- Broader host-policy deduplication across unrelated modules.

## Constraints

- Keep the extracted boundary controller-owned and minimal.
- Preserve the currently exported `isLoopbackAddress(...)` seam for existing tests/imports.
- Do not change the `/auth/session` method, status-code, or error-body contract.

## Acceptance Criteria

- `controlServer.ts` delegates UI session admission assembly through one bounded helper module.
- `/auth/session` behavior remains unchanged for loopback, host, and Origin admission outcomes.
- Focused tests cover the extracted session-admission seam and preserve route-level behavior.
