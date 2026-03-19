# 1079 Elegance Review

- Result: pass.
- Kept: the new `controlTelegramBridgeBootstrapLifecycle.ts` helper because the lane goal is to move the remaining Telegram-specific bootstrap handoff out of `controlServer.ts`; removing it would collapse the extracted seam back into the server shell.
- Confirmed:
  - the helper is a thin wrapper over `createControlServerBootstrapLifecycle(...)`,
  - lazy `getExpiryLifecycle()` binding preserves the prior startup ordering behavior,
  - no Telegram polling, rendering, or command-routing logic moved.
- Rejected as unnecessary:
  - widening into `controlServerBootstrapLifecycle.ts` behavior changes,
  - moving shared dispatch audit emission out of `controlServer.ts`,
  - adding another abstraction around the generic bootstrap lifecycle.

The final shape is the smallest one that meaningfully removes the inline Telegram bootstrap handoff while preserving existing runtime behavior.
