# 1169 Deliberation Note

## Why This Lane Exists

The broad execution-routing shell was already extracted in `1159`, so the next truthful seam cannot repeat that title or scope. The remaining real density is inside `routeOrchestratorExecution(...)`, where runtime-selection resolution, cloud preflight/fallback policy, and local execution dispatch still live together.

## Chosen Boundary

`1169` is scoped to router-local policy splitting:

- `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`
- `orchestrator/src/cli/orchestrator.ts` adapter boundary only
- focused router regressions

## Why Not A Verification-Only Lane

A verification-only contract lane would confirm today's behavior but leave the same dense policy cluster in place. A router-local split is still bounded, adjacent to `1168`, and creates a cleaner future hardening seam without reopening already-closed public-orchestrator work.
