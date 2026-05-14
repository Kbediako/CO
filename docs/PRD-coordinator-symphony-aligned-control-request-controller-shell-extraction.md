# PRD - Coordinator Symphony-Aligned Control Request Controller Shell Extraction

## Problem Statement

After `1102`, `controlServer.ts` no longer owns request pre-dispatch assembly, but it still owns the final `handleRequest()` controller shell that calls `buildControlRequestRouteDispatchInput(...)`, branches on null fallthrough, and then delegates into `handleControlRequestRouteDispatch(...)`.

## Desired Outcome

Move only that remaining request-controller shell into one dedicated helper so `controlServer.ts` keeps the outer server/startup shell while request handling lives behind one focused control-surface entrypoint.

## Scope

- Extract the remaining inline `handleRequest()` controller shell that currently:
  - calls `buildControlRequestRouteDispatchInput(...)`
  - returns early on null fallthrough
  - calls `handleControlRequestRouteDispatch(...)`
- Preserve the `1102` pre-dispatch helper contract and the `1101` route-dispatch contract.
- Add focused coverage for the extracted request-controller seam.

## Non-Goals

- Changes to pre-dispatch helper behavior.
- Changes to route sequencing or public/UI/Linear/authenticated controller behavior.
- Changes to request-shell startup or server bootstrap behavior.
- Broader router or middleware abstractions.

## Constraints

- Keep the extracted boundary minimal and orchestration-only.
- Preserve current request fallthrough and dispatch semantics exactly.
- Do not reopen startup, request-shell, pre-dispatch, or deeper controller logic in this slice.

## Acceptance Criteria

- `controlServer.ts` no longer owns the inline request-controller shell in `handleRequest()`.
- A dedicated helper owns the `buildControlRequestRouteDispatchInput(...)` plus `handleControlRequestRouteDispatch(...)` choreography.
- Focused tests prove the extracted request-controller seam without changing downstream pre-dispatch or route-dispatch behavior.
