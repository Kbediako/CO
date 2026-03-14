# Findings - 1174 Orchestrator Cloud-Target Missing-Env Failure Contract Extraction

## Decision

Proceed with a bounded missing-environment hard-fail contract extraction next.

## Why This Seam

- `1173` already removed the adjacent request-shaping cluster before `CodexCloudTaskExecutor.execute(...)`.
- The remaining dense block at the top of the executor body is now the missing-environment hard-fail projection assembled after `resolveCloudEnvironmentId(...)` fails.
- That block is still data-contract shaping, not environment-id resolution policy and not executor lifecycle ownership.
- Extracting it keeps the lane truthful and avoids reopening broader cloud-target lifecycle work.

## Out of Scope

- `resolveCloudEnvironmentId(...)` precedence
- target-stage resolution or sibling skip-marking
- executor handoff, `onUpdate`, and final success/failure result application
- broader cloud fallback or lifecycle refactors

## Risk

If the lane only renames locals, the real missing-env contract stays inline. If it absorbs resolution or non-missing-env lifecycle behavior, the slice widens beyond the truthful contract boundary.
