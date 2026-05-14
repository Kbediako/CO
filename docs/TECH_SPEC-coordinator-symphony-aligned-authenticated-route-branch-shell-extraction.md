# TECH_SPEC - Coordinator Symphony-Aligned Authenticated Route Branch Shell Extraction

## Overview

This slice removes the remaining authenticated-route shell cluster from `controlServer.ts` while keeping overall request-entry ordering, public/UI/Linear routing, and the inner authenticated controller dispatch in place.

## Current State

- `controlServer.ts` still:
  - calls `admitAuthenticatedControlRoute(...)`
  - returns early on auth failure
  - constructs `createControlAuthenticatedRouteContext(...)`
  - calls `handleAuthenticatedRouteRequest(...)`
  - writes the final authenticated-route `404 {"error":"not_found"}` response
- Existing modules already own the deeper contracts:
  - `authenticatedControlRouteGate.ts` handles auth/CSRF/runner-only policy
  - `controlAuthenticatedRouteController.ts` handles the authenticated route map
  - `controlAuthenticatedRouteContext.ts` builds the per-request controller context

## Target State

- Move only the control-server-side authenticated branch shell into a tiny adjacent helper module.
- Keep `handleRequest(...)` as the branch-order shell and have it delegate the final authenticated-route branch through the extracted helper.
- Preserve the current gate/controller/context module boundaries.

## Proposed API

- `handleControlAuthenticatedRouteBranch(context): Promise<boolean>`
  - Returns `true` when the authenticated route branch handled the request, including auth failures and the protected `404`.
  - Returns `false` only when the request is not in the authenticated-route branch and should continue through `handleRequest(...)`.

The helper should encapsulate:

- authenticated route admission via `admitAuthenticatedControlRoute(...)`
- controller-context assembly via `createControlAuthenticatedRouteContext(...)`
- authenticated controller dispatch via `handleAuthenticatedRouteRequest(...)`
- the final protected `404 {"error":"not_found"}` fallback

## Out of Scope

- internal auth/CSRF/runner-only policy logic
- inner authenticated controller route implementations
- public/UI-session/Linear webhook branch ordering
- any broader control-surface router abstraction

## Validation

- Focused tests for the extracted authenticated-route shell helper.
- Preserve existing route-level control-server behavior tests for auth failures, handled routes, and authenticated `404`.
- Full standard lane validation after implementation.
