# 1127 Closeout Summary

- Status: completed
- Scope: extract the remaining Telegram `/control/action` transport seam from `telegramOversightBridge.ts` into one dedicated helper without moving command routing, nonce/actor shaping, or mutation authority out of the bridge shell.

## What shipped

- Added `orchestrator/src/cli/control/telegramOversightControlActionApiClient.ts` for:
  - control auth header construction,
  - `POST /control/action`,
  - preserved non-2xx error translation,
  - preserved response parsing for `200` payloads consumed by Telegram reply formatting.
- Updated `orchestrator/src/cli/control/telegramOversightBridge.ts` to:
  - delegate control transport through the new helper,
  - keep `/pause|/resume` command selection, mutation gating, nonce construction, actor/transport shaping, and Telegram reply text in the bridge runtime.
- Updated `orchestrator/tests/TelegramOversightBridge.test.ts` with focused extracted-seam coverage for:
  - outbound auth headers and body,
  - preserved `200` payload-error behavior,
  - preserved non-2xx and transport throw behavior,
  - unchanged integrated `/pause` and `/resume` mutation flow.

## Validation

- Delegation guard, spec guard, build, lint, docs checks, docs freshness, bounded review, and pack-smoke all passed on the final tree.
- Focused final-tree Telegram regressions passed: `1` file, `13` tests.
- Full suite passed on the final tree: `194` files, `1399` tests.
- Manual/mock control transport evidence was captured in `12-manual-telegram-control-action-client-check.json`.
- The bounded review eventually converged to a no-findings verdict, although it still spent time inspecting adjacent context before landing.

## Overrides

- `node scripts/diff-budget.mjs` used the explicit stacked-branch override required by the long-lived Symphony-alignment branch baseline.
