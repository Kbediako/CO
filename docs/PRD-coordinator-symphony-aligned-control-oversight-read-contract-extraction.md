# PRD: Coordinator Symphony-Aligned Control Oversight Read Contract Extraction

## Problem

`1148` moved read-service ownership under the coordinator-owned oversight facade, but the read contract itself still belongs to Telegram. `controlOversightReadService.ts`, `controlOversightFacade.ts`, and `controlTelegramReadController.ts` still depend on `TelegramOversightReadAdapter` plus payload types defined in `telegramOversightBridge.ts`.

## Goal

Extract the selected-run/dispatch/question read contract out of `telegramOversightBridge.ts` into a coordinator-owned oversight contract module, then make the Telegram bridge consume that neutral contract without changing runtime lifecycle, polling behavior, or read payload semantics.

## Non-Goals

- Telegram polling, update-handler, projection-delivery, or state-store refactors
- New bot commands or changed user-facing Telegram behavior
- Dispatch/question helper rewrites or payload-shape changes
- Runtime lifecycle or authority changes
- New non-Telegram consumers in the same slice
- Broader `controlServer` rewrites

## Requirements

1. One coordinator-owned oversight read contract replaces Telegram ownership of the selected-run/dispatch/question read interface.
2. The existing read payload shapes stay intact for the Telegram bridge and controller paths.
3. `controlOversightFacade.ts` and `controlOversightReadService.ts` consume the coordinator-owned contract instead of importing it from `telegramOversightBridge.ts`.
4. The Telegram bridge runtime continues to consume the read contract, but only as a downstream consumer rather than the defining owner.
5. Focused regressions cover the contract extraction seam plus integrated Telegram read-controller behavior.

## Success Criteria

- `telegramOversightBridge.ts` no longer defines the canonical oversight read contract.
- Coordinator-owned files own the read contract while Telegram runtime/controller behavior stays unchanged.
- Focused regressions and the standard closeout gate bundle pass on the final tree.
