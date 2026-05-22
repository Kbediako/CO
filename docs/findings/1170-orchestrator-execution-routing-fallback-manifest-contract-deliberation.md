# 1170 Deliberation Note

## Why This Lane Exists

`1169` already did the truthful broad router-local policy split. The next remaining density is no longer the whole route shell; it is the fallback contract inside the cloud branch, where manifest shaping, note emission, and recursive `mcp` reroute inputs still sit together.

## Chosen Boundary

`1170` is scoped to the router-local fallback manifest contract:

- `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`
- `orchestrator/tests/OrchestratorExecutionRouteDecisionShell.test.ts`

## Why Not A Broader Router Or Orchestrator Lane

Another broad routing or `orchestrator.ts` extraction would reopen already-closed work from `1159` and `1169`. The truthful next seam is smaller and contract-oriented: preserve behavior while making fallback manifest/error-note shaping easier to test and review in isolation.
