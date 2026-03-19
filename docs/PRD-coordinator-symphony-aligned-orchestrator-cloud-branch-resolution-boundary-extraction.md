# PRD: Coordinator Symphony-Aligned Orchestrator Cloud Branch Resolution Boundary Extraction

## Summary

After `1203` extracted shared cloud environment-id resolution, the next bounded Symphony-aligned seam is the shared cloud branch resolution behavior still duplicated across the cloud executor request contract, cloud-route preflight request builder, and auto-scout evidence recorder.

## Problem

`CODEX_CLOUD_BRANCH` precedence is still resolved inline in three neighboring cloud services:

- `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`
- `orchestrator/src/cli/services/orchestratorCloudRouteShell.ts`
- `orchestrator/src/cli/services/orchestratorAutoScoutEvidenceRecorder.ts`

Those copies are still small, but they now represent the next truthful shared contract in this cloud family. Leaving branch resolution duplicated makes future precedence changes harder to review and keeps cloud request assembly spread across adjacent services instead of behind one neutral boundary.

## Goal

Extract one bounded cloud branch-resolution helper so executor, cloud-route shell, and auto-scout surfaces consume the same branch contract without widening into environment-id resolution, numeric/default parsing, request assembly, or cloud lifecycle behavior.

## Non-Goals

- changing `CODEX_CLOUD_BRANCH` precedence or semantics
- changing shared environment-id resolution after `1203`
- changing request numeric/default parsing or `CloudTaskExecutorInput` assembly
- changing missing-environment failure shaping, preflight policy, running-state updates, or completion handling
- broad cloud execution refactors beyond the shared branch-resolution boundary

## Success Criteria

- one bounded helper/module owns cloud branch resolution
- executor, cloud-route shell, and auto-scout evidence recorder consume that helper rather than maintaining inline branch precedence copies
- focused regressions preserve current branch precedence and adjacent cloud callers remain behaviorally unchanged
