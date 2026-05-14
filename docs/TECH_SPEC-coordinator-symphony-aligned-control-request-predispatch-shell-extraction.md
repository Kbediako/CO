# TECH_SPEC - Coordinator Symphony-Aligned Control Request Predispatch Shell Extraction

## Overview

This slice removes the remaining inline pre-dispatch request assembly shell from `controlServer.ts` while preserving the route dispatcher introduced in `1101` and all downstream controller behavior.

## Current State

- `handleRequest()` in `controlServer.ts` still:
  - checks for missing `req`/`res`
  - parses `req.url`
  - assembles presenter/runtime context via `buildControlPresenterRuntimeContext(...)`
  - shapes the input for `handleControlRequestRouteDispatch(...)`
- The route-branch sequencing itself already lives in `controlRequestRouteDispatch.ts`.

## Target State

- Move the missing-`req`/`res` guard, URL parsing, presenter/runtime assembly, and dispatch-input shaping into one dedicated helper.
- Let `controlServer.ts` delegate to that helper first, then call the existing route dispatcher only when a live request shell exists.
- Preserve the current `handleControlRequestRouteDispatch(...)` input contract.

## Proposed API

- `buildControlRequestRouteDispatchInput(context): ControlRequestRouteDispatchInput | null`
  - Returns `null` when `req`/`res` are missing.
  - Otherwise returns:
    - `pathname`
    - `search`
    - `req`
    - `res`
    - `context`
    - `runtimeSnapshot`
    - `presenterContext`

## Out of Scope

- Reworking `handleControlRequestRouteDispatch(...)`
- Reworking `buildControlPresenterRuntimeContext(...)`
- Reworking request-shell startup or bootstrap lifecycle code
- Any new routing or middleware abstraction beyond the single pre-dispatch helper

## Validation

- Focused tests for missing-request fallthrough and populated dispatcher-input shaping.
- Preserve existing route-dispatch and route-level behavior coverage.
- Full standard lane validation after implementation.
