# 1145 Closeout Summary

- Status: completed
- Scope: extracted the remaining Telegram bridge runtime lifecycle shell from `telegramOversightBridge.ts` into `telegramOversightBridgeRuntimeLifecycle.ts` while keeping the bridge as the public composition entrypoint and owner of persisted state, projection notification queuing, and `next_update_id` persistence.

## Shipped seam

- New helper: `orchestrator/src/cli/control/telegramOversightBridgeRuntimeLifecycle.ts`
- Bridge shell remains in: `orchestrator/src/cli/control/telegramOversightBridge.ts`
- Focused helper coverage: `orchestrator/tests/TelegramOversightBridgeRuntimeLifecycle.test.ts`
- Integrated bridge coverage: `orchestrator/tests/TelegramOversightBridge.test.ts`, `orchestrator/tests/ControlTelegramBridgeLifecycle.test.ts`

## Validation

- `delegation-guard`, `spec-guard`, `build`, `lint`, `docs:check`, `docs:freshness`, and `pack:smoke` passed.
- Focused Telegram regressions passed `3` files and `21` tests.
- Full suite passed `200` files and `1441` tests.
- Bounded review returned no findings after the final-tree rerun.
- The docs-first package already captured the initial delegated scout and the final clean docs-review rerun.

## Outcome

- The new helper now owns persisted-state bootstrap, bot identity fetch, polling-controller start/abort wiring, loop shutdown wait, and notification flush swallowing during shutdown.
- The bridge still owns bridge-local state authority, `next_update_id` persistence, projection notification queueing, and the public start/config factory surface.
- The final elegance pass removed the extra public `readBotUsername()` method from the helper surface so the extraction stays on the minimal runtime lifecycle contract.
