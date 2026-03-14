# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud-Target Preflight Resolution And Sibling-Skip Shell Extraction

## Context

`1173` through `1176` segmented request construction, missing-env failure, running/update persistence, and completion application inside `executeOrchestratorCloudTarget(...)`. The next bounded Symphony-aligned move is to extract only the remaining pre-execution target-resolution and sibling-skip shell.

## Proposed Boundary

Introduce one same-module helper in `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts` that receives:

- `manifest`
- `pipeline`
- `target`
- `controlWatcher`
- optional `runEvents`

and owns only:

- `wait_for_user_approval` pause / cancel handling
- target-stage resolution via `resolveCloudTargetStage(...)`
- invalid or missing target failure shaping
- non-target sibling `manifest.commands` skip projection

## In Scope

- bounded same-module preflight-shell extraction
- preserving caller-owned executor invocation and return control flow
- focused unresolved-target and sibling-skip regressions

## Out of Scope

- missing-environment failure contract
- request construction and executor handoff
- the already-extracted `running` plus `onUpdate` shell
- the already-extracted completion shell
- orchestration changes in `orchestrator.ts`

## Validation

- focused `OrchestratorCloudTargetExecutor.test.ts`
- standard docs-first guard bundle before implementation
- bounded review / elegance pass after implementation
