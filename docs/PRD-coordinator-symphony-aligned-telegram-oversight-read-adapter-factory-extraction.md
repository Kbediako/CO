# PRD - Coordinator Symphony-Aligned Telegram Oversight Read Adapter Factory Extraction

## Summary

After `1076` and `1077`, the non-trivial Telegram-local read seams now live behind dedicated helpers, but `controlServer.ts` still assembles the Telegram oversight read adapter factory inline:
- selected-run reads directly from the runtime snapshot,
- dispatch reads delegate through `controlTelegramDispatchRead.ts`,
- question reads delegate through `controlTelegramQuestionRead.ts`.

This slice extracts that remaining Telegram oversight read-adapter factory so `controlServer.ts` keeps lifecycle and transport ownership while the Telegram read surface is assembled behind one bounded control-local helper.

## Problem

`controlServer.ts` still owns the inline factory that wires the Telegram oversight read surface together. The assembly is now narrow, but leaving it in the shell keeps one more Telegram/control seam in the top-level server surface and slows the move toward a Symphony-style thin shell.

## Goals

- Extract the remaining Telegram oversight read-adapter factory into one dedicated control-local helper.
- Keep `controlServer.ts` responsible for server lifecycle and bridge registration, not read-adapter factory assembly.
- Preserve selected-run, dispatch, and question read behavior exactly.

## Non-Goals

- Telegram polling, rendering, or command-routing changes.
- Dispatch evaluation or question-read sequencing changes.
- Authenticated/API route changes.
- Broader Telegram controller/runtime refactors.

## User Value

- Moves CO one more step toward the hardened Symphony posture where the top-level shell wires narrow helpers instead of assembling transport-specific read surfaces inline.
- Lowers future drift risk across Telegram operator-facing reads without widening into behavior changes.

## Acceptance Criteria

- A dedicated control-local helper owns the Telegram oversight read-adapter factory assembly.
- `controlServer.ts` delegates `createTelegramOversightReadAdapter()` to that helper.
- Existing Telegram selected-run, `/dispatch`, and `/questions` behavior remains unchanged under focused regressions.
