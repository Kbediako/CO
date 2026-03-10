# PRD - Coordinator Symphony-Aligned Control Server Request-Shell Binding Extraction

## Problem Statement

After `1103`, `controlServer.ts` no longer owns the request path itself, but `ControlServer.start()` still owns the inline `createControlServerRequestShell(...)` binding that wires the live runtime reader to `handleControlRequest`.

## Desired Outcome

Move only that remaining request-shell binding assembly into one dedicated helper so `controlServer.ts` keeps the outer startup shell while request-shell binding lives behind a focused control-surface helper.

## Scope

- Extract the inline `createControlServerRequestShell(...)` binding from `ControlServer.start()`.
- Preserve the existing live runtime reader closure and `handleControlRequest` behavior.
- Add focused coverage for the extracted request-shell binding helper.

## Non-Goals

- Changes to `createControlServerRequestShell(...)` behavior.
- Changes to `handleControlRequest(...)`, pre-dispatch, or route-dispatch behavior.
- Changes to bootstrap, startup sequence, or seeded-runtime assembly.
- Broader server-factory abstractions.

## Constraints

- Keep the extracted boundary minimal and orchestration-only.
- Preserve current runtime-availability semantics exactly.
- Do not reopen request-path, bootstrap, or seeded-runtime logic in this slice.

## Acceptance Criteria

- `ControlServer.start()` no longer owns the inline request-shell binding assembly.
- A dedicated helper owns the `createControlServerRequestShell(...)` plus `handleControlRequest` binding.
- Focused tests prove the extracted binding seam without changing downstream request behavior.
