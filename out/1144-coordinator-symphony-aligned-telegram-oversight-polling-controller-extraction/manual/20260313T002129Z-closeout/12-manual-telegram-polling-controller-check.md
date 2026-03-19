# 1144 Manual Telegram Polling Controller Check

## Checked seam

- `controlTelegramPollingController.ts` now owns:
  - the inbound poll loop
  - `getUpdates` offset/timeout orchestration
  - per-update error isolation
  - callback-driven `next_update_id` advancement
- `telegramOversightBridge.ts` still owns:
  - bridge-local whole-state authority
  - persisted-state writes via `persistNextUpdateId(...)`
  - bot identity startup
  - notification queue / projection push behavior
  - controller and API-client composition

## Evidence

- Focused controller tests: `05-targeted-tests.log`
- Bridge integration coverage: `orchestrator/tests/TelegramOversightBridge.test.ts`
- Delegated seam check: Fermat reported no bounded correctness finding and explicitly recommended keeping controller logic dependency-injected and state-write-through rather than state-owning.

## Verdict

The shipped extraction matches the `1144` scope: polling orchestration moved, but state authority did not.
