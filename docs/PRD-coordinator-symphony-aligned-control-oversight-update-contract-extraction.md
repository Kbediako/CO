# PRD: Coordinator Symphony-Aligned Control Oversight Update Contract Extraction

## Problem

`1149` moved the oversight read contract out of Telegram ownership, but the Telegram bridge lifecycle still depends on the aggregate `ControlOversightFacade` shape for the update-side `subscribe(...)` hook that drives projection notifications.

## Goal

Extract that update contract into a coordinator-owned oversight contract module, then have the Telegram bridge lifecycle consume that neutral update surface without changing polling, projection delivery, or read behavior.

## Non-Goals

- Telegram polling, update-handler, projection-delivery, or state-store refactors
- Read-contract or read-payload changes
- New bot commands or changed Telegram operator behavior
- Runtime authority changes
- New non-Telegram consumers in the same slice
- Broader `controlServer` rewrites

## Requirements

1. One coordinator-owned oversight update contract replaces facade-specific ownership of the `subscribe(...)` surface used for projection updates.
2. `controlOversightFacade.ts` composes the coordinator-owned read contract plus the extracted update contract instead of being the sole owner of that update-side shape.
3. `controlTelegramBridgeLifecycle.ts` consumes the neutral update boundary rather than a facade-specific type.
4. Telegram bridge runtime lifecycle and projection notification behavior remain unchanged.
5. Focused regressions cover the extracted update seam plus integrated Telegram lifecycle wiring.

## Success Criteria

- The canonical oversight update contract no longer lives only behind `ControlOversightFacade`.
- Telegram lifecycle wiring consumes a neutral coordinator-owned update surface.
- Focused regressions and the standard closeout gate bundle pass on the final tree.
