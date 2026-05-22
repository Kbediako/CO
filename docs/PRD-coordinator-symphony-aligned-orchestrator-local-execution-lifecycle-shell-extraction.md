# PRD: Coordinator Symphony-Aligned Orchestrator Local Execution Lifecycle Shell Extraction

## Summary

After `1178` closed the remaining cloud execution lifecycle shell in `orchestrator.ts`, the next truthful seam is the mirrored local execution lifecycle wrapper still shaped inline in `executeLocalRoute()` inside `orchestratorExecutionRouter.ts`.

## Problem

`orchestrator/src/cli/services/orchestratorExecutionRouter.ts` still inlines the local `runOrchestratorExecutionLifecycle(...)` wrapper, including the fallback-summary `beforeStart`, auto-scout pass-through, `executeBody` callback that delegates to `executeOrchestratorLocalPipeline(...)`, and the `afterFinalize` guardrail-summary append. That keeps one dense local-only lifecycle shell embedded in the router even after the cloud side has been segmented.

## Goal

Extract one bounded local execution lifecycle helper so `executeLocalRoute()` becomes a thin delegator while preserving the current runtime-fallback summary behavior, local executor wiring, and post-finalize guardrail summary handling.

## Non-Goals

- changing runtime selection or cloud preflight behavior
- changing router fallback policy in `executeCloudRoute()`
- changing `runOrchestratorExecutionLifecycle(...)`
- changing `executeOrchestratorLocalPipeline(...)` internals
- broad router refactors outside the local execution lifecycle shell

## Success Criteria

- one bounded helper owns the local `runOrchestratorExecutionLifecycle(...)` wrapper, including `beforeStart`, `runAutoScout`, `executeBody`, and `afterFinalize`
- `executeLocalRoute()` remains the router-local boundary but delegates the lifecycle shell directly
- focused regressions pin fallback-summary shaping, local executor note propagation, and post-finalize guardrail summary handling without reopening runtime selection or local executor internals
