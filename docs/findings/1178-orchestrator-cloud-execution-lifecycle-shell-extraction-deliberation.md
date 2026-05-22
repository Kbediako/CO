# Findings: 1178 Orchestrator Cloud Execution Lifecycle Shell Extraction Deliberation

## Decision

- Proceed with a bounded `1178` lane for the remaining cloud execution lifecycle shell around `executeCloudPipeline()` in `orchestrator.ts`.

## Why This Slice

- `1177` closed the last inline cloud-target executor preflight seam, so the next dense cloud-only surface is now the outer lifecycle wrapper in `executeCloudPipeline()`.
- The remaining inline block is cohesive: it calls `runOrchestratorExecutionLifecycle(...)`, delegates the body to `executeOrchestratorCloudTarget(...)`, and folds returned notes into the lifecycle result.
- This is smaller and more truthful than reopening executor internals or fallback policy work.

## In Scope

- the wrapper around `runOrchestratorExecutionLifecycle(...)` inside `executeCloudPipeline()`
- the `executeBody` callback that calls `executeOrchestratorCloudTarget(...)`
- note propagation and returned success shaping for the cloud lifecycle shell

## Out of Scope

- `runOrchestratorExecutionLifecycle(...)` behavior changes
- cloud-target executor internals already segmented by `1173` through `1177`
- router fallback policy in `orchestratorExecutionRouter.ts`
- local execution lifecycle extraction

## Review Posture

- Local read-only review approves this as the next truthful seam after `1177`.
- The lane stays aligned with the no-fallback-bias direction by extracting the orchestration shell directly rather than widening fallback or compatibility logic.
