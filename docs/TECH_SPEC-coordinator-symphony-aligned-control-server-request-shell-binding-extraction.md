# TECH_SPEC - Coordinator Symphony-Aligned Control Server Request-Shell Binding Extraction

## Overview

This slice removes the remaining inline request-shell binding assembly from `ControlServer.start()` while preserving the extracted controller-owned request path from `1103`.

## Current State

- `ControlServer.start()` still:
  - defines the live runtime reader closure against `instance`
  - calls `createControlServerRequestShell(...)`
  - binds `handleRequest: handleControlRequest`
- The request-shell implementation already lives in `controlServerRequestShell.ts`.
- The request controller path already lives in `controlRequestController.ts`.

## Target State

- Move the request-shell binding assembly into one dedicated helper.
- Let `ControlServer.start()` provide only the live runtime reader closure.
- Preserve the current runtime-null behavior and request handoff unchanged.

## Proposed API

- `createBoundControlServerRequestShell(options): http.Server`
  - Receives:
    - `readRuntime`
  - Internally calls `createControlServerRequestShell(...)` with:
    - `readRuntime`
    - `handleRequest: handleControlRequest`

## Out of Scope

- Reworking `createControlServerRequestShell(...)`
- Reworking `handleControlRequest(...)`
- Reworking startup/bootstrap/seed-loading logic
- Any new server factory abstraction beyond the single binding helper

## Validation

- Focused tests for runtime-reader forwarding and `handleControlRequest` binding.
- Preserve existing request-shell and request-controller behavior coverage.
- Full standard lane validation after implementation.
