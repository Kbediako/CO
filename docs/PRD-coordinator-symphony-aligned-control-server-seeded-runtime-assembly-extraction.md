# PRD - Coordinator Symphony-Aligned Control Server Seeded Runtime Assembly Extraction

## Summary

After `1083`, `ControlServer.start()` still owns the seeded runtime assembly block between JSON seed reads and HTTP server creation. That block builds the stores, runtime, event transport, persist closures, and `requestContextShared`. This slice extracts that seeded runtime assembly into one bounded helper so the server method becomes a thinner top-level composition shell.

## Problem

`ControlServer.start()` still contains one large inline block that mixes:
- seeded store construction,
- `rlm` default-toggle injection,
- linear advisory normalization plus runtime creation,
- event transport creation,
- persist helper assembly,
- `requestContextShared` assembly.

That block is now the next cohesive concern after bootstrap assembly and startup sequencing moved out.

## Goals

- Extract the seeded runtime assembly block from `ControlServer.start()` into one helper.
- Keep `ControlServer.start()` focused on seed loading, server/request shell composition, bootstrap assembly/startup delegation, and ready-instance return.
- Preserve runtime identity wiring, live persist closures, and `rlm` default-toggle behavior exactly.

## Non-Goals

- Changing JSON seed reads before the block.
- Changing the startup shell now owned by `controlServerStartupSequence.ts`.
- Changing `createControlBootstrapAssembly(...)`.
- Route handling/controller changes.
- `close()` shutdown ordering changes.

## User Value

- Continues the Symphony-aligned thin-shell direction for `ControlServer`.
- Makes future runtime hardening easier by isolating seeded runtime assembly behind one explicit seam.

## Acceptance Criteria

- One helper owns seeded store/runtime/persist/request-context assembly after JSON seeds are read and before `http.createServer(...)`.
- `ControlServer.start()` delegates that seeded runtime assembly while preserving current behavior and identity wiring.
- Focused regressions prove seed defaults, live persist closures, and externally observable request-context/runtime shape remain unchanged.
