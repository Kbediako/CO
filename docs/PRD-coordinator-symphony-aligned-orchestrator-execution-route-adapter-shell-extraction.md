# PRD: Coordinator Symphony-Aligned Orchestrator Execution Route Adapter Shell Extraction

## Summary

After `1185` moved execution-mode policy out of `orchestratorExecutionRouter.ts`, the next truthful remaining seam is the route-adapter shell still embedded in `orchestrator.ts`.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns the callback/adaptation layer that bridges run lifecycle orchestration into `routeOrchestratorExecution(...)`:

- `createTaskManager(...)`
- `executePipeline(...)`
- the route-adapter wiring passed into `createRunLifecycleTaskManager(...)`

That leaves the public orchestrator class holding a cohesive execution-routing shell even though the router, route-state, cloud/local shells, and execution-mode policy have already been separated into smaller helpers.

## Goal

Extract the route-adapter shell into one bounded helper so `CodexOrchestrator` keeps less routing-specific assembly logic while preserving the current router and execution-mode policy contracts.

## Non-Goals

- changing `performRunLifecycle(...)`
- changing resume/start lifecycle behavior
- changing `createOrchestratorRunLifecycleExecutionRegistration(...)`
- changing router policy helpers or cloud/local route shells
- changing manifest/status update behavior
- changing subpipeline handoff semantics

## Success Criteria

- one bounded helper owns the route-adapter shell currently embedded in `orchestrator.ts`
- `orchestratorExecutionRouter.ts` and `orchestratorExecutionModePolicy.ts` remain unchanged in this slice
- focused routing regressions preserve `modeOverride`, `runtimeModeRequested`, `envOverrides`, and subpipeline handoff behavior
