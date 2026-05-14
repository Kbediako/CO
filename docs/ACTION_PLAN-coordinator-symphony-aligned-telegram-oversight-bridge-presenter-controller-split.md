# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Oversight Bridge Presenter/Controller Split

## Objective

Extract the read-side Telegram presenter/controller surface out of `telegramOversightBridge.ts` while preserving polling transport, persistent state, and mutation-authority behavior.

## Steps

1. Inspect the current Telegram bridge runtime and the focused Telegram bridge tests.
2. Choose the smallest truthful seam that moves read-side command rendering and projection push shaping out of the runtime.
3. Keep pause/resume mutation authority, API calls, and persistence in the bridge runtime.
4. Add or adjust focused Telegram regressions for integrated render and push behavior.
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
