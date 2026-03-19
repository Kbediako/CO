# TECH_SPEC - Coordinator Symphony-Aligned Control Server Seeded Runtime Bundle Boundary Tightening

## Overview

`1087` tightens the runtime contract between `ControlServer.start()` and `createControlServerSeededRuntimeAssembly(...)`. The seeded-runtime helper should return one shared runtime bundle anchored by `requestContextShared`, and `ControlServer` should keep only the startup-level fields it directly uses instead of mirroring stores/runtime pieces that already live inside that shared context. The linear advisory state filename constant should also move out of the assembly module so both the seed loader and the seeded-runtime assembly depend on one neutral owner.

## Current Behavior

- `createControlServerSeededRuntimeAssembly(...)` returns:
  - individual stores (`controlStore`, `confirmationStore`, `questionQueue`, `delegationTokens`),
  - session/runtime helpers (`sessionTokens`, `persist`, `controlRuntime`),
  - transport state (`clients`, `eventTransport`),
  - advisory state (`linearAdvisoryState`),
  - plus `requestContextShared`, which already groups those same values.
- `ControlServer` stores those individual pieces even though later server behavior primarily uses:
  - `requestContextShared`,
  - `eventTransport`,
  - `clients`.
- `controlServerSeedLoading.ts` imports `LINEAR_ADVISORY_STATE_FILE` from `controlServerSeededRuntimeAssembly.ts`.

## Proposed Changes

1. Introduce a neutral control-surface constant owner
- Add one small control-local module for the advisory persistence filename constant.
- Update both:
  - `controlServerSeedLoading.ts`
  - `controlServerSeededRuntimeAssembly.ts`
  to import the constant from that neutral owner.

2. Tighten the seeded runtime assembly contract
- Change `createControlServerSeededRuntimeAssembly(...)` to return a smaller runtime bundle centered on `requestContextShared`.
- Avoid duplicating stores/runtime helpers separately in the return contract when they are already reachable via `requestContextShared`.

3. Shrink `ControlServer` constructor/runtime surface
- Update `ControlServer` to store only the startup/runtime values it directly consumes after construction.
- Prefer `requestContextShared.eventTransport` / `requestContextShared.clients` over duplicated top-level fields where possible.

4. Update focused tests
- Tighten the seeded-runtime assembly tests so they verify identity and persistence behavior through the new shared bundle contract rather than locking in the duplicated surface.
- Add any small server-level regression needed if constructor/runtime contraction affects the startup shell.

## Constraints

- No behavior changes to control actions, controllers, SSE, or runtime persistence.
- No request-shell, bootstrap, or startup-sequence behavior changes beyond consuming the tightened bundle contract.
- Keep the change bounded to the seeded-runtime/startup boundary.

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
- Focused seeded-runtime/ControlServer regressions
