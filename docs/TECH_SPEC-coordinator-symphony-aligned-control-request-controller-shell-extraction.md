# TECH_SPEC - Coordinator Symphony-Aligned Control Request Controller Shell Extraction

## Overview

This slice removes the remaining inline request-controller shell from `controlServer.ts` while preserving the `1102` pre-dispatch helper and the `1101` route dispatcher.

## Current State

- `handleRequest()` in `controlServer.ts` still:
  - calls `buildControlRequestRouteDispatchInput(context)`
  - returns early when the helper yields `null`
  - calls `handleControlRequestRouteDispatch(dispatchInput)`
- The request pre-dispatch assembly already lives in `controlRequestPredispatch.ts`.
- The route-branch sequencing already lives in `controlRequestRouteDispatch.ts`.

## Target State

- Move the remaining null-check + dispatch choreography into one dedicated request-controller helper.
- Let `controlServer.ts` delegate directly to that helper.
- Preserve the current fallthrough/dispatch contract unchanged.

## Proposed API

- `handleControlRequest(context): Promise<void>`
  - Calls `buildControlRequestRouteDispatchInput(context)`.
  - Returns immediately on `null`.
  - Otherwise calls `handleControlRequestRouteDispatch(dispatchInput)`.

## Out of Scope

- Reworking `buildControlRequestRouteDispatchInput(...)`
- Reworking `handleControlRequestRouteDispatch(...)`
- Reworking request-shell startup or bootstrap lifecycle code
- Any new routing or middleware abstraction beyond the single request-controller helper

## Validation

- Focused tests for null fallthrough and populated dispatch handoff.
- Preserve existing pre-dispatch and route-dispatch behavior coverage.
- Full standard lane validation after implementation.
