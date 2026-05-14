# ACTION_PLAN - Coordinator Symphony-Aligned Control Server Shutdown Shell Extraction

## Objective

Extract the remaining inline `ControlServer.close()` shutdown shell into one bounded helper while preserving teardown order and public close semantics.

## Steps

1. Inspect the current `ControlServer.close()` body and the most relevant shutdown-related tests.
2. Choose the smallest truthful helper shape, preferring a same-file/private helper unless a tiny local module is materially clearer.
3. Implement the bounded shutdown extraction without reopening startup or routing surfaces.
4. Add or adjust focused regressions for teardown order and field reset behavior.
5. Run the lane validation bundle, record elegance review, and sync task/docs mirrors.

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
