# PRD - Coordinator Symphony-Aligned Control Server Pending Ready-Instance Activation Guard

## Summary

After `1121`, `ControlServer.start()` is down to startup-input preparation plus `startPendingReadyInstance(...)`. The remaining mutable startup shell is the activation guard inside `startPendingReadyInstance(...)`: the live `instance` cell, request-shell reader wiring, bootstrap attachment, close-on-failure wiring, and ready `baseUrl` publication.

## Problem

`startPendingReadyInstance(...)` still mixes:
- the live `instance` cell that request-shell readers dereference,
- pending `ControlServer` construction,
- bootstrap/expiry lifecycle attachment,
- close-on-failure routing,
- ready `baseUrl` publication and return.

That is the next truthful Symphony-aligned seam after `1121`, but it must stay tightly bounded and must not reopen startup-input preparation or downstream ready-instance startup helpers.

## Goals

- Extract the pending ready-instance activation guard into one bounded helper or same-file private seam.
- Keep `ControlServer.start()` and the class focused on orchestration, public runtime ownership, and close behavior.
- Preserve activation ordering, request-shell reader semantics, bootstrap attachment, and close-on-failure behavior exactly.

## Non-Goals

- Changes to `prepareControlServerStartupInputs(...)`.
- Changes to `createBoundControlServerRequestShell(...)`.
- Changes to `startControlServerReadyInstanceStartup(...)`.
- Changes to request routing, bootstrap assembly internals, or `ControlServer.close()`.
- Review-wrapper work.

## User Value

- Continues the Symphony-aligned thinning of the control-server composition root without weakening CO’s authority model.
- Makes the remaining activation shell explicit and testable while keeping already-extracted collaborators intact.

## Acceptance Criteria

- `controlServer.ts` no longer owns the inline pending ready-instance activation guard beyond delegating to one bounded helper and returning the ready instance.
- The extracted seam owns only the live `instance` cell, request-shell reader wiring, bootstrap/expiry lifecycle attachment, close-on-failure routing, and final `baseUrl` publication/return.
- `prepareControlServerStartupInputs(...)`, `createBoundControlServerRequestShell(...)`, `startControlServerReadyInstanceStartup(...)`, and `ControlServer.close()` behavior remain unchanged.
- Focused regression coverage proves request-shell reader dereferencing, bootstrap attachment, and close-on-failure behavior stay identical.
