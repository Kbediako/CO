# PRD: Coordinator Symphony-Aligned Orchestrator Cloud-Target Execution Request Contract Extraction

## Summary

After `1172` aligned the shared cloud-preflight request contract, the next truthful seam is the remaining inline request assembly immediately before `CodexCloudTaskExecutor.execute(...)` inside `orchestratorCloudTargetExecutor.ts`.

## Problem

`orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts` still mixes cloud-stage lifecycle ownership with the low-level shaping of the `CloudTaskExecutorInput` request. Prompt construction, retry/default parsing, feature toggles, branch resolution, `codexBin` selection, and non-interactive env shaping all live inline beside manifest persistence and `onUpdate` handling. That makes future cloud executor work harder to review and easier to widen accidentally.

## Goal

Extract one bounded cloud-target execution request contract so `executeOrchestratorCloudTarget(...)` keeps lifecycle and persistence ownership while request shaping moves into one narrow helper inside the same module.

## Non-Goals

- changing `CodexCloudTaskExecutor.execute(...)` semantics or CLI flags
- changing cloud fallback or preflight policy
- changing `resolveCloudEnvironmentId(...)` behavior
- changing `onUpdate` persistence, run-event emission, or failure shaping
- broad executor or lifecycle refactors beyond the request-contract seam

## Success Criteria

- one bounded helper owns the request contract assembled before `CodexCloudTaskExecutor.execute(...)`
- `executeOrchestratorCloudTarget(...)` retains `onUpdate`, manifest persistence, run-event emission, and final success/failure shaping
- focused tests cover prompt/request shaping without reopening broader cloud executor behavior
