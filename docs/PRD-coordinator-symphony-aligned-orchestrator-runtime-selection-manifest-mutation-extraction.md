# PRD: Coordinator Symphony-Aligned Orchestrator Runtime Selection Manifest Mutation Extraction

## Summary

After `1197` extracted the `plan()` preview shell, the next truthful seam is the shared manifest-mutation pair that still lives in `orchestrator.ts` and is injected into multiple extracted helpers.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns two cohesive shared mutation helpers:

- `applyRequestedRuntimeMode(...)`
- `applyRuntimeSelection(...)`

Those helpers are not public command-local shells anymore; they are reusable state-mutation behavior passed into extracted services:

- `orchestrator/src/cli/services/orchestratorStartPreparationShell.ts`
- `orchestrator/src/cli/services/orchestratorResumePreparationShell.ts`
- `orchestrator/src/cli/services/orchestratorExecutionRouteState.ts`

That leaves the orchestrator entrypoint holding a shared state-contract detail after the surrounding command shells have already been extracted.

## Goal

Extract the shared runtime-selection manifest mutation behavior into one bounded helper while preserving exact manifest mutation semantics and keeping broader runtime-resolution behavior intact.

## Non-Goals

- changing runtime mode or runtime selection resolution logic
- changing `start()`, `resume()`, `status()`, or `plan()` behavior
- changing route-adapter or run-lifecycle orchestration
- changing `validateResumeToken(...)`
- changing manifest field semantics beyond bounded refactor equivalence

## Success Criteria

- one bounded helper owns the shared runtime-manifest mutation behavior
- `orchestrator.ts` no longer directly owns `applyRequestedRuntimeMode(...)` or `applyRuntimeSelection(...)`
- focused regressions preserve requested-mode mutation, selected-mode mutation, provider assignment, and runtime-fallback assignment
