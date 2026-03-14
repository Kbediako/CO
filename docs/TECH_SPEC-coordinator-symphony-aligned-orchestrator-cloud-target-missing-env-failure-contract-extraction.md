# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud-Target Missing-Env Failure Contract Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction`
- Status: Draft

## Background

`1157` extracted the cloud-target executor into `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`. `1173` then removed the adjacent inline request-contract assembly before `CodexCloudTaskExecutor.execute(...)`. The next dense contract surface is the missing-environment hard-fail branch that runs when `resolveCloudEnvironmentId(...)` returns nothing.

## Scope

- extract the missing-environment hard-fail projection into one bounded helper inside `orchestratorCloudTargetExecutor.ts`
- preserve caller-owned resolution and overall lifecycle behavior in `executeOrchestratorCloudTarget(...)`
- add focused coverage for the missing-env contract

## Out of Scope

- `resolveCloudEnvironmentId(...)` precedence or fallback changes
- target-stage resolution or sibling skip-marking changes
- executor handoff, `onUpdate`, or post-execution result application changes
- broader cloud-target lifecycle refactors

## Proposed Approach

1. Introduce one bounded same-module helper for the missing-environment hard-fail contract in `orchestratorCloudTargetExecutor.ts`.
2. Move into that helper only the projection currently assembled inline when no cloud environment id is available:
   - `manifest.status_detail`
   - failed `manifest.cloud_execution`
   - appended summary / notes detail
   - `targetEntry` status, timestamps, exit code, and summary
3. Keep `resolveCloudEnvironmentId(...)`, early-return control flow, and all non-missing-env behavior in `executeOrchestratorCloudTarget(...)`.
4. Extend focused tests around the missing-env branch without reopening request shaping, executor internals, or cloud fallback policy.

## Validation

- focused cloud-target executor regressions for the missing-env branch
- standard docs-first guard bundle
- bounded standalone review on the missing-env contract seam

## Risks

- if the helper absorbs resolution or return-path control flow, the slice widens past the truthful failure-contract seam
- if the helper only renames locals without centralizing the actual failure projection, the inline contract drift remains
