# 1126 Closeout Summary

- Status: completed
- Scope: extract the Telegram Bot API transport surface from `telegramOversightBridge.ts` into a dedicated helper without moving poll-loop sequencing, update persistence, push-state policy, or `/pause|/resume` mutation authority.

## What shipped

- Added `orchestrator/src/cli/control/telegramOversightApiClient.ts` for:
  - Telegram Bot API URL construction,
  - `getMe` startup identity loading,
  - `getUpdates` query construction and envelope parsing,
  - `sendMessage` request shaping and Telegram error mapping.
- Updated `orchestrator/src/cli/control/telegramOversightBridge.ts` to:
  - delegate Bot API transport through the new helper,
  - keep startup ordering, abort ownership, polling/update sequencing, offset persistence, push delivery sequencing, and `/pause|/resume` authority in the bridge runtime,
  - remove leftover runtime fields once the helper extraction made them unnecessary.
- Added `orchestrator/tests/TelegramOversightApiClient.test.ts` for the extracted helper seam, including direct coverage for:
  - `getUpdates` query construction,
  - `sendMessage` payload shape,
  - `getMe` / `getUpdates` / `sendMessage` error propagation.

## Validation

- Deterministic guards passed through `pack:smoke`.
- Focused final-tree Telegram regressions passed: `2` files, `16` tests.
- Full suite passed on the final tree: `194` files, `1397` tests.
- Manual/mock helper runtime evidence captured in `11-manual-telegram-api-client-check.json`.
- Forced bounded review converged to a no-findings verdict on the final extraction.

## Overrides

- `node scripts/diff-budget.mjs` used the explicit stacked-branch override required by the long-lived Symphony-alignment branch baseline.
