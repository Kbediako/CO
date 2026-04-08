# PRD - Coordinator Symphony-Aligned Control Server Bootstrap and Telegram Bridge Lifecycle Extraction

## Summary

After `1069`, the next highest-value Symphony-aligned seam in `controlServer.ts` is the remaining post-bind startup/teardown ownership cluster: control auth/endpoint file writes, initial control-state persistence, and Telegram bridge lifecycle wiring.

This slice extracts that control-local post-bind bootstrap/lifecycle ownership into a named module so `controlServer.ts` keeps the raw HTTP shell, bind/listen handling, and route dispatch explicit while the remaining process-lifecycle behavior becomes smaller and more testable.

## Problem

- `controlServer.ts` still directly owns:
  - control auth and endpoint file writes,
  - initial `controlPath` snapshot persistence after bootstrap,
  - Telegram bridge start/stop,
  - runtime subscription wiring for Telegram projection updates,
  - related startup failure cleanup and normal teardown.
- The route/controller surface is now thinner, but this startup/teardown cluster still mixes process lifecycle concerns with the main server shell.
- That keeps the remaining server entrypoint broader than the Symphony-like process-owner shape we are targeting.

## Goal

Extract the bounded post-bind bootstrap and Telegram bridge lifecycle cluster from `controlServer.ts` into a dedicated control-local owner while preserving startup ordering, cleanup semantics, and bridge/runtime behavior.

## Non-Goals

- No route/controller rewiring.
- No changes to expiry lifecycle ownership from `1069`.
- No Telegram provider contract change.
- No broader service container or runtime manager.
- No Linear or dispatch-pilot changes.

## Requirements

- Introduce a dedicated control-local bootstrap/lifecycle module under `orchestrator/src/cli/control/`.
- Move the post-bind auth/endpoint bootstrap, initial control-state persistence, and Telegram bridge lifecycle orchestration out of `controlServer.ts`.
- Preserve:
  - raw bind/listen ownership and base URL computation in `controlServer.ts`,
  - control auth and endpoint file contents/permissions,
  - initial `controlPath` snapshot persistence,
  - Telegram bridge startup ordering,
  - runtime subscription behavior,
  - best-effort warn-and-continue behavior when Telegram bridge startup fails,
  - cleanup semantics on startup failure and normal close.
- Keep the lifecycle seam narrow and explicit rather than introducing a generic container abstraction.
- Add focused regressions for the extracted startup/bridge seam.

## Constraints

- Keep the slice bounded to post-bind bootstrap and Telegram bridge ownership.
- Keep `controlServer.ts` on raw server creation, bind/listen error handling, request handling, authenticated dispatch handoff, and SSE client ownership.
- Do not widen into route/controller behavior or review-wrapper work.

## Acceptance Criteria

1. `controlServer.ts` no longer directly owns the post-bind auth/endpoint bootstrap, initial control-state persistence, and Telegram bridge lifecycle bodies.
2. The extracted owner preserves startup ordering and cleanup behavior.
3. Telegram projection subscription/start-stop behavior remains unchanged, including warn-and-continue startup failure handling.
4. Focused tests cover the extracted seam and adjacent regressions remain green.
5. Standard docs-first evidence is in place before implementation begins.
