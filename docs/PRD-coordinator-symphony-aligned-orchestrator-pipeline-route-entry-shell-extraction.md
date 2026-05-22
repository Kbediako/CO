# PRD: Coordinator Symphony-Aligned Orchestrator Pipeline Route Entry Shell Extraction

## Summary

After `1191` removed the private cloud execution lifecycle shell, the next truthful seam is the remaining route-entry callback envelope still embedded in `executePipeline(...)`.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns a bounded callback-assembly shell at the point where pipeline execution enters the route adapter:

- `executePipeline(...)`
- `executeOrchestratorPipelineWithRouteAdapter(...)` route-entry wiring
- `applyRuntimeSelection(...)` callback binding
- cloud route callback binding to `runOrchestratorCloudExecutionLifecycleShell(...)`
- `runAutoScout(...)` passthrough
- `startSubpipeline(...)` bridging back into `start(...)`

That leaves the public orchestrator class holding the remaining route-entry orchestration even though the broader route-adapter shell, routing decision logic, and cloud/local execution shells have already been separated.

## Goal

Extract the remaining pipeline route-entry shell from `orchestrator.ts` into one bounded service helper while preserving callback contracts and keeping broader lifecycle ownership unchanged.

## Non-Goals

- changing `executeOrchestratorPipelineWithRouteAdapter(...)`
- changing routing decision or execution-mode policy behavior
- changing cloud or local execution lifecycle helper behavior
- changing public `start()` / `resume()` lifecycle ownership
- changing subpipeline handoff semantics or manifest parent/child linkage

## Success Criteria

- one bounded helper owns the route-entry callback assembly currently embedded in `executePipeline(...)`
- `orchestrator.ts` no longer owns the callback envelope around runtime-selection, cloud callback, auto-scout passthrough, and subpipeline bridge wiring
- focused regressions preserve callback passthrough, `taskId` / `parentRunId` propagation, and nearby route-adapter behavior
