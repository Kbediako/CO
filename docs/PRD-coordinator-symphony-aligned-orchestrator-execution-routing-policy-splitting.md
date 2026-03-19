# PRD: Coordinator Symphony-Aligned Orchestrator Execution-Routing Policy Splitting

## Summary

After `1168` closed the shared `start()` / `resume()` control-plane launch seam, the next truthful bounded lane is inside `orchestratorExecutionRouter.ts`: split the remaining execution-routing policy cluster into smaller helpers without redoing the already-completed broad `1159` router extraction.

## Problem

`routeOrchestratorExecution(...)` still combines runtime-selection resolution, cloud preflight and fallback policy, recursive fallback rerouting, and local lifecycle dispatch in one function. That keeps a behavior-dense branch graph in a single surface and makes future runtime policy adjustments harder to review and test in isolation.

## Goal

Split the remaining routing-policy cluster in `orchestratorExecutionRouter.ts` into explicit bounded helpers while preserving the current public router API, cloud fallback behavior, and local/cloud execution outcomes.

## Non-Goals

- Repeating the old broad execution-routing extraction already completed in `1159`
- Changing runtime selection semantics
- Changing cloud preflight criteria or fallback policy outcomes
- Refactoring execution lifecycle internals or local/cloud executor bodies
- Refactoring `start()` / `resume()` or broader orchestrator lifecycle surfaces

## Success Criteria

- `routeOrchestratorExecution(...)` delegates to smaller routing-policy helpers
- cloud preflight hard-fail, fallback, and local-routing branches remain behaviorally unchanged
- `executePipeline()` stays a thin adapter boundary in `orchestrator.ts`
- focused router regressions remain green
