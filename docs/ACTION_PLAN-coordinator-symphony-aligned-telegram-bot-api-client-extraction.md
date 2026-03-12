# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Bot API Client Extraction

## Objective

Extract Telegram Bot API request/response handling out of `telegramOversightBridge.ts` while preserving sequencing, push-state transitions, and mutation-authority behavior.

## Steps

1. Inspect the remaining Telegram transport/client cluster in `telegramOversightBridge.ts`.
2. Choose the smallest truthful seam that owns Bot API URL construction plus `getMe`, `getUpdates`, and `sendMessage` request/response handling.
3. Keep poll-loop sequencing, update handling, push-state transitions, and `/pause|/resume` authority in the bridge shell.
4. Add or adjust focused Telegram regressions for query construction, send payloads, and Telegram error propagation.
5. Run the lane validation bundle, record standalone/elegance review results, and sync mirrors.

## Validation

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
