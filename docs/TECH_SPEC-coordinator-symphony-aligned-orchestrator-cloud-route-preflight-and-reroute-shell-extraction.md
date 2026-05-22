# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud Route Preflight And Reroute Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction`
- Status: Draft

## Background

`1170` and `1171` narrowed the cloud fallback contract and preflight request builder, `1178` extracted the cloud execution lifecycle shell, `1179` extracted the local lifecycle shell, and `1180` extracted the shared route-state assembly. The next remaining cloud-only surface in `orchestratorExecutionRouter.ts` is the orchestration shell still housed in `executeCloudRoute(...)`.

## Scope

- extract the bounded cloud-route shell currently implemented by `executeCloudRoute(...)`
- preserve:
  - `runCloudPreflight(...)` invocation
  - fail-fast behavior when fallback is disabled
  - `manifest.cloud_fallback` application and summary append when fallback is allowed
  - recursive reroute to `mcp`
  - successful delegation into `executeCloudPipeline(...)`
- add focused regression coverage for fail-fast, fallback reroute, and successful cloud delegation behavior

## Out of Scope

- shared route-state assembly now extracted in `1180`
- cloud preflight request builder and failure-contract helper changes
- cloud/local lifecycle shell changes
- runtime-provider internals
- executor internals
- broader router refactors outside the bounded cloud-route shell

## Proposed Approach

1. Introduce one bounded helper adjacent to `executeCloudRoute(...)` or move the cloud-route shell into a dedicated neighboring service module.
2. Keep within the extracted seam:
   - cloud preflight invocation
   - fail-fast handling for non-fallback preflight failures
   - fallback manifest application and recursive reroute
   - successful cloud pipeline delegation with effective env overrides
3. Keep in `orchestratorExecutionRouter.ts`:
   - top-level branch selection in `routeOrchestratorExecution(...)`
   - route-state resolution failure handling
   - imported preflight request/failure-contract helper ownership
4. Add focused regressions that verify:
   - fail-fast behavior when fallback is disabled
   - fallback reroute preserves effective env overrides into the local path
   - successful cloud path delegates unchanged into `executeCloudPipeline(...)`

## Validation

- focused cloud-route regressions
- standard gate bundle before closeout
- explicit elegance review

## Risks

- pulling the seam too low would reopen preflight request or failure-contract helpers that already have dedicated boundaries
- pulling the seam too high would widen the router again by collapsing branch ownership back into the extracted cloud-only shell
