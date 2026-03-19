# 1139 Manual Telegram Update Handler Check

- Verified the extracted helper boundary against the final-tree code:
  - `controlTelegramUpdateHandler.ts` owns update-local ingress policy only.
  - `telegramOversightBridge.ts` still owns poll-loop sequencing, startup/shutdown, `next_update_id` persistence, and push notifications.
- Confirmed focused regressions cover the extracted behavior without widening lifecycle scope:
  - `ControlTelegramUpdateHandler.test.ts`: direct update-local ingress branches.
  - `ControlTelegramCommandController.test.ts`: preserved mutating fallback contract.
  - `TelegramOversightBridge.test.ts`: preserved bridge sequencing, read routing, and offset advancement behavior.
- Mock/operator-facing contract preserved:
  - unauthorized chats are ignored,
  - non-slash text gets `Use /help for available commands.`,
  - `/status@<bot>` normalization still routes as a read command,
  - read miss still falls through to the mutating controller,
  - unknown commands still return the existing fallback reply.
