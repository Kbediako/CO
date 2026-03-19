# PRD - Coordinator Symphony-Aligned Telegram Bridge Bootstrap Handoff Extraction

## Summary

After `1078`, the Telegram oversight read surface is already factored behind dedicated helpers, but `controlServer.ts` still wires the Telegram bootstrap handoff inline when constructing `createControlServerBootstrapLifecycle(...)`:
- it passes the control persistence callback,
- expiry-lifecycle start callback,
- runtime subscription surface,
- and the Telegram read-adapter factory callback.

This slice extracts that remaining bootstrap handoff seam so `controlServer.ts` keeps top-level lifecycle ownership while the Telegram bridge bootstrap dependency assembly moves behind one bounded control-local helper.

## Problem

`controlServer.ts` still owns the inline bootstrap handoff that feeds Telegram bridge startup into `controlServerBootstrapLifecycle.ts`. The remaining logic is small, but it is still transport/bootstrap assembly living in the top-level shell instead of behind a dedicated seam.

## Goals

- Extract the Telegram bridge bootstrap handoff assembly into one dedicated control-local helper.
- Keep `controlServer.ts` responsible for top-level server lifecycle and bind/start ownership, not inline Telegram bootstrap dependency assembly.
- Preserve Telegram bridge startup, bridge subscription wiring, and expiry lifecycle startup behavior exactly.

## Non-Goals

- Telegram bridge runtime or polling changes.
- Telegram command-routing or mutating control behavior.
- Dispatch, question-read, or selected-run read semantics changes.
- Authenticated/API route changes.

## User Value

- Moves CO one more step toward the hardened Symphony posture where the shell wires narrow bootstrapping seams instead of assembling provider/transport handoffs inline.
- Reduces future drift around Telegram bootstrap wiring without broadening into runtime behavior changes.

## Acceptance Criteria

- A dedicated control-local helper owns the Telegram bridge bootstrap handoff assembly currently built inline in `controlServer.ts`.
- `controlServer.ts` delegates that bootstrap handoff to the extracted helper.
- Existing Telegram bridge startup and projection-subscription behavior remain unchanged under focused regressions.
