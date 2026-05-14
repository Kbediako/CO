# PRD: Coordinator Symphony-Aligned Control Telegram Bridge Bootstrap Oversight Factory Extraction

## Problem

`1150` neutralized the read and update contracts consumed by the Telegram bridge lifecycle, but `controlTelegramBridgeBootstrapLifecycle.ts` still inlines the lazy closure that assembles the oversight facade from shared request context, expiry lifecycle lookup, and dispatch-audit emission.

## Goal

Extract that lazy bootstrap-side oversight-factory assembly into a tiny adjacent helper while preserving the existing lazy callback shape, per-call expiry lifecycle reread, and Telegram bootstrap/runtime behavior.

## Non-Goals

- Telegram bridge runtime lifecycle, polling, or projection-delivery changes
- `ControlTelegramBridgeLifecycle` concurrency or shutdown changes
- Read-contract or update-contract shape changes
- Broader `controlServer` or bootstrap-assembly refactors
- New non-Telegram consumers in the same slice

## Requirements

1. One adjacent helper/factory owns the lazy oversight-facade assembly currently inlined in `controlTelegramBridgeBootstrapLifecycle.ts`.
2. `controlTelegramBridgeBootstrapLifecycle.ts` composes that helper into `createControlTelegramBridgeLifecycle(...)` without changing the downstream callback contract.
3. The helper preserves lazy facade creation and rereads `getExpiryLifecycle()` on every factory call, including the `null` case.
4. Telegram bootstrap behavior and the existing bridge lifecycle contract remain unchanged.
5. Focused regressions cover both the extracted helper and the bootstrap lifecycle composition seam.

## Success Criteria

- `controlTelegramBridgeBootstrapLifecycle.ts` no longer inlines the oversight-facade assembly closure.
- The new helper keeps the same lazy/runtime semantics proven by focused regressions.
- The standard closeout gate bundle passes on the final tree.
