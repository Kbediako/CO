# PRD: Coordinator Symphony-Aligned Orchestrator Remaining Shared Cloud Request-Contract Reassessment

## Summary

After `1203` extracted shared cloud environment-id resolution and `1204` extracted shared cloud branch resolution, the next truthful move is to reassess whether any real shared cloud request contract still remains across the neighboring cloud executor, cloud-route, and auto-scout surfaces.

## Problem

The previously duplicated cross-surface cloud resolution behavior is now first-class:

- `orchestrator/src/cli/services/orchestratorCloudEnvironmentResolution.ts`
- `orchestrator/src/cli/services/orchestratorCloudBranchResolution.ts`

What remains nearby is a mix of:

- cloud preflight request assembly in `orchestratorCloudRouteShell.ts` and `cloudPreflight.ts`
- executor-local request shaping in `orchestratorCloudTargetExecutor.ts`
- auto-scout evidence capture in `orchestratorAutoScoutEvidenceRecorder.ts`

Forcing another extraction without reassessment risks inventing a fake boundary that merely re-bundles already-extracted fields or couples distinct responsibilities.

## Goal

Reassess the remaining shared cloud request-contract density and record whether one bounded implementation seam still exists nearby or whether the truthful outcome is an explicit no-op stop signal.

## Non-Goals

- changing cloud execution behavior, fallback policy, or evidence persistence
- changing `buildCloudPreflightRequest(...)` or doctor behavior without new evidence
- extracting executor-local numeric/default parsing, feature toggle parsing, or interactive env defaults for stylistic consistency alone
- reopening `1203` or `1204`
- broad cloud execution refactors beyond this reassessment lane

## Success Criteria

- docs-first artifacts capture the reassessment boundary and the candidate surfaces under review
- the reassessment explicitly records whether any remaining cross-surface request fields still justify extraction
- the reassessment explicitly excludes generic parsing helpers, feature toggles, and evidence-only fields unless new evidence proves they are part of a real shared request contract
- the lane closes either with one clearly bounded next implementation seam or with an explicit no-op conclusion backed by local inspection and delegated corroboration
