# Findings - 1173 Orchestrator Cloud-Target Execution Request Contract Extraction

## Decision

Proceed with a bounded cloud-target execution request-contract extraction next.

## Why This Seam

- `1172` already removed the adjacent cross-shell cloud-preflight request drift between router and doctor.
- The remaining dense cloud executor cluster is now local to `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`: the inline request assembled before `CodexCloudTaskExecutor.execute(...)`.
- That cluster is data-shaping, not lifecycle ownership. It is the next truthful place to thin the service without reopening fallback policy, environment-id resolution, or manifest persistence.
- Existing nearby coverage already separates prompt behavior and cloud execution lifecycle, so a focused request-contract test can pin this seam without widening into executor internals.

## Out of Scope

- cloud preflight / fallback policy
- `resolveCloudEnvironmentId(...)` precedence
- `CodexCloudTaskExecutor.execute(...)` internals
- manifest persistence, `onUpdate`, and run-event lifecycle ownership
- broader cloud executor refactors

## Risk

If the lane only renames locals, the real request assembly stays inline. If it pulls lifecycle/persistence into the helper, the slice stops being a bounded request-contract extraction.
