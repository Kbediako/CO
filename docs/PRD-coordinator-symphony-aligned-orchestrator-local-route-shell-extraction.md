# PRD: Coordinator Symphony-Aligned Orchestrator Local Route Shell Extraction

## Summary

After `1181` extracted the cloud-route shell out of `orchestratorExecutionRouter.ts`, the next truthful seam is the remaining local-route shell in `runLocalExecutionLifecycleShell(...)`.

## Problem

`orchestrator/src/cli/services/orchestratorExecutionRouter.ts` still inlines the local-route shell that appends runtime-fallback summary state before local lifecycle start, forwards effective env overrides into local auto-scout and local execution, dispatches `executeOrchestratorLocalPipeline(...)`, and appends guardrail recommendation summary after finalize. That leaves one route-local orchestration shell embedded in the router even after shared route-state assembly and the cloud-route shell have been extracted.

## Goal

Extract one bounded local-route shell so the router keeps top-level route-state failure handling and branch ownership while delegating the remaining local-route lifecycle wrapper through a thinner local-route boundary.

## Non-Goals

- changing route-state resolution
- changing the cloud-route shell extracted in `1181`
- changing execution-mode policy helpers
- changing the shared `failExecutionRoute(...)` contract
- changing lifecycle runner or local executor internals
- broad router refactors outside the bounded local-route shell

## Success Criteria

- one bounded helper owns the remaining `runLocalExecutionLifecycleShell(...)` wrapper around local lifecycle start
- `routeOrchestratorExecution(...)` remains the router-local branch and failure boundary
- focused regressions pin runtime-fallback summary behavior, auto-scout env propagation, local execution dispatch, and guardrail recommendation append without reopening route-state or cloud-route seams
