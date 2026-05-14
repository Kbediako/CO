# TECH_SPEC - Coordinator Symphony-Aligned Authenticated Route Handoff Assembly Extraction

## Overview

This slice removes the remaining authenticated-route handoff assembly cluster from `controlServer.ts` while keeping request-entry branch ordering, authenticated admission, and the fallback `404` response in place.

## Current State

- `controlServer.ts` still:
  - creates `questionChildResolutionAdapter`
  - derives `taskId` from `context.paths.manifestPath`
  - builds the large `handleAuthenticatedRouteRequest(...)` context inline
  - binds request-scoped closures for request-body reads, dispatch evaluation/auditing, control audit/error writes, expiry callbacks, question resolution, delegation headers, manifest lookup, and child-question resolution
- `authenticatedRouteController.ts` is currently a thin pass-through to `authenticatedRouteComposition.ts`

## Target State

- Move only the control-specific authenticated-route handoff assembly into the authenticated-route controller boundary or a tiny adjacent helper owned by that boundary.
- Keep `controlServer.ts` as the request-entry shell that:
  - orders public/session/webhook/authenticated branches
  - performs authenticated admission via `admitAuthenticatedControlRoute(...)`
  - returns the final `404 not_found`
- Preserve current request-scoped snapshot timing by leaving `buildControlPresenterRuntimeContext(context)` in `controlServer.ts`.

## Proposed API

- `handleControlAuthenticatedRouteRequest(context): Promise<boolean>`
  - Accepts already-authorized request inputs from `controlServer.ts`
  - Constructs the control-specific `AuthenticatedRouteCompositionContext`
  - Delegates to `handleAuthenticatedRouteRequest(...)`

The extracted helper should encapsulate:

- `createControlQuestionChildResolutionAdapter(context)`
- task-id derivation from `context.paths.manifestPath`
- request-scoped closure binding for authenticated-route controller needs
- composition context construction for the authenticated-route controller boundary

## Out of Scope

- Authenticated admission/token validation ownership
- Public-route/UI-session/Linear webhook branches
- Authenticated dispatcher/route behavior changes
- Shared utility extraction for `resolveTaskIdFromManifestPath(...)`
- Snapshot/presenter timing changes

## Validation

- Focused tests for the extracted authenticated-route handoff seam.
- Preserve existing route-level `ControlServer` behavior tests for authenticated branches.
- Full standard lane validation after implementation.
