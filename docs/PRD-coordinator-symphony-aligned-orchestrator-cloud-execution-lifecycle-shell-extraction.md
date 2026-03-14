# PRD: Coordinator Symphony-Aligned Orchestrator Cloud Execution Lifecycle Shell Extraction

## Summary

After `1177` closed the remaining cloud-target preflight shell inside `orchestratorCloudTargetExecutor.ts`, the next truthful seam is the cloud-only lifecycle wrapper still shaped inline in `executeCloudPipeline()` in `orchestrator.ts`.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns the cloud execution wrapper around `runOrchestratorExecutionLifecycle(...)`, including the `executeBody` callback that delegates to `executeOrchestratorCloudTarget(...)`, pushes returned notes, and shapes the success/failure return path. That keeps one cloud-specific lifecycle shell inline at the top-level orchestrator boundary even though the inner cloud-target executor phases are already segmented.

## Goal

Extract one bounded cloud execution lifecycle helper so `executeCloudPipeline()` becomes a thin delegator while preserving the current lifecycle contract, note propagation, and success/failure behavior.

## Non-Goals

- changing `runOrchestratorExecutionLifecycle(...)`
- changing router fallback or execution-mode policy in `orchestratorExecutionRouter.ts`
- changing `executeOrchestratorCloudTarget(...)` internals, including request shaping, missing-env handling, running-state updates, completion application, or preflight resolution
- reopening local execution routing or shared `executePipeline()` behavior
- broad orchestrator lifecycle refactors

## Success Criteria

- one bounded helper owns the cloud-only `runOrchestratorExecutionLifecycle(...)` wrapper and the `executeBody` note/success wiring
- `executeCloudPipeline()` remains the public orchestrator boundary but delegates the lifecycle shell directly
- focused regressions pin note propagation and success/failure shaping without reopening router policy or cloud-target executor internals
