# PRD: Coordinator Symphony-Aligned Orchestrator Execution Route State Assembly Extraction

## Summary

After `1179` closed the mirrored local execution lifecycle shell in `orchestratorExecutionRouter.ts`, the next truthful seam is the shared route-state assembly still owned inline by `resolveExecutionRouteState(...)`.

## Problem

`orchestrator/src/cli/services/orchestratorExecutionRouter.ts` still owns one shared pre-branch cluster that merges caller env overrides, invokes `resolveRuntimeSelection(...)`, applies the resolved runtime selection to the manifest, and returns the effective env objects consumed by both the cloud and local route helpers. That keeps shared route-state assembly embedded in the router even after the cloud and local lifecycle shells have been segmented.

## Goal

Extract one bounded shared route-state assembly helper so the router keeps branch selection ownership while delegating env merge, runtime selection resolution, manifest application, and effective env assembly.

## Non-Goals

- changing cloud preflight request or fallback handling
- changing cloud or local lifecycle shell behavior
- changing `resolveRuntimeSelection(...)` behavior or runtime provider internals
- changing local or cloud executor internals
- broad router refactors outside the shared route-state assembly seam

## Success Criteria

- one bounded helper owns base env override merge, runtime selection resolution, manifest application, and effective env assembly
- `routeOrchestratorExecution(...)` keeps shared failure handling and cloud/local branch ownership while delegating route-state assembly directly
- focused regressions pin runtime selection invocation, manifest application, and env-precedence behavior without reopening lifecycle or fallback-policy seams
