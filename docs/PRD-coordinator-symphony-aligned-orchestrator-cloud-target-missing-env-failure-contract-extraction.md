# PRD: Coordinator Symphony-Aligned Orchestrator Cloud-Target Missing-Env Failure Contract Extraction

## Summary

After `1173` extracted the inline cloud-target execution request contract, the next truthful seam is the missing-environment hard-fail block still shaped inline in `orchestratorCloudTargetExecutor.ts`.

## Problem

`orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts` still inlines one dense failure-projection cluster immediately after `resolveCloudEnvironmentId(...)` returns no environment id. That block assembles `manifest.status_detail`, the failed `manifest.cloud_execution` payload, `notes`, and the matching `targetEntry` timestamps, exit code, status, and summary. It is a bounded contract surface, but today it remains mixed into the main execution shell beside stage-state transitions and executor handoff.

## Goal

Extract one bounded missing-environment failure contract so `executeOrchestratorCloudTarget(...)` keeps environment-id resolution and overall lifecycle ownership while the exact hard-fail projection moves into a narrow same-module helper.

## Non-Goals

- changing `resolveCloudEnvironmentId(...)` precedence or semantics
- changing target-stage resolution or sibling-stage skip behavior
- changing `CodexCloudTaskExecutor.execute(...)`, `onUpdate`, or post-execution success/failure shaping
- broad cloud-target lifecycle refactors beyond the missing-env contract

## Success Criteria

- one bounded helper owns the missing-environment hard-fail projection applied after environment-id resolution fails
- `executeOrchestratorCloudTarget(...)` still owns resolution, return-path control flow, and non-missing-env lifecycle behavior
- focused tests pin the missing-env contract without reopening executor internals or broader cloud fallback policy
