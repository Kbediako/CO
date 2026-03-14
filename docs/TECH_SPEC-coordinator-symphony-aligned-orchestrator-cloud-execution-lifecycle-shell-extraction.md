# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud Execution Lifecycle Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1178-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction`
- Status: Draft

## Background

`1156` extracted the shared execution lifecycle into `orchestratorExecutionLifecycle.ts`, and `1157` through `1177` progressively segmented the cloud-target executor internals into bounded helpers inside `orchestratorCloudTargetExecutor.ts`. The remaining cloud-only orchestration shell is now the inline `executeCloudPipeline()` wrapper in `orchestrator.ts`.

## Scope

- extract the cloud-only lifecycle wrapper around `runOrchestratorExecutionLifecycle(...)`
- move the `executeBody` callback that invokes `executeOrchestratorCloudTarget(...)` into the same bounded helper
- preserve manifest/event persistence inputs, note propagation, and returned success semantics
- add focused regression coverage for the extracted lifecycle shell

## Out of Scope

- `runOrchestratorExecutionLifecycle(...)` contract or schema changes
- `executeOrchestratorCloudTarget(...)` internal behavior changes
- local execution lifecycle extraction
- routing fallback or runtime-selection policy changes
- broader `orchestrator.ts` class refactors beyond the cloud execution shell

## Proposed Approach

1. Introduce one bounded helper adjacent to `executeCloudPipeline()` inside `orchestrator.ts` or an adjacent service if that yields a cleaner same-contract boundary.
2. Move into that helper:
   - the `runOrchestratorExecutionLifecycle(...)` invocation for cloud execution
   - the cloud-only `executeBody` callback that delegates to `executeOrchestratorCloudTarget(...)`
   - note propagation from `cloudResult.notes`
3. Keep in `executeCloudPipeline()`:
   - option destructuring if still needed for readability
   - public method ownership of the cloud pipeline boundary
   - delegation into the extracted helper
4. Keep unchanged:
   - router entry via `routeOrchestratorExecution(...)`
   - `runOrchestratorExecutionLifecycle(...)`
   - all already-extracted helper seams in `orchestratorCloudTargetExecutor.ts`

## Validation

- focused regressions covering cloud lifecycle-shell delegation and note propagation
- standard gate bundle before closeout
- explicit elegance review

## Risks

- pulling the seam too low would just rename the existing inline block without making `executeCloudPipeline()` thinner
- pulling the seam too high would start reabsorbing router policy or broader orchestrator lifecycle ownership
