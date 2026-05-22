# TECH SPEC: Coordinator Symphony-Aligned Orchestrator Cloud-Preflight Request Assembly Extraction

## Context

`1169` split the broader router-local policy helpers, and `1170` isolated the cloud-preflight failure contract. The truthful remaining density in `executeCloudRoute(...)` is now the cloud-preflight request assembly cluster.

## Scope

- tighten or extract the cloud-preflight request assembly in `orchestratorExecutionRouter.ts`
- preserve current cloud preflight invocation behavior
- preserve hard-fail versus fallback ownership in `executeCloudRoute(...)`
- extend focused router regressions for preflight-request invariants when needed

## Out of Scope

- new fallback behavior
- runtime/provider policy changes
- lifecycle/executor refactors
- broader `orchestrator.ts` work

## Proposed Design

1. Isolate the cloud-preflight request assembly into a smaller router-local helper or equivalent bounded branch surface.
2. Keep `runCloudPreflight(...)`, hard-fail handling, fallback handling, and cloud pipeline execution inside `executeCloudRoute(...)`.
3. Preserve the same `environmentId`, `branch`, `codexBin`, and merged env inputs passed into preflight.
4. Add focused tests for the request-assembly contract if the seam becomes independently observable.

## Validation

- focused `OrchestratorExecutionRouter` regressions
- adjacent router-level coverage when relevant
- normal docs-first guard bundle

