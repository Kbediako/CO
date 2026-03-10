# PRD - Coordinator Symphony-Aligned Control Server Ready-Instance Startup Composition Extraction

## Summary

After `1104`, `ControlServer.start()` is down to one remaining stateful startup composition block: instantiate the ready server host, attach the bootstrap lifecycles, and run the final startup sequence that binds the server to a base URL or fails closed. This slice extracts that ready-instance startup composition into one bounded helper so the top-level server method becomes a thinner composition entrypoint.

## Problem

`ControlServer.start()` still owns:
- `new ControlServer(...)` host construction,
- bootstrap lifecycle attachment over the already-extracted bootstrap assembly helper,
- final `startControlServerStartupSequence(...)` orchestration,
- close-on-startup-failure wiring through the live instance.

That is now the highest-cost review surface in `start()` because a reader still has to simulate instance mutation, lifecycle attachment, and failure cleanup across several extracted helpers.

## Goals

- Extract the remaining ready-instance startup composition from `ControlServer.start()` into one helper.
- Keep `ControlServer.start()` focused on token generation, seed loading, seeded runtime assembly, request-shell binding, and ready-instance return.
- Preserve startup ordering, lifecycle attachment, and failure cleanup exactly.

## Non-Goals

- Seed loading or seeded runtime assembly changes.
- Request-shell binding or request-path behavior changes.
- Changes to `controlBootstrapAssembly.ts`.
- Changes to `controlServerStartupSequence.ts`.
- `close()` shutdown ordering changes.

## User Value

- Continues the Symphony-aligned thin-shell direction for `ControlServer`.
- Reduces the last stateful orchestration block in `start()` to an explicit seam that is easier to review and harden.

## Acceptance Criteria

- One helper owns ready-instance construction, bootstrap lifecycle attachment, and final startup sequencing over the already-extracted collaborators.
- `ControlServer.start()` delegates that composition while preserving startup ordering and failure cleanup semantics.
- Focused regressions prove success-path startup wiring and fail-closed startup behavior remain unchanged.
