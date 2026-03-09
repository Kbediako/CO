# TECH_SPEC - Coordinator Symphony-Aligned Control Server Public Route and UI Asset Helper Extraction

## Overview

This slice removes the remaining public-route and static UI asset helper cluster from `controlServer.ts` while keeping request-entry ownership, authenticated-route admission, session handling, and webhook/controller sequencing in place.

## Current State

- `controlServer.ts` still defines:
  - `resolveUiRoot()`
  - `resolveUiAssetPath(...)`
  - `serveUiAsset(...)`
  - `resolveUiContentType(...)`
- `handleRequest(...)` still inlines:
  - `/health` JSON write
  - `/` redirect
  - the UI asset resolution/serve branch

## Target State

- Add one bounded control-local helper module for the public-route/UI-asset cluster.
- Move only the public-route/UI-asset cluster into that module.
- Keep `handleRequest(...)` as the branch-order shell and have it delegate public-route handling to the extracted module.

## Proposed API

- `handlePublicControlRoute(context): Promise<boolean>`
  - Returns `true` when the request was handled.
  - Returns `false` when the request should continue through the remaining `handleRequest(...)` branches.

The helper should encapsulate:

- `/health` response shaping
- `/` redirect handling
- UI asset path resolution
- UI asset serving/content-type logic

## Out of Scope

- `handleUiSessionRequest(...)` wiring
- `normalizeAllowedHosts(...)`
- `isLoopbackAddress(...)`
- authenticated-route admission and controller dispatch
- Linear webhook handling

## Validation

- Focused tests for the extracted helper module.
- Preserve existing route-level control-server behavior tests for `/health`, `/`, and UI asset serving as needed.
- Full standard lane validation after implementation.
