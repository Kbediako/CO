# TECH_SPEC - Coordinator Symphony-Aligned Control Server Request Body Helper Extraction

## Overview

`1089` extracts the shared request-body helper cluster from `orchestrator/src/cli/control/controlServer.ts`. The target seam is the local helper surface around:
- `readRawBody(...)`
- `readJsonBody(...)`
- the local `HttpError` request-body boundary those helpers depend on

The extraction should move raw-body IO plus canonical JSON parse error behavior behind one bounded helper module while preserving current route/controller behavior.

## Current Behavior

- `controlServer.ts` owns request entry, route branching, public-route helpers, request-body helpers, and controller wiring.
- Linear webhook handling receives `readRawBody(...)` directly from `controlServer.ts`.
- Authenticated-route composition receives `readRequestBody: () => readJsonBody(req)` from `controlServer.ts`.
- `invalid_json` and `request_body_too_large` are surfaced through the existing `HttpError` handling path.

## Proposed Changes

1. Add one bounded helper module
- Introduce a control-local helper module for shared request-body IO.
- That helper should own:
  - raw-body byte collection with the existing max-body guard
  - canonical JSON parse handling
  - the shared request-body error type if it is still required by the extracted seam

2. Keep `controlServer.ts` as the request-entry shell
- `handleRequest(...)` should still branch between:
  - health/root/UI routes
  - UI session issuance
  - Linear webhook handling
  - authenticated route handling
- It should delegate only the body-reader/helper cluster when wiring:
  - `readRawBody`
  - `readRequestBody`

3. Preserve current contracts
- No HTTP status changes.
- No error code changes.
- No callback signature changes for Linear webhook or authenticated-route composition beyond updated helper imports.

## Constraints

- Keep the change bounded to `controlServer.ts` plus one helper/tests.
- Do not reopen the `1088` audit/error helper surface.
- Do not broaden into UI/public-route helper extraction.

## Validation

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
- Focused request-body regression coverage
