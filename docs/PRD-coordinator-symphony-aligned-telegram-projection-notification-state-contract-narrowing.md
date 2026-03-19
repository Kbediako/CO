# PRD - Coordinator Symphony-Aligned Telegram Projection Notification State Contract Narrowing

## Summary

After `1140` extracted the outbound projection-notification controller, the remaining Telegram seam is not another branch extraction. It is the controller contract itself: the extracted controller still accepts and returns the full `TelegramOversightBridgeState` even though the bridge should remain the owner of whole-state assembly and persistence.

## Problem

`controlTelegramProjectionNotificationController.ts` is now the right bounded branch, but its state contract is still wider than necessary:
- it accepts the full bridge state rather than the push-state slice it actually reasons about,
- it returns a full bridge state even though the bridge owns persistence, `next_update_id`, and overall runtime state assembly,
- that leaves some bridge-state shape coupled to a controller that should only decide projection-notification outcomes.

## Goals

- Narrow the projection-notification controller contract so it no longer owns full bridge-state shape.
- Keep `telegramOversightBridge.ts` authoritative for whole-state assembly, `next_update_id`, `updated_at`, persistence, and queue ownership.
- Preserve existing dedupe, cooldown, pending, and send semantics exactly.

## Non-Goals

- No change to notification queue ownership.
- No change to poll-loop lifecycle or update ingress.
- No change to Telegram Bot API transport.
- No change to `ControlTelegramReadController` presentation behavior.
- No change to `controlTelegramPushState.ts` semantics beyond what is strictly required to narrow the contract.

## User Value

- Continues the Symphony-like move from large runtime-owned structures toward smaller, role-accurate controller contracts.
- Reduces coupling between the bridge runtime and the extracted notification controller.
- Makes future Telegram refactors less likely to accidentally widen back into whole-bridge state handling.

## Acceptance Criteria

- The projection-notification controller no longer accepts or returns the full `TelegramOversightBridgeState`.
- `telegramOversightBridge.ts` remains the owner of full-state assembly and persistence.
- Existing Telegram projection dedupe/cooldown/send behavior remains unchanged in focused and integrated tests.
