# PRD: Coordinator Symphony-Aligned Orchestrator Plan Shell Extraction

## Summary

After `1196` extracted the `status()` command shell, the next truthful seam is the remaining `plan()` preview shell in `orchestrator.ts`.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns a cohesive plan-preview cluster:

- `prepareRun(...)` invocation for preview mode
- `planPreview` vs `planner.plan(...)` resolution
- command-vs-subpipeline stage shaping for the public return contract
- pipeline source normalization for the preview payload

That keeps the public orchestrator entrypoint responsible for one remaining non-trivial command-local preview shell even though adjacent public command paths are already bounded.

## Goal

Extract the `plan()` preview shell into one bounded helper while preserving preview behavior and keeping broader public orchestrator ownership intact.

## Non-Goals

- changing `start()`, `resume()`, or `status()`
- changing runtime-mode selection, route adapters, or execution routing
- changing run-lifecycle or control-plane orchestration
- changing plan payload semantics beyond bounded refactor equivalence

## Success Criteria

- one bounded helper owns the `plan()` preview shell and its stage/pipeline payload shaping
- `orchestrator.ts` no longer directly owns the inline `plan()` cluster
- focused regressions preserve stage mapping, pipeline source normalization, preview fallback behavior, and the public return contract
