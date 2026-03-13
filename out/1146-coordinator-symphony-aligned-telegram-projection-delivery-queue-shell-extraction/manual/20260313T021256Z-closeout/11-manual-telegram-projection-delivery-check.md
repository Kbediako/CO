# 1146 Manual Telegram Projection Delivery Check

## Extracted helper ownership

- `telegramOversightBridgeProjectionDeliveryQueue.ts` now owns the queued projection delivery shell only: push-enabled gating, closed-state gating, serialized queue chaining, controller-driven delivery calls, callback-driven `statePatch` persistence, failure logging, and shutdown flush waiting.

## Bridge ownership preserved

- `telegramOversightBridge.ts` remains the public composition entrypoint.
- The bridge still owns bridge-local whole-state authority, `next_update_id` persistence, runtime lifecycle composition, and the controller/client wiring that feeds the helper callbacks.

## Behavioral backstops

- `TelegramOversightBridgeProjectionDeliveryQueue.test.ts` covers disabled/closed gating, serialized queue execution using the latest push state, and failure recovery that allows later deliveries to continue.
- Existing bridge integration coverage remains intact in `TelegramOversightBridge.test.ts` and `ControlTelegramBridgeLifecycle.test.ts`, preserving queue-backed projection delivery, lifecycle flush, and persisted-state write-through semantics.
