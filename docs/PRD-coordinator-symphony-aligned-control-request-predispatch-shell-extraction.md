# PRD - Coordinator Symphony-Aligned Control Request Predispatch Shell Extraction

## Problem Statement

After `1101`, `controlServer.ts` no longer owns inline request-route sequencing, but `handleRequest()` still owns the remaining pre-dispatch shell: guarding missing `req`/`res`, parsing the request URL, assembling presenter/runtime context, and shaping the dispatcher input before handing off to the extracted route dispatcher.

## Desired Outcome

Move only that remaining pre-dispatch shell into one dedicated helper so `controlServer.ts` keeps the outer server shell while request pre-dispatch assembly is owned by one focused control-surface module.

## Scope

- Extract the remaining inline `handleRequest()` pre-dispatch shell that currently coordinates:
  - missing `req`/`res` guard
  - request URL parsing
  - presenter/runtime context assembly
  - shaping the input passed to `handleControlRequestRouteDispatch(...)`
- Preserve the existing route-dispatch contract and helper/controller ownership below it.
- Add focused coverage for the extracted pre-dispatch helper.

## Non-Goals

- Changes to route sequencing or authenticated/public/UI/Linear controller behavior.
- Changes to request-shell startup or server bootstrap behavior.
- Changes to `buildControlPresenterRuntimeContext(...)` internals beyond moving its call site.
- Broader router or middleware abstractions.

## Constraints

- Preserve the current handoff contract into `handleControlRequestRouteDispatch(...)`.
- Keep the extracted boundary minimal and orchestration-only.
- Do not reopen startup, request-shell, or deeper controller logic in this slice.

## Acceptance Criteria

- `controlServer.ts` no longer owns the inline pre-dispatch request assembly in `handleRequest()`.
- A dedicated helper owns the `req`/`res` guard, URL parsing, presenter/runtime assembly, and dispatcher-input shaping.
- Focused tests prove the extracted pre-dispatch seam without changing downstream dispatch/controller behavior.
