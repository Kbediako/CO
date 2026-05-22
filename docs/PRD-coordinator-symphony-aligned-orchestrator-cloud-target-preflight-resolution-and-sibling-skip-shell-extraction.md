# PRD: Coordinator Symphony-Aligned Orchestrator Cloud-Target Preflight Resolution And Sibling-Skip Shell Extraction

## Summary

After `1176` extracted the post-executor completion shell, the next truthful seam is the remaining pre-execution target-resolution and sibling-skip cluster still shaped inline in `orchestratorCloudTargetExecutor.ts`.

## Problem

`orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts` still inlines the cloud-target preamble that waits through control gating, resolves the target command stage, shapes the invalid or missing-target failure path, and projects sibling commands to `skipped` for cloud-target execution.

## Goal

Extract one bounded preflight helper so `executeOrchestratorCloudTarget(...)` keeps orchestration ownership while the target-resolution plus sibling-skip shell moves into a narrow same-module helper.

## Non-Goals

- changing the already-extracted request-contract shaping
- changing the missing-environment failure contract
- changing the already-extracted running-state / `onUpdate` shell
- changing the already-extracted completion shell
- changing orchestration call sites in `orchestrator.ts`
- broad cloud-target lifecycle refactors

## Success Criteria

- one bounded helper owns control wait / cancel handling, target-stage resolution, missing-target failure shaping, and sibling skip projection
- `executeOrchestratorCloudTarget(...)` still owns missing-env handling, request shaping, executor invocation, completion application, and return-path control flow
- focused tests pin unresolved/non-command target behavior and sibling skip shaping without widening into the broader executor lifecycle
