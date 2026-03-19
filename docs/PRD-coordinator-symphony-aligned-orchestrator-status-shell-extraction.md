# PRD: Coordinator Symphony-Aligned Orchestrator Status Shell Extraction

## Summary

After `1195` extracted the `resume()` preparation shell, the next truthful seam is the remaining `status()` command shell and its local payload/render helpers in `orchestrator.ts`.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns a cohesive status command cluster:

- run manifest load for a `runId`
- runtime activity snapshot resolution
- JSON payload assembly through `buildStatusPayload(...)`
- human-readable rendering through `renderStatus(...)`

That keeps the public orchestrator entrypoint responsible for one remaining non-trivial read-only command shell even though the public lifecycle entrypoints are already bounded.

## Goal

Extract the status command shell into one bounded helper while preserving status behavior and keeping broader public orchestrator ownership intact.

## Non-Goals

- changing `start()` or `resume()`
- changing `plan()`
- changing runtime-mode selection or execution routing helpers
- changing control-plane or run-lifecycle orchestration
- changing status payload semantics or output wording beyond bounded refactor equivalence

## Success Criteria

- one bounded helper owns the `status()` command shell plus status payload/render helpers
- `orchestrator.ts` no longer directly owns the inline status cluster
- focused regressions preserve JSON payload shape, human-readable rendering, and manifest/activity lookup behavior
