# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Local Execution Lifecycle Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction`
- Status: Draft

## Background

`1169` split router policy into explicit runtime-selection, cloud-route, local-route, and fail-fast helpers. `1178` then extracted the remaining cloud lifecycle wrapper out of `orchestrator.ts`. The next symmetric surface is the local lifecycle wrapper still inline in `executeLocalRoute()` in `orchestratorExecutionRouter.ts`.

## Scope

- extract the local `runOrchestratorExecutionLifecycle(...)` wrapper into one bounded helper
- move the router-local `beforeStart`, `runAutoScout`, `executeBody`, and `afterFinalize` shell into that helper
- preserve runtime fallback-summary shaping, local executor note propagation, and guardrail-summary append behavior
- add focused regression coverage for the extracted local lifecycle shell

## Out of Scope

- cloud preflight or fallback policy changes
- runtime-selection resolution changes
- `runOrchestratorExecutionLifecycle(...)` behavior or schema changes
- `executeOrchestratorLocalPipeline(...)` internal behavior changes
- broader router restructuring outside the local shell

## Proposed Approach

1. Introduce one bounded helper adjacent to `executeLocalRoute()` inside `orchestratorExecutionRouter.ts`.
2. Move into that helper:
   - the local `runOrchestratorExecutionLifecycle(...)` invocation
   - the `beforeStart` fallback-summary shaping
   - the `runAutoScout` pass-through with merged env overrides
   - the `executeBody` callback that delegates to `executeOrchestratorLocalPipeline(...)`
   - the `afterFinalize` guardrail-summary append
3. Keep in `executeLocalRoute()`:
   - route-local boundary ownership
   - delegation into the extracted helper
4. Keep unchanged:
   - `resolveExecutionRouteState(...)`
   - `executeCloudRoute(...)`
   - `runOrchestratorExecutionLifecycle(...)`
   - `executeOrchestratorLocalPipeline(...)`

## Validation

- focused regressions covering fallback-summary shaping, local note propagation, and guardrail-summary append
- standard gate bundle before closeout
- explicit elegance review

## Risks

- pulling the seam too low would reopen local executor internals that already belong in `executeOrchestratorLocalPipeline(...)`
- pulling the seam too high would widen the change back into runtime selection or cloud fallback policy
