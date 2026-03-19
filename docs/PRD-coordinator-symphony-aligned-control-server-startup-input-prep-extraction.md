# PRD - Coordinator Symphony-Aligned Control Server Startup Input Prep Extraction

## Summary

After `1106`, `ControlServer.start()` is down to one weak composition shell: generate the control token, read startup seeds, assemble the seeded runtime context, and hand those prepared inputs into the already-extracted pending-ready-instance startup path. This slice extracts that startup-input prep into one bounded helper so `ControlServer.start()` becomes a thinner composition entrypoint.

## Problem

`ControlServer.start()` no longer owns mutable host-shell or request-handling behavior, but it still interleaves:
- control-token generation,
- startup seed-loading delegation,
- seeded-runtime assembly delegation,
- final handoff into `startPendingReadyInstance(...)`.

That is a smaller seam than the earlier host-shell work, but it still makes the method carry startup-input preparation instead of only coordinating already-extracted collaborators.

## Goals

- Extract the remaining startup-input prep from `ControlServer.start()` into one bounded helper.
- Keep `ControlServer.start()` focused on high-level orchestration and ready-instance return.
- Preserve control-token generation, seed-loading behavior, seeded-runtime assembly behavior, and ready-instance startup handoff exactly.

## Non-Goals

- Changes to `readControlServerSeeds(...)`.
- Changes to `createControlServerSeededRuntimeAssembly(...)`.
- Changes to `startPendingReadyInstance(...)`.
- Changes to request routing, bootstrap lifecycle sequencing, or shutdown ordering.
- Review-wrapper or standalone-review reliability work.

## User Value

- Resumes the broader Symphony-aligned extraction track from the clean `1120` handoff point.
- Makes control-server startup composition more explicit without widening the public surface or reopening earlier extracted seams.

## Acceptance Criteria

- `ControlServer.start()` no longer owns inline startup-input preparation beyond delegating to one bounded helper and returning the ready instance.
- The extracted helper owns only control-token generation, seed-loading delegation, seeded-runtime assembly delegation, and preparation of the inputs passed into `startPendingReadyInstance(...)`.
- Downstream helpers and behavior remain unchanged.
- Focused regression coverage proves the prepared runtime inputs and ready-instance startup handoff stay identical.
