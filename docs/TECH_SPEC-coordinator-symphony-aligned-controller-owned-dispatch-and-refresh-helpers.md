# TECH_SPEC - Coordinator Symphony-Aligned Controller-Owned Dispatch + Refresh Helpers

## Design

1. Replace the remaining route-shaped runtime seam with transport-neutral primitives:
   - dispatch evaluation read
   - refresh/invalidate request
2. Promote controller-owned helpers in `observabilitySurface.ts` for:
   - compatibility dispatch payload construction
   - refresh envelope validation + accepted/rejected response shaping
3. Retarget `controlServer.ts` and the Telegram oversight read adapter to those helpers.

## Planned Changes

- `orchestrator/src/cli/control/controlRuntime.ts`
  - remove `readCompatibilityDispatch()` / `readCompatibilityRefresh(body)` from the public runtime snapshot
  - expose a transport-neutral dispatch-evaluation seam
  - shrink `requestRefresh(body)` to a bare refresh/invalidate primitive
- `orchestrator/src/cli/control/observabilitySurface.ts`
  - export controller-owned dispatch helper
  - export controller-owned refresh helper
  - keep payload shapes stable
- `orchestrator/src/cli/control/controlServer.ts`
  - use controller-owned dispatch/refresh helpers for HTTP
  - use the same dispatch helper for Telegram oversight reads
- Tests
  - move refresh-envelope/runtime-shape assertions fully into `ControlServer.test.ts`
  - keep `ControlRuntime.test.ts` focused on cache/evaluation/invalidation behavior

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
