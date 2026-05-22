# 1171 Deliberation Note

## Why This Lane Exists

`1170` already isolated the cloud-preflight failure contract. The next remaining density in `executeCloudRoute(...)` is no longer fallback handling; it is the inline request assembly for `runCloudPreflight(...)`.

## Chosen Boundary

`1171` is scoped to the cloud-preflight request assembly inside:

- `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`
- `orchestrator/tests/OrchestratorExecutionRouteDecisionShell.test.ts`

## Why Not A Broader Router Or Orchestrator Lane

Another broad router or orchestrator lane would reopen work already closed in `1169` and `1170`. The truthful next seam is smaller and cloud-preflight-specific: preserve route ownership while extracting only the preflight input shaping.
