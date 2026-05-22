# PRD: Coordinator Symphony-Aligned Orchestrator Cloud Execution Lifecycle Shell Extraction

## Summary

After `1190` moved the run-lifecycle orchestration envelope out of `orchestrator.ts`, the next truthful seam is the remaining private cloud execution lifecycle shell around `executeCloudPipeline(...)` and `runCloudExecutionLifecycleShell(...)`.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns a bounded cloud execution orchestration shell:

- `executeCloudPipeline(...)`
- `runCloudExecutionLifecycleShell(...)`
- `runOrchestratorExecutionLifecycle(...)` wiring
- `executeOrchestratorCloudTarget(...)` execute-body assembly
- passthrough of `runAutoScout`, event-stream wiring, and lifecycle note assembly

This is now one of the last obvious orchestration bodies still embedded in the class-private surface.

## Goal

Extract the cloud execution lifecycle shell from `orchestrator.ts` into a bounded service helper while preserving the same behavior and keeping broader routing/public lifecycle ownership intact.

## Non-Goals

- changing route-decision or execution-mode policy behavior
- changing public `start()` / `resume()` behavior
- changing local execution lifecycle behavior
- changing cloud target executor behavior itself
- changing note ordering, failure-detail strings, or scout passthrough semantics

## Success Criteria

- `executeCloudPipeline(...)` becomes a thin delegate over the extracted cloud execution lifecycle shell
- `runAutoScout`, `advancedDecisionEnv`, note ordering, failure detail, and event/persister passthrough remain unchanged
- focused regressions preserve cloud lifecycle orchestration behavior at the new boundary
