# ACTION_PLAN: Coordinator Symphony-Aligned Start CLI Request Shell Extraction

## Steps

1. Extract the remaining `start` request-shaping logic from `handleStart(...)` into a dedicated CLI helper.
2. Add focused unit coverage for the new helper and keep existing `start` command-surface parity green.
3. Run the required validation bundle, close the slice honestly, and register the next truthful follow-on lane.

## Validation

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- targeted tests
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
