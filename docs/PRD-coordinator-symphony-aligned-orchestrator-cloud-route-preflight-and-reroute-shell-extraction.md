# PRD: Coordinator Symphony-Aligned Orchestrator Cloud Route Preflight And Reroute Shell Extraction

## Summary

After `1180` extracted the shared route-state assembly out of `orchestratorExecutionRouter.ts`, the next truthful seam is the remaining cloud-route shell in `executeCloudRoute(...)`.

## Problem

`orchestrator/src/cli/services/orchestratorExecutionRouter.ts` still inlines the cloud-route shell that invokes `runCloudPreflight(...)`, applies fail-fast handling when fallback is disabled, records `manifest.cloud_fallback` plus summary state when fallback is allowed, recursively reroutes to `mcp`, and delegates successful cloud runs into `executeCloudPipeline(...)`. That keeps one cloud-only orchestration shell embedded in the router even after the shared route-state assembly and local lifecycle shell have been segmented.

## Goal

Extract one bounded cloud-route shell so the router keeps top-level failure handling and branch ownership while delegating cloud preflight, fallback reroute, and successful cloud dispatch through a thinner cloud-route boundary.

## Non-Goals

- changing shared route-state assembly
- changing cloud preflight request or failure-contract helpers
- changing cloud fallback policy semantics
- changing cloud/local lifecycle shells or executor internals
- broad router refactors outside the cloud-route shell

## Success Criteria

- one bounded helper owns the `executeCloudRoute(...)` shell around cloud preflight, fail-fast handling, fallback reroute, and successful cloud delegation
- `routeOrchestratorExecution(...)` remains the router-local failure and branch boundary
- focused regressions pin fail-fast behavior, fallback reroute env propagation, and successful cloud dispatch without reopening shared route-state or lifecycle seams
