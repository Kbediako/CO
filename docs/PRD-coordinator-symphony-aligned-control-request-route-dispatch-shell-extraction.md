# PRD - Coordinator Symphony-Aligned Control Request Route Dispatch Shell Extraction

## Problem Statement

After the public-route, UI-session, and Linear webhook branch helpers were extracted, `controlServer.ts` still owns the remaining `handleRequest()` branch choreography inline. The host file is still responsible for sequencing those helpers, handling their early returns, and falling through to the authenticated route branch.

## Desired Outcome

Move only the remaining request-route branch sequencing shell into a dedicated dispatcher so `controlServer.ts` keeps the server/runtime shell while the request routing order is owned by one focused control-surface module.

## Scope

- Extract the inline `handleRequest()` branch sequence that currently coordinates:
  - public route handling
  - UI session admission
  - Linear webhook branch handling
  - authenticated route fallback
- Preserve existing route ordering, early-return behavior, and controller/helper ownership.
- Keep runtime/presenter context assembly in place unless the dispatcher needs them as pass-through inputs.

## Non-Goals

- Changes to public route helper behavior.
- Changes to UI session admission behavior.
- Changes to Linear webhook behavior.
- Changes to authenticated route behavior.
- Broader router, middleware, or framework abstractions over the control server.

## Constraints

- Preserve current ordering exactly: public route, UI session admission, Linear webhook, then authenticated route fallback.
- Keep the extracted boundary minimal and orchestration-only.
- Do not reopen deeper controller logic or review-wrapper reliability work in this slice.

## Acceptance Criteria

- `controlServer.ts` no longer owns the inline route-branch sequence in `handleRequest()`.
- A dedicated dispatcher/helper owns the request-route branch sequencing and early-return contract.
- Focused tests prove the extracted sequencing seam without changing the existing helper/controller contracts.
