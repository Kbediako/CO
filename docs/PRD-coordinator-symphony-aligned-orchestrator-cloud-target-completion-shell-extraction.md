# PRD: Coordinator Symphony-Aligned Orchestrator Cloud-Target Completion Shell Extraction

## Summary

After `1175` extracted the running-state and `onUpdate` shell, the next truthful seam is the post-executor completion block still shaped inline in `orchestratorCloudTargetExecutor.ts`.

## Problem

`orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts` still inlines the final `cloudResult` application cluster that mirrors final cloud execution state, stamps completion metadata, sets success/failure outcome fields, appends failure detail, persists, and emits `stageCompleted`.

## Goal

Extract one bounded completion helper so `executeOrchestratorCloudTarget(...)` keeps overall lifecycle ownership while the final post-executor completion shell moves into a narrow same-module helper.

## Non-Goals

- changing target-stage resolution or sibling skip behavior
- changing missing-environment hard-fail behavior
- changing request-contract shaping before executor handoff
- changing the already-extracted running-state and `onUpdate` shell
- broad cloud-target lifecycle refactors
- unifying cloud completion with local pipeline completion logic

## Success Criteria

- one bounded helper owns the final `cloudResult` application plus `stageCompleted` shell
- `executeOrchestratorCloudTarget(...)` still owns resolution, missing-env handling, request shaping, executor invocation, and return-path control flow
- focused tests pin success/failure completion behavior without reopening the broader executor lifecycle
