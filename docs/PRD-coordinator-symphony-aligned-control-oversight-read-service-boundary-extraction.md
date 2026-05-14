# PRD: Coordinator Symphony-Aligned Control Oversight Read Service Boundary Extraction

## Problem

After `1147`, Telegram bootstrap and lifecycle now consume a coordinator-owned oversight facade, but the facade still composes a Telegram-named read adapter underneath it. That leaves the coordinator boundary structurally aligned while read assembly ownership and naming remain Telegram-local.

## Goal

Replace the Telegram-named read adapter under the oversight facade with a coordinator-owned oversight read service so the facade becomes a fully coordinator-owned contract, while preserving the current selected-run, dispatch, and question read behavior and leaving the existing Telegram bridge contract and payload types unchanged.

## Non-Goals

- Telegram polling, update-handler, state-store, or projection-delivery refactors
- Env/config parsing changes
- New Telegram commands or bot behavior
- Changes to dispatch/question semantics
- Broader `controlServer` rewrites or authority shifts
- New Discord or Linear surface expansion

## Requirements

1. One coordinator-owned oversight read service replaces `createControlTelegramReadAdapter(...)` under the oversight facade.
2. The oversight facade remains the public coordinator-owned boundary exposing:
   - selected-run read
   - dispatch read
   - question read
   - projection/update subscription
3. Dispatch/question read behavior remains unchanged; the slice is naming/ownership alignment, not a behavior rewrite.
4. Focused regressions cover the new read-service seam plus the integrated facade behavior.

## Success Criteria

- `controlOversightFacade.ts` no longer composes a Telegram-named read adapter directly.
- The replacement read service is coordinator-owned and keeps the same output contract.
- Focused regressions and the standard closeout gate bundle pass on the final tree.
