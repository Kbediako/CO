# PRD - Coordinator Symphony-Aligned Control Event Transport Extraction

## Summary

After `1070`, the next highest-value Symphony-aligned seam in `controlServer.ts` is the remaining control-event transport cluster: control-event append, SSE client fan-out, and runtime publish fan-out.

This slice extracts that event-transport ownership into a dedicated control-local module so `controlServer.ts` keeps raw HTTP admission, route dispatch, and request-context assembly explicit while event delivery becomes smaller and easier to test.

## Problem

- `controlServer.ts` still directly owns:
  - `emitControlEvent(...)`,
  - `broadcast(...)`,
  - SSE client fan-out and dead-client pruning,
  - runtime publish fan-out on emitted entries.
- That leaves the remaining server shell coupled to transport concerns even after the earlier controller, expiry, and post-bind lifecycle extractions.
- The transport behavior is cohesive enough to extract without reopening controller or provider work.

## Goal

Extract the bounded control-event transport seam from `controlServer.ts` into a dedicated module while preserving event append semantics, SSE delivery semantics, dead-client pruning, and runtime publish behavior.

## Non-Goals

- No request/controller rewiring.
- No request-context composition extraction yet.
- No Telegram provider contract change.
- No expiry lifecycle or bootstrap lifecycle changes.
- No broader event bus or generic runtime container abstraction.

## Requirements

- Introduce a dedicated control-local event transport module under `orchestrator/src/cli/control/`.
- Move `emitControlEvent(...)`, `broadcast(...)`, and the associated SSE/runtime fan-out logic out of `controlServer.ts`.
- Preserve:
  - event stream append behavior,
  - SSE payload shape,
  - dead-client pruning semantics,
  - runtime publish semantics,
  - existing call sites and route behavior.
- Keep the seam explicit and bounded rather than creating a generic event framework.
- Add focused regressions for the extracted event-transport behavior.

## Constraints

- Keep the slice bounded to control-event transport only.
- Keep `controlServer.ts` on raw HTTP admission, route dispatch, request-context assembly, and server close ownership.
- Do not widen into controller extraction, request-context extraction, or review-wrapper work.

## Acceptance Criteria

1. `controlServer.ts` no longer directly owns the control-event append/SSE/runtime fan-out bodies.
2. The extracted transport preserves existing event append and broadcast semantics.
3. Focused tests cover the extracted seam and adjacent regressions remain green.
4. Standard docs-first evidence is in place before implementation begins.
