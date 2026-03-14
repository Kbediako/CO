# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud-Target Completion Shell Extraction

## Context

`1175` narrowed the cloud-target success path to a remaining final completion shell still shaped inline in `executeOrchestratorCloudTarget(...)`. The next bounded Symphony-aligned move is to extract only that post-executor result application cluster.

## Proposed Boundary

Introduce one same-module helper in `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts` that receives:

- `manifest`
- `targetStage`
- `targetEntry`
- `cloudResult`
- `schedulePersist(...)`
- optional `runEvents`

and owns only:

- final `manifest.cloud_execution` assignment
- `targetEntry.log_path`, `completed_at`, `exit_code`, `status`, and `summary`
- failure-only `manifest.status_detail` plus `appendSummary(...)`
- final forced `schedulePersist(...)`
- `runEvents?.stageCompleted(...)`

## In Scope

- bounded same-module completion-shell extraction
- preserving caller-owned control flow and executor invocation
- focused success/failure completion regressions

## Out of Scope

- target-stage resolution or sibling skip behavior
- missing-environment failure contract
- request construction and executor handoff
- the already-extracted `running` plus `onUpdate` shell
- cross-executor or cloud/local completion unification

## Validation

- focused `OrchestratorCloudTargetExecutor.test.ts`
- standard gate bundle
- bounded review/elegance pass
