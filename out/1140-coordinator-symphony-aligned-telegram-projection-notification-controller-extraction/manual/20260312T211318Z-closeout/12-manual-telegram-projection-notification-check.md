# 1140 Manual Telegram Projection Notification Check

- Verified the extracted helper boundary against the final-tree code:
  - `controlTelegramProjectionNotificationController.ts` owns only outbound projection render/transition/send behavior.
  - `telegramOversightBridge.ts` still owns queue serialization, closed/pushEnabled gating, bridge-state assignment, and persistence.
- Confirmed focused regressions cover the preserved outbound contract:
  - dedupe skips unchanged projections,
  - cooldown stores pending projection state without sending,
  - eligible projection changes fan out to all allowed chats,
  - accepted live Linear projection changes still flow through the bridge push path.
- Preserved runtime semantics:
  - send fan-out still happens before the bridge mutates/persists `this.state`,
  - no queue or lifecycle ownership moved into the controller,
  - the helper contract is narrower than the bridge contract because it depends only on rendered projection data, not the whole read controller.
