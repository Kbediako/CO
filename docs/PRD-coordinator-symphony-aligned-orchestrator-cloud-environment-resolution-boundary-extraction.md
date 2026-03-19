# PRD: Coordinator Symphony-Aligned Orchestrator Cloud Environment Resolution Boundary Extraction

## Summary

After `1202` extracted cloud prompt assembly, the next bounded Symphony-aligned seam is the shared cloud environment-id resolution behavior that still lives in `orchestratorCloudTargetExecutor.ts` while sibling services import `resolveCloudEnvironmentId(...)` directly.

## Problem

`orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts` still owns the exported `resolveCloudEnvironmentId(...)` contract.

The exported environment-id resolution contract is no longer executor-local. It is already consumed by:

- `orchestrator/src/cli/services/orchestratorCloudRouteShell.ts`
- `orchestrator/src/cli/services/orchestratorAutoScoutEvidenceRecorder.ts`

Leaving the shared resolution surface inside the executor keeps cross-service ownership blurry and makes future cloud-env precedence changes harder to isolate and review.

Nearby cloud services also carry their own local `readCloudString(...)` helpers for unrelated branch/env parsing, but those call sites are context-only here, not part of this extraction target.

## Goal

Extract one bounded cloud environment resolution helper so executor, route-shell, and auto-scout surfaces consume the same neutral environment-id contract without widening into request assembly, unrelated parsing helpers, or cloud lifecycle logic.

## Non-Goals

- changing `resolveCloudEnvironmentId(...)` precedence or semantics
- changing cloud prompt assembly or prompt-pack selection
- changing request numeric/default parsing or `CloudTaskExecutorInput` assembly
- changing missing-environment failure shaping, preflight/sibling skipping, running-state updates, or completion handling
- broad cloud execution refactors beyond the shared env-resolution boundary

## Success Criteria

- one bounded helper/module owns cloud environment id resolution
- executor, cloud-route shell, and auto-scout evidence recorder consume that helper rather than importing resolution from the executor
- focused regressions preserve current environment-id precedence and adjacent cloud callers remain behaviorally unchanged
