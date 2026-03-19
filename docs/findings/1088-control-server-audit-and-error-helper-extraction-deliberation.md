# 1088 Deliberation - Control Server Audit and Error Helper Extraction

## Why This Slice

- After `1087`, the startup/runtime duplication is removed and `ControlServer.start()` is relatively thin.
- The largest remaining non-minimal `controlServer.ts` surface is the local audit/error helper cluster, not startup orchestration.
- That cluster is cohesive and bounded: it shapes event payloads plus shared JSON control errors without owning route branching itself.

## Boundaries

- In scope:
  - extracting audit-payload and control-error helpers from `controlServer.ts`
  - rewiring `handleRequest(...)` to call the extracted helper(s)
  - focused audit/error regression updates
- Out of scope:
  - startup/runtime bundle work from `1087`
  - route/controller behavior changes
  - Telegram bridge changes

## Risks

- Event payload fields could drift if extraction is not byte-for-byte equivalent.
- The shared JSON control-error writer is injected into authenticated routes, so callback wiring must remain unchanged.
- Route-controller and webhook-controller tests must still cover the helper through the existing surfaces.

## Decision

- Proceed with one bounded helper-extraction lane.
- Prefer a single helper module over multiple tiny files so the seam stays reviewable and does not create unnecessary abstraction.
