# TECH_SPEC - Coordinator Symphony-Aligned Control Request Route Dispatch Shell Extraction

## Overview

This slice removes the remaining inline request-route dispatch shell from `controlServer.ts` while preserving the already-extracted branch helpers and their current behavior.

## Current State

- `handleRequest()` in `controlServer.ts` still:
  - checks for missing `req`/`res`
  - parses `req.url`
  - assembles presenter/runtime context
  - sequences `handlePublicControlRoute(...)`
  - sequences `handleControlUiSessionAdmission(...)`
  - sequences `handleLinearWebhookRequest(...)`
  - falls through to `handleControlAuthenticatedRouteBranch(...)`
- The public/UI/Linear/auth surfaces already have dedicated helper/controller ownership.

## Target State

- Keep the missing-`req`/`res` guard and request-context assembly where they already belong.
- Move only the public/UI/Linear/auth branch sequencing into a dedicated dispatcher module.
- Let `controlServer.ts` delegate to the dispatcher with the already-assembled request inputs.

## Proposed API

- `handleControlRequestRouteDispatch(input): Promise<void>`
  - Receives the already-assembled request shell inputs:
    - `req`
    - `res`
    - parsed `pathname` / `search`
    - `context`
    - `runtimeSnapshot`
    - `presenterContext`
  - Owns the current early-return order:
    1. `handlePublicControlRoute(...)`
    2. `handleControlUiSessionAdmission(...)`
    3. `handleLinearWebhookRequest(...)`
    4. `handleControlAuthenticatedRouteBranch(...)`

## Out of Scope

- Reworking `buildControlPresenterRuntimeContext(...)`
- Reworking `readRawBody(...)`
- Changing any helper/controller response behavior
- Any router tree or middleware abstraction beyond the single sequencing dispatcher

## Validation

- Focused request-dispatch sequencing tests on the extracted dispatcher seam.
- Preserve existing route-level behavior tests for public/UI/Linear/auth branches.
- Full standard lane validation after implementation.
