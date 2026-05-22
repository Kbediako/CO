# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Local Route Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction`
- Status: Draft

## Background

`1179` introduced the local lifecycle shell boundary inside `orchestratorExecutionRouter.ts`, `1180` extracted shared route-state assembly, and `1181` extracted the cloud-route shell into `orchestratorCloudRouteShell.ts`. The next remaining dense router-local surface is the local-route shell still implemented by `runLocalExecutionLifecycleShell(...)`.

## Scope

- extract the bounded local-route shell currently implemented by `runLocalExecutionLifecycleShell(...)`
- preserve:
  - runtime-fallback summary append before local lifecycle start
  - local auto-scout env-override forwarding
  - local pipeline dispatch through `executeOrchestratorLocalPipeline(...)`
  - guardrail recommendation append after finalize
- add focused regression coverage for runtime-fallback summary behavior, auto-scout env propagation, local execution dispatch, and guardrail recommendation append

## Out of Scope

- route-state resolution now extracted in `1180`
- cloud-route shell now extracted in `1181`
- execution-mode policy helpers
- shared `failExecutionRoute(...)` contract
- lifecycle runner or local executor internals
- broader router refactors outside the bounded local-route shell

## Proposed Approach

1. Introduce one bounded helper or neighboring service module for the remaining local-route shell.
2. Keep within the extracted seam:
   - runtime-fallback summary append
   - local auto-scout env forwarding
   - local pipeline dispatch through `executeOrchestratorLocalPipeline(...)`
   - guardrail recommendation append
3. Keep in `orchestratorExecutionRouter.ts`:
   - route-state resolution and failure handling
   - cloud/local branch selection in `routeOrchestratorExecution(...)`
   - execution-mode policy helpers and shared `failExecutionRoute(...)`
4. Add focused regressions that verify:
   - runtime-fallback summary append before lifecycle start
   - local auto-scout sees effective env overrides
   - local executor dispatch still uses selected runtime mode plus session id
   - guardrail recommendation append remains intact

## Validation

- focused local-route regressions
- standard gate bundle before closeout
- explicit elegance review

## Risks

- pulling the seam too low would reopen lifecycle runner or executor internals that already have their own boundaries
- pulling the seam too high would keep router-local orchestration clutter in place and reduce symmetry with the cloud-route shell extracted in `1181`
