# PRD: Coordinator Symphony-Aligned Controller-Owned Compatibility + UI Presenters

## Problem
`1027` established `readSelectedRunSnapshot()` as the runtime seam, but `ControlRuntimeSnapshot` still owns selected-run compatibility/UI presenter wrappers for `/api/v1/state`, `/api/v1/:issue_identifier`, and `/ui/data.json`.

## Outcome
Move selected-run compatibility/UI payload shaping back into the presenter/controller layer so `ControlRuntime` owns runtime facts and refresh/dispatch primitives only.

## Scope
- Remove `readUiDataset()`, `readCompatibilityState()`, and `readCompatibilityIssue()` from `ControlRuntimeSnapshot`.
- Keep `readSelectedRunSnapshot()` as the selected-run runtime seam.
- Make `controlServer.ts` serve `/ui/data.json`, `/api/v1/state`, and `/api/v1/:issue_identifier` through presenter helpers over `readSelectedRunSnapshot()`.
- Preserve existing payloads and route behavior.

## Non-Goals
- No dispatch behavior changes.
- No refresh-policy or cache invalidation changes.
- No auth, authority, transport, or route-surface changes.
- No Telegram command text or projection-hash changes unless a zero-behavior helper move is unavoidable.

## Acceptance
- Runtime no longer exports the three selected-run presentation wrappers.
- Controller/presenter ownership for `/ui`, `/state`, and `/issue` is explicit.
- Existing selected-run parity tests remain green.

