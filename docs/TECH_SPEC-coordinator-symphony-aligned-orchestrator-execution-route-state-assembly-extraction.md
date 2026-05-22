# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Execution Route State Assembly Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction`
- Status: Draft

## Background

`1169` split router policy into explicit runtime-selection, cloud-route, local-route, and fail-fast helpers. `1170` through `1172` then narrowed the cloud preflight request and fallback contract seams, and `1178` plus `1179` extracted the cloud and local lifecycle shells. The next shared surface is the route-state assembly cluster still housed in `resolveExecutionRouteState(...)` in `orchestratorExecutionRouter.ts`.

## Scope

- extract the shared route-state assembly responsibility centered on `resolveExecutionRouteState(...)`
- move base env override merge, runtime selection resolution, manifest application, and effective env assembly into one bounded helper/module
- preserve the current route-state return shape:
  - `runtimeSelection`
  - `effectiveEnvOverrides`
  - `effectiveMergedEnv`
- add focused regression coverage for runtime selection invocation, manifest application, and env precedence

## Out of Scope

- cloud preflight request or fallback contract changes
- cloud lifecycle shell or local lifecycle shell changes
- `resolveRuntimeSelection(...)` behavior or runtime-provider internals
- `runOrchestratorExecutionLifecycle(...)` behavior changes
- `executeOrchestratorLocalPipeline(...)` or cloud executor internal behavior changes
- broader router restructuring outside the shared route-state assembly seam

## Proposed Approach

1. Introduce one bounded helper/module adjacent to `orchestratorExecutionRouter.ts` for shared route-state assembly.
2. Move into that helper/module:
   - base env override merge
   - `resolveRuntimeSelection(...)` invocation
   - `applyRuntimeSelection(...)` delegation into the manifest
   - effective env override and merged-env assembly
3. Keep in `orchestratorExecutionRouter.ts`:
   - runtime-selection failure handling in `routeOrchestratorExecution(...)`
   - cloud/local branch ownership
   - cloud preflight request and fallback handling
   - cloud/local lifecycle delegation
4. Add focused regressions that verify:
   - requested mode/source and merged env are forwarded into runtime selection
   - manifest application still receives the resolved runtime selection
   - runtime env overrides take precedence for downstream route consumers

## Validation

- focused route-state regressions
- standard gate bundle before closeout
- explicit elegance review

## Risks

- pulling the seam too low would reopen runtime provider internals that already belong behind `resolveRuntimeSelection(...)`
- pulling the seam too high would widen the change back into cloud fallback policy or local/cloud lifecycle ownership
