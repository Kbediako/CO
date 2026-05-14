# PRD - Coordinator Symphony-Aligned Telegram Bridge Lifecycle Ownership Extraction

## Summary

After `1080`, bootstrap metadata persistence is isolated behind `persistControlBootstrapMetadata(...)`, but `controlServerBootstrapLifecycle.ts` still owns the Telegram bridge runtime lifecycle inline:
- bridge startup,
- runtime subscription attachment,
- bridge instance/unsubscribe state,
- close-on-attach-failure handling,
- bridge shutdown during lifecycle close.

This slice extracts that Telegram bridge lifecycle ownership into one bounded helper so the bootstrap lifecycle reads more like an ordered coordinator while Telegram-specific bridge ownership moves behind a single coherent seam.

## Problem

`controlServerBootstrapLifecycle.ts` now mixes two different concerns:
- generic ordered bootstrap sequencing (`persist -> expiry -> bridge`),
- Telegram-specific bridge lifecycle state and cleanup.

That Telegram bridge ownership is cohesive, but it is still implemented inline across `startTelegramBridge()`, `attachTelegramBridge()`, and `close()`.

## Goals

- Extract Telegram bridge lifecycle ownership into one dedicated control-local helper.
- Keep `controlServerBootstrapLifecycle.ts` responsible for startup ordering, not Telegram-specific bridge state and cleanup mechanics.
- Preserve lazy read-adapter creation, runtime subscription behavior, and shutdown semantics exactly.

## Non-Goals

- Changes to `persistControlBootstrapMetadata(...)`.
- Expiry lifecycle ordering changes.
- Changes to `createControlTelegramReadAdapter(...)`.
- Changes inside `telegramOversightBridge.ts` runtime internals such as polling, rendering, dispatch execution, or projection push logic.
- `controlServer.ts` bind/listen/start ownership changes beyond a tiny composition-site touch if required.

## User Value

- Continues the Symphony-aligned thin-coordinator shape by moving the remaining Telegram-specific lifecycle ownership behind one focused helper.
- Makes future hardening of bridge startup and shutdown easier without widening into transport internals or broader server ownership.

## Acceptance Criteria

- A dedicated control-local helper owns Telegram bridge startup, runtime subscription attachment, bridge instance state, unsubscribe state, and shutdown behavior currently implemented in `controlServerBootstrapLifecycle.ts`.
- `controlServerBootstrapLifecycle.ts` delegates Telegram bridge lifecycle ownership while preserving the existing `persist -> expiry -> bridge` sequence.
- Focused regressions prove lazy read-adapter creation, attach behavior, and shutdown behavior remain unchanged.
