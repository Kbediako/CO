# PRD - Coordinator Symphony-Aligned Control Server Live-Instance Host Shell Extraction

## Summary

After `1105`, `ControlServer.start()` still owns one small but stateful host-shell block: create the pending `ControlServer` instance around the bound request shell, keep the request-shell readers live against that pending instance, then run the ready-instance startup helper through callbacks that mutate or close that same instance. This slice extracts that whole mutable host shell into a same-file `ControlServer` helper.

## Problem

`ControlServer.start()` now delegates seed loading, seeded runtime assembly, request-shell binding, and ready-instance startup sequencing, but it still owns:
- nullable-instance creation around the bound server,
- request-shell reader closures that must keep dereferencing the live instance,
- bootstrap lifecycle attachment callbacks,
- startup failure cleanup targeting the same partially started instance.

That is the last inline block in `start()` where a reviewer still has to simulate mutable instance state across multiple extracted collaborators.

## Goals

- Extract the pending ready-instance host shell from `ControlServer.start()` into one bounded same-file helper that returns the fully started `ControlServer`.
- Keep the helper private to `ControlServer` so no new exported control-surface abstraction is introduced.
- Preserve live reader semantics, bootstrap attachment ordering, and fail-closed cleanup exactly.

## Non-Goals

- Changes to seed loading or seeded runtime assembly.
- Changes to `createBoundControlServerRequestShell(...)`.
- Changes to `startControlServerReadyInstanceStartup(...)`.
- Changes to `close()` shutdown ordering.
- Review-wrapper or standalone review contract work.

## User Value

- Continues the Symphony-aligned thin-shell direction by shrinking `ControlServer.start()` to a clearer composition entrypoint.
- Makes the last mutable startup bridge explicit without widening the public control surface.

## Acceptance Criteria

- `ControlServer.start()` no longer owns the pending instance construction, callback bridge, and ready-start handoff inline.
- A same-file private helper on `ControlServer` owns the bound server, pending instance, bootstrap-attachment callback, failure-close callback, and call into the ready-instance startup helper.
- Focused tests prove request-shell readers stay live over the same instance, bootstrap callbacks mutate that instance, and startup failure cleanup still closes it correctly.
