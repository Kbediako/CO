# TECH_SPEC - Coordinator Symphony-Aligned Control Server UI Session Admission Helper Extraction

## Overview

This slice removes the remaining UI session admission assembly cluster from `controlServer.ts` while keeping request-entry branch ordering, public-route handling, webhook handling, and authenticated-route dispatch in place.

## Current State

- `controlServer.ts` still:
  - calls `handleUiSessionRequest(...)` directly inside `handleRequest(...)`
  - owns `normalizeAllowedHosts(...)`
  - owns the exported `isLoopbackAddress(...)`
- `uiSessionController.ts` already owns the actual `/auth/session` contract:
  - loopback rejection
  - Host/Origin admission checks
  - session issuance response writing

## Target State

- Move only the control-server-side assembly cluster into the existing `uiSessionController.ts` boundary or a tiny adjacent controller-owned helper.
- Keep `handleRequest(...)` as the branch-order shell and have it delegate UI session admission handling to the extracted module.
- Preserve the existing `isLoopbackAddress(...)` export surface by re-exporting or relocating it without changing call semantics.

## Proposed API

- `handleControlUiSessionAdmission(context): boolean`
  - Returns `true` when `/auth/session` was handled.
  - Returns `false` when the request should continue through the remaining `handleRequest(...)` branches.

The helper should encapsulate:

- `handleUiSessionRequest(...)` wiring
- allowed-host normalization for `config.ui.allowedBindHosts`
- loopback-address admission helper ownership used by the UI session route

## Out of Scope

- Internal `uiSessionController.ts` validation behavior
- `questionChildResolutionAdapter.ts` host-policy handling
- `delegationServer.ts` host-policy handling
- public-route handling
- authenticated-route admission and controller dispatch
- Linear webhook handling

## Validation

- Focused tests for the extracted helper module and any preserved export seam.
- Preserve existing route-level control-server behavior tests for `/auth/session`.
- Full standard lane validation after implementation.
