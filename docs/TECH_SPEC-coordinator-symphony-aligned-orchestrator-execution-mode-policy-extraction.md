# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Execution Mode Policy Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1185-coordinator-symphony-aligned-orchestrator-execution-mode-policy-extraction`
- Status: Draft

## Background

`1184` removed the remaining route-decision shell from `orchestratorExecutionRouter.ts` into `orchestratorExecutionRouteDecisionShell.ts`. The router now mainly holds shared exports plus the remaining execution-mode policy block that decides whether a task requires cloud execution and what default execution mode should be used.

## Scope

- extract one bounded execution-mode policy helper adjacent to `orchestratorExecutionRouter.ts`
- move:
  - `requiresCloudOrchestratorExecution(...)`
  - `determineOrchestratorExecutionMode(...)`
- keep router type exports and public route export stable
- preserve existing policy semantics through focused regressions

## Out of Scope

- route decision shell behavior
- route-state assembly or runtime selection
- cloud/local route shell internals
- orchestrator executor lifecycle behavior
- call-site contract changes in `orchestrator.ts`

## Proposed Approach

1. Introduce `orchestratorExecutionModePolicy.ts` as the bounded owner of execution-mode policy.
2. Move only the two policy helpers plus their local `resolveRequiresCloudPolicy(...)` usage into that helper.
3. Keep `orchestratorExecutionRouter.ts` as the public boundary:
   - shared types
   - `routeOrchestratorExecution(...)` export
   - thin re-exports/imports for execution-mode policy
4. Keep `ExecutionModeResolution.test.ts` as the focused regression surface for unchanged semantics.

## Validation

- standard docs-first guards before implementation
- focused execution-mode policy regressions during implementation
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- moving too little leaves router-local policy clutter in place
- moving too much would reopen route decision shell or orchestrator call-site scope
