# PRD - Coordinator Symphony-Aligned Authenticated Route Handoff Assembly Extraction

## Problem Statement

`controlServer.ts` now keeps the intended request-entry shell for public routes, `/auth/session`, Linear webhook handling, authenticated admission, and the final `404`, but it still assembles the entire authenticated-route handoff inline. The remaining inline mass is the control-specific context bag passed to `handleAuthenticatedRouteRequest(...)`, including question-child resolution wiring, task-id derivation, request-body readers, audit/error closures, expiry callbacks, and delegation/manifest helpers.

## Desired Outcome

Extract the authenticated-route handoff assembly into the authenticated-route controller boundary so `controlServer.ts` keeps route ordering and authority ownership while the large request-scoped context construction moves out of the shell.

## Scope

- Extract the control-server-side authenticated-route handoff assembly that covers:
  - `createControlQuestionChildResolutionAdapter(context)`
  - `resolveTaskIdFromManifestPath(context.paths.manifestPath)` for the authenticated route handoff
  - request-scoped closures passed into `handleAuthenticatedRouteRequest(...)`
  - the final `AuthenticatedRouteCompositionContext` construction for the authenticated route controller boundary
- Preserve existing authenticated-route behavior and response shapes.
- Keep request-entry branch ordering unchanged.

## Non-Goals

- Changes to `admitAuthenticatedControlRoute(...)` authority or token-validation ownership.
- Changes to public-route, UI-session, or Linear webhook routing.
- Changes to authenticated route dispatcher behavior or route matching semantics.
- Broader utility deduplication for `resolveTaskIdFromManifestPath(...)`.
- Changes to snapshot/presenter timing for the request unless explicitly required.

## Constraints

- Keep authenticated admission and the final `404 not_found` shell in `controlServer.ts`.
- Keep `buildControlPresenterRuntimeContext(context)` timing unchanged unless a separate slice approves moving it.
- Keep the extracted seam controller-owned and minimal.

## Acceptance Criteria

- `controlServer.ts` delegates authenticated-route handoff assembly through one bounded helper near the authenticated-route controller boundary.
- Authenticated admission, route ordering, and the final `404` remain in `controlServer.ts`.
- Focused tests cover the extracted handoff seam and preserve route-level behavior.
