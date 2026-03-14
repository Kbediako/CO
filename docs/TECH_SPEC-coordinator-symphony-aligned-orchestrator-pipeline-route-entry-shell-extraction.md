# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Pipeline Route Entry Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction`
- Status: Draft

## Background

`1186` extracted the broader route-adapter shell, and `1191` extracted the private cloud execution lifecycle shell. The remaining non-trivial private routing body in `orchestrator.ts` is now the `executePipeline(...)` route-entry callback envelope that binds route-adapter execution to runtime selection, cloud execution, auto-scout, and subpipeline restart behavior.

## Scope

- extract the remaining `executePipeline(...)` route-entry callback assembly from `orchestrator.ts` into one bounded helper under `orchestrator/src/cli/services/`
- move or delegate:
  - `executeOrchestratorPipelineWithRouteAdapter(...)` entry wiring
  - `applyRuntimeSelection(...)` callback binding
  - cloud-route callback binding to `runOrchestratorCloudExecutionLifecycleShell(...)`
  - `runAutoScout(...)` passthrough
  - `startSubpipeline(...)` bridging through `start(...)` with current `taskId`, `parentRunId`, and runtime/execution overrides
- preserve current callback contracts and route-adapter behavior exactly

## Out of Scope

- `executeOrchestratorPipelineWithRouteAdapter(...)` implementation changes
- route-decision or execution-mode policy changes
- cloud or local execution lifecycle helper logic changes
- public `start()` / `resume()` lifecycle changes
- broader orchestrator redesign

## Proposed Approach

1. Introduce one bounded route-entry shell helper under `orchestrator/src/cli/services/`.
2. Move the remaining `executePipeline(...)` callback envelope into that helper.
3. Keep `orchestrator.ts` as the broader lifecycle owner, with `executePipeline(...)` reduced to a thin delegate or removed if a direct helper wiring is cleaner after the elegance pass.
4. Preserve callback identity and passthrough behavior for runtime selection, cloud execution, auto-scout, and subpipeline restart.
5. Add or adapt focused tests around route-entry callback wiring and nearby route-adapter behavior.

## Validation

- standard docs-first guards before implementation
- focused route-entry and route-adapter regressions during implementation:
  - `orchestrator/tests/OrchestratorExecutionRouteAdapterShell.test.ts`
  - `orchestrator/tests/OrchestratorCloudAutoScout.test.ts`
  - `orchestrator/tests/OrchestratorSubpipelineFailure.test.ts`
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- changing `startSubpipeline(...)` propagation would create subtle parent/child linkage drift
- widening back into route-decision or cloud/local shell behavior would break the bounded seam
- removing the wrapper incorrectly could blur the boundary between public lifecycle ownership and route-entry callback assembly
