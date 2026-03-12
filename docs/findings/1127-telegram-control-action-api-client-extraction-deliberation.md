# 1127 Deliberation - Telegram Control Action API Client Extraction

- Date: 2026-03-12
- Task: `1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction`

## Why this slice

- `1126` removed the Telegram Bot API transport cluster from `telegramOversightBridge.ts`.
- The remaining inline external protocol dependency in the bridge is the `/control/action` write client used by `/pause` and `/resume`.
- Extracting that transport next preserves the current seam progression:
  - presenter/controller,
  - push-state,
  - Telegram Bot API transport,
  - control transport.

## In Scope

- The direct control POST transport boundary currently used by `/pause` and `/resume`.
- Control auth header construction.
- Control-response parsing and control transport error translation.

## Out of Scope

- Polling lifecycle, update routing, or push-state policy.
- Telegram Bot API transport already extracted in `1126`.
- Broader command/config refactors in `telegramOversightBridge.ts`.

## Recommendation

- Proceed with one bounded control-action client helper seam.
- Keep command routing, nonce/actor shaping, and mutation authority in the bridge shell.
