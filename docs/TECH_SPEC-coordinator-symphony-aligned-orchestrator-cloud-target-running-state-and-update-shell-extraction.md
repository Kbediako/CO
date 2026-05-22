# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud-Target Running-State And Update Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction`
- Status: Draft

## Background

`1157` extracted the cloud-target executor into `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`. `1173` then removed the adjacent request-contract assembly, and `1174` extracted the missing-environment hard-fail projection. The next dense surface is the success-path activation and in-progress update shell that sits immediately before final executor result application.

## Scope

- extract the running-state transition and `onUpdate` persistence shell into one bounded helper inside `orchestratorCloudTargetExecutor.ts`
- preserve caller-owned final success/failure result application and overall lifecycle behavior
- add focused coverage for activation and update persistence

## Out of Scope

- target-stage resolution or sibling skip-marking changes
- missing-environment failure contract changes
- request-contract shaping changes
- final post-execution result application changes
- broader cloud-target lifecycle refactors

## Proposed Approach

1. Introduce one bounded same-module helper for the success-path running-state and update shell in `orchestratorCloudTargetExecutor.ts`.
2. Move into that helper only:
   - `targetEntry.status = 'running'`
   - `targetEntry.started_at`
   - `schedulePersist(...)`
   - `runEvents?.stageStarted(...)`
   - executor `onUpdate` wiring that persists `manifest.cloud_execution` and `targetEntry.log_path`
3. Keep executor request construction, missing-env handling, and final success/failure result application in `executeOrchestratorCloudTarget(...)`.
4. Extend focused tests around activation and update persistence without reopening broader executor internals.

## Validation

- focused cloud-target executor regressions for activation/update behavior
- standard docs-first guard bundle
- bounded standalone review on the activation/update shell seam

## Risks

- if the helper absorbs final success/failure application, the slice widens past the truthful shell boundary
- if the helper only renames locals without centralizing activation/update behavior, the inline shell drift remains
