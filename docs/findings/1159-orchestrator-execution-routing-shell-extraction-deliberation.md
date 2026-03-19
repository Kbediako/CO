# Findings - 1159 Orchestrator Execution-Routing Shell Extraction

## Decision

Proceed with a bounded execution-routing shell extraction next.

## Why This Seam

- `1156` already moved the shared local/cloud lifecycle shell into `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`.
- `1157` already moved the cloud-only target executor into `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`.
- `1158` already moved the local stage-loop executor into `orchestrator/src/cli/services/orchestratorLocalPipelineExecutor.ts`.
- The remaining dense inline branch in `orchestrator/src/cli/orchestrator.ts` is now the routing/policy layer above those services: mode selection, runtime selection, env merge, cloud preflight/fallback shaping, and executor dispatch.
- Existing tests already cluster around this surface: `orchestrator/tests/ExecutionModeResolution.test.ts`, `orchestrator/tests/OrchestratorCloudAutoScout.test.ts`, and `orchestrator/tests/OrchestratorSubpipelineFailure.test.ts`.

## Why Not Smaller

- A helper-only split for `runAutoScout(...)`, cloud fallback formatting, or one mode-policy helper would be cosmetic and would leave the actual `executePipeline(...)` routing shell inline.

## Why Not Larger

- Jumping directly to start/resume orchestration or broader `performRunLifecycle(...)` restructuring would cross public lifecycle and control-plane boundaries too early and stop being a diff-local continuation of the now-extracted executor seams.

## Out of Scope

- Local/cloud executor body changes
- Runtime-selection semantic changes
- Start/resume lifecycle shell changes
- `performRunLifecycle(...)` control-plane / scheduler / TaskManager orchestration
- Docs/status mirror refactors beyond the normal docs-first sync
