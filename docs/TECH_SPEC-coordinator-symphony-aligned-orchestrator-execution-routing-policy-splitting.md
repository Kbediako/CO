# TECH SPEC: Coordinator Symphony-Aligned Orchestrator Execution-Routing Policy Splitting

## Context

`1159` already moved the broad execution-routing shell out of `orchestrator.ts` into `orchestratorExecutionRouter.ts`. The truthful remaining seam is not another top-level extraction; it is the internal policy split inside `routeOrchestratorExecution(...)`.

## Scope

- split `routeOrchestratorExecution(...)` into smaller router-local helpers
- keep `determineOrchestratorExecutionMode(...)` and `requiresCloudOrchestratorExecution(...)` behavior unchanged
- keep `orchestrator.ts` `executePipeline()` as a thin call-site adapter
- tighten focused router tests around hard-fail, fallback, and local-routing invariants

## Out of Scope

- changing the router module public API
- changing `runOrchestratorExecutionLifecycle(...)`
- changing `executeOrchestratorCloudTarget(...)` or `executeOrchestratorLocalPipeline(...)`
- broader runtime/provider policy changes

## Proposed Design

1. Introduce one router-local helper for runtime-selection plus effective env shaping.
2. Introduce one router-local helper for the cloud preflight/fallback branch.
3. Introduce one router-local helper for the local execution branch.
4. Keep `routeOrchestratorExecution(...)` as the public orchestrating shell that sequences those helpers.

## Validation

- focused `OrchestratorExecutionRouter` tests
- one orchestrator-level regression proving the `executePipeline()` adapter still delegates unchanged
- normal docs-first guard bundle
