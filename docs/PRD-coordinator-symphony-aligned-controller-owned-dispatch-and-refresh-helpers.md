# PRD - Coordinator Symphony-Aligned Controller-Owned Dispatch + Refresh Helpers

## Summary

After `1028`, `ControlRuntime` still owns route-shaped compatibility dispatch and refresh behavior. This slice moves the remaining dispatch/refresh HTTP semantics into controller/presenter helpers, keeps runtime responsible for cached selected-run facts plus refresh invalidation, and reuses the same dispatch helper for Telegram oversight so HTTP and bot surfaces stay aligned.

## Problem

- `ControlRuntime` still exposes `readCompatibilityDispatch()` and body-aware refresh behavior that belong to the controller layer.
- Telegram oversight still reads dispatch through a runtime-owned compatibility presenter path instead of a shared controller-owned helper.
- The remaining ownership mismatch makes the async live Linear dispatch path harder to evolve in the server/controller layer.

## Goals

- Expose a runtime-neutral dispatch evaluation seam instead of a route-shaped dispatch payload seam.
- Move compatibility dispatch and refresh payload/envelope handling into controller-owned helpers.
- Reuse the controller-owned dispatch helper for Telegram oversight read parity.
- Preserve current HTTP and Telegram payload shapes.

## Non-Goals

- No auth, authority, transport-control, or route-surface changes.
- No live Linear policy changes or new provider behavior.
- No UI/state/issue presenter behavior changes already completed in `1028`.
- No broad refactor outside dispatch/refresh ownership.

## Success Criteria

- `ControlRuntime` no longer exposes route-shaped compatibility dispatch or refresh presenter methods.
- `/api/v1/dispatch`, `/api/v1/refresh`, and Telegram oversight dispatch reads use controller-owned helpers.
- Existing dispatch/refresh payloads remain backward-compatible.
- Runtime tests narrow further to cache/evaluation/invalidation behavior; route semantics stay in server coverage.
