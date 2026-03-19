# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Remaining Shared Cloud Request-Contract Reassessment

## Problem Statement

`1203` and `1204` already extracted the only obviously shared cross-surface cloud resolution contracts. The remaining neighboring cloud surfaces must be reassessed before opening another implementation lane.

## Scope

- inspect the remaining shared cloud request-contract density around:
  - `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`
  - `orchestrator/src/cli/services/orchestratorCloudRouteShell.ts`
  - `orchestrator/src/cli/services/orchestratorAutoScoutEvidenceRecorder.ts`
  - `orchestrator/src/cli/utils/cloudPreflight.ts`
- determine whether any remaining cross-surface cloud request fields still justify extraction
- record whether the truthful result is a bounded next seam or a no-op stop signal

## Out of Scope

- code changes to the cloud executor, route shell, auto-scout recorder, or doctor unless the reassessment proves a real next seam
- reopening shared environment-id or branch resolution
- generic numeric/default parsing consolidation
- feature-toggle parsing consolidation
- broader cloud lifecycle or prompt assembly refactors

## Current Hypothesis

No truthful shared cloud request-contract extraction remains in this local family. The remaining surfaces now represent distinct responsibilities:

- preflight request assembly
- execution request shaping
- evidence recording

Any forced helper is likely to re-bundle already-extracted `environmentId` and `branch` or to couple unrelated contracts.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run review`
