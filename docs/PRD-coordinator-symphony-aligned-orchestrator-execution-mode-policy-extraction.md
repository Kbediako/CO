# PRD: Coordinator Symphony-Aligned Orchestrator Execution Mode Policy Extraction

## Summary

After `1184` extracted the route decision shell, the next truthful remaining seam is the execution-mode policy block still co-located in `orchestratorExecutionRouter.ts`.

## Problem

`orchestrator/src/cli/services/orchestratorExecutionRouter.ts` still owns two cohesive policy helpers:

- `requiresCloudOrchestratorExecution(...)`
- `determineOrchestratorExecutionMode(...)`

Those functions are no longer part of the route-decision shell itself, but they still keep router-local policy logic mixed into the public routing boundary.

## Goal

Extract the execution-mode policy block into one bounded helper so the router keeps only the stable public boundary and shared types while policy semantics remain unchanged.

## Non-Goals

- changing route decision shell behavior
- changing route-state assembly or runtime selection
- changing cloud or local route shell internals
- changing orchestrator call-site semantics
- changing execution-mode policy behavior

## Success Criteria

- one bounded helper owns `requiresCloudOrchestratorExecution(...)` and `determineOrchestratorExecutionMode(...)`
- `orchestratorExecutionRouter.ts` remains the thin public routing boundary and type-export surface
- focused regression coverage preserves unchanged execution-mode policy semantics
