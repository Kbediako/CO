# PRD - Coordinator Symphony-Aligned Authenticated Route Branch Shell Extraction

## Problem Statement

After the public, UI-session, and Linear webhook branches, `controlServer.ts` still owns the remaining authenticated-route shell inline. The file continues to assemble authenticated admission, handle the auth-failure early return, invoke the authenticated-route dispatcher, and emit the final protected `404 not_found` fallback directly in `handleRequest(...)`.

## Desired Outcome

Extract the authenticated-route branch shell behind one adjacent helper so `controlServer.ts` keeps overall request-entry ordering while the final authenticated-route branch choreography moves out of the host file.

## Scope

- Extract the control-server-side authenticated-route shell that covers:
  - `admitAuthenticatedControlRoute(...)`
  - the auth-failure early return
  - `handleAuthenticatedRouteRequest(...)`
  - the `handled` check
  - the final authenticated-route `404 {"error":"not_found"}` fallback
- Preserve existing authenticated route behavior and response shapes.
- Keep request-entry branch ordering unchanged.

## Non-Goals

- Changes to `authenticatedControlRouteGate.ts` auth, CSRF, or runner-only policy.
- Changes to `controlAuthenticatedRouteController.ts` route-specific behavior.
- Public-route, UI-session, or Linear webhook routing changes.
- Broader router or middleware abstractions over `handleRequest(...)`.

## Constraints

- Keep the extracted boundary adjacent to `controlServer.ts` and minimal.
- Preserve the current ordering: public routes, `/auth/session`, Linear webhook, then authenticated routes.
- Do not change authenticated-route method, status-code, or error-body contracts.

## Acceptance Criteria

- `controlServer.ts` delegates the authenticated-route branch shell through one bounded helper module.
- Authenticated `401`, `403`, handled-route success, and protected `404 not_found` behavior remain unchanged.
- Focused tests cover the extracted shell seam and preserve route-level authenticated behavior.
