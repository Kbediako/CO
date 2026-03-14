# PRD: Coordinator Symphony-Aligned Orchestrator Cloud-Target Running-State And Update Shell Extraction

## Summary

After `1174` extracted the missing-environment hard-fail contract, the next truthful seam is the running-state and in-progress cloud update shell still shaped inline in `orchestratorCloudTargetExecutor.ts`.

## Problem

`orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts` still inlines the success-path cluster that transitions the target entry to `running`, persists that state, emits `stageStarted`, and wires executor `onUpdate` persistence for `manifest.cloud_execution` and `targetEntry.log_path`. That shell is adjacent to, but distinct from, final success/failure result application after executor completion.

## Goal

Extract one bounded running-state and update shell so `executeOrchestratorCloudTarget(...)` keeps overall lifecycle ownership while the pre-completion activation and `onUpdate` persistence cluster moves into a narrow same-module helper.

## Non-Goals

- changing target-stage resolution or sibling-stage skip behavior
- changing missing-environment hard-fail behavior
- changing request-contract shaping before executor handoff
- changing final success/failure result application after executor completion
- broad cloud-target lifecycle refactors

## Success Criteria

- one bounded helper owns the running-state transition plus `onUpdate` persistence shell
- `executeOrchestratorCloudTarget(...)` still owns final success/failure application and return-path control flow
- focused tests pin activation/update behavior without reopening the broader executor lifecycle
