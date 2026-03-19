# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Oversight Bridge Push-State Extraction

## Objective

Extract Telegram push-state persistence and cooldown bookkeeping out of `telegramOversightBridge.ts` while preserving transport, presenter/controller, and mutation-authority behavior.

## Steps

1. Inspect the remaining push-state and cooldown cluster in `telegramOversightBridge.ts`.
2. Choose the smallest truthful seam that owns persisted state defaults, pending/last-sent hash bookkeeping, and cooldown eligibility.
3. Keep polling transport, `sendMessage`, Bot API calls, and `/pause|/resume` authority in the bridge shell.
4. Add or adjust focused Telegram regressions for dedupe, pending-state persistence, and cooldown behavior.
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
