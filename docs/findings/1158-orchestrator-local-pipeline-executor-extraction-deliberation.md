# Findings - 1158 Orchestrator Local-Pipeline Executor Extraction

## Decision

Proceed with a bounded local-pipeline executor extraction next.

## Why This Seam

- `1156` already moved the shared local/cloud lifecycle shell into `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`.
- `1157` already moved the cloud-only target executor into `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`.
- The remaining dense inline branch in `orchestrator/src/cli/orchestrator.ts` is now specifically local-only: the per-stage loop, already-completed skip handling, command execution, local subpipeline launch, stage failure shaping, and `child_runs` assembly.
- This is the clearest remaining asymmetry in the orchestrator relative to the current Symphony-aligned direction: the top shell chooses policy/lifecycle, while target-specific runners sit below it.

## Out of Scope

- Cloud preflight / fallback / prompt behavior
- Auto-scout changes
- `performRunLifecycle(...)` control-plane / scheduler / TaskManager orchestration
- `start` / `resume` shell changes
- Manifest schema or run-event payload changes
- Docs/status mirror refactors beyond the normal docs-first sync

## Risk

If we jump to broader orchestrator refactors, the lane stops being diff-local and crosses lifecycle/policy boundaries too early. If we defer the local runner seam, `orchestrator.ts` stays asymmetrical after the cloud extraction and continues to carry the denser local mutation surface inline.
