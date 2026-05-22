# 1172 Deliberation Note

## Why This Lane Exists

`1171` removed the remaining router-local cloud-preflight request density. The next truthful risk is no longer inside router fallback handling; it is the duplicated request-contract shaping between router and doctor before they call `runCloudPreflight(...)`.

## Chosen Boundary

`1172` is scoped to the shared request-contract seam across:

- `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`
- `orchestrator/src/cli/doctor.ts`

Secondary context only:

- `orchestrator/src/cli/utils/cloudPreflight.ts`
- `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`

## Why Not More Router Fallback Work

`1170` and `1171` already isolated the router-local fallback contract and request assembly. Reopening router fallback behavior would widen scope without addressing the remaining drift risk, which is now cross-shell request-shaping duplication.
