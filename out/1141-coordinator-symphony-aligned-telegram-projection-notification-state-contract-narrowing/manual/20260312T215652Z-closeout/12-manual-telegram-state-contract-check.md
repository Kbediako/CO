# 1141 Manual Telegram State-Contract Check

- Verified the final-tree controller/bridge ownership boundary:
  - `controlTelegramProjectionNotificationController.ts` now consumes only `pushState` and returns a small `statePatch`,
  - `telegramOversightBridge.ts` remains the only owner of full `TelegramOversightBridgeState`, persistence, queue serialization, and `next_update_id`.
- Confirmed the narrowed helper contract still preserves the prior push-policy semantics:
  - unchanged projection hashes still skip and clear pending state,
  - cooldown transitions still record pending projection state without sending,
  - repeated pending hashes preserve the original `pending_projection_observed_at`,
  - eligible projection changes still fan out to all allowed chats.
- Confirmed integrated bridge semantics stay correct after the narrowing:
  - bridge push paths preserve seeded non-zero `next_update_id` through send and cooldown/flush flows,
  - bridge-side merge now preserves monotonic top-level `updated_at` while keeping push-level send timestamps intact,
  - no queue, lifecycle, ingress, or transport ownership moved into the controller.
