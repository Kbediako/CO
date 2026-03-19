# PRD - Coordinator Symphony-Aligned Control Request Context Assembly Extraction

## Summary

After `1071`, the next highest-value Symphony-aligned seam in `controlServer.ts` is the remaining request-context assembly cluster: `buildContext(...)`, `buildInternalContext(...)`, and the nearby per-request composition that keeps threading the same stores, tokens, paths, and runtime handles into helper flows.

This slice extracts that bounded context-builder ownership into a dedicated control-local module so `controlServer.ts` keeps raw HTTP admission, route dispatch, SSE client registration, and server close ownership explicit while request-context composition becomes smaller and easier to reason about.

## Problem

- `controlServer.ts` still directly owns:
  - `buildContext(...)`,
  - `buildInternalContext(...)`,
  - nearby presenter/runtime snapshot composition in request handling and Telegram oversight reads.
- That leaves the remaining server shell coupled to context assembly even after controller, lifecycle, and event-transport extraction.
- The context-builder behavior is cohesive enough to extract without reopening controller or provider work.

## Goal

Extract the bounded request-context assembly seam from `controlServer.ts` into a dedicated module while preserving request/helper call patterns, internal-context behavior, and presenter/runtime snapshot composition behavior.

## Non-Goals

- No route/controller rewiring.
- No new event transport behavior.
- No SSE admission/bootstrap extraction.
- No Telegram provider contract change.
- No generic dependency injection or service container layer.

## Requirements

- Introduce a dedicated control-local request-context builder under `orchestrator/src/cli/control/`.
- Move `buildContext(...)`, `buildInternalContext(...)`, and the nearby shared composition logic out of `controlServer.ts`.
- Preserve:
  - current request-context fields,
  - internal-context behavior for non-HTTP helpers,
  - presenter/runtime snapshot behavior,
  - existing route/helper call patterns.
- Keep the seam explicit and bounded rather than introducing a generic container abstraction.
- Add focused regressions for the extracted request-context builder behavior.

## Constraints

- Keep the slice bounded to request-context assembly only.
- Keep `controlServer.ts` on raw HTTP admission, route dispatch, SSE client registration, and server close ownership.
- Do not widen into controller extraction, watcher extraction, or review-wrapper work.

## Acceptance Criteria

1. `controlServer.ts` no longer directly owns the request-context assembly bodies.
2. The extracted builder preserves current request/helper call patterns and internal-context behavior.
3. Focused tests cover the extracted seam and adjacent regressions remain green.
4. Standard docs-first evidence is in place before implementation begins.
