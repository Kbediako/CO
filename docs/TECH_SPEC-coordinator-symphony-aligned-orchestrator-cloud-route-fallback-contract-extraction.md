# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud Route Fallback Contract Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction`
- Status: Draft

## Background

`1181` extracted the cloud-route shell into `orchestratorCloudRouteShell.ts` and `1182` extracted the local-route shell into `orchestratorLocalRouteShell.ts`. The next remaining dense routing surface is the pure fallback decision cluster still embedded inside `orchestratorCloudRouteShell.ts`.

## Scope

- extract the bounded cloud-route fallback contract currently shaped inline in `orchestratorCloudRouteShell.ts`
- preserve:
  - cloud fallback allow/deny policy parsing
  - preflight-failure detail shaping
  - fallback reroute payload assembly for the fallback-to-`mcp` path
- add focused regression coverage for fail-fast behavior, fallback contract shaping, and reroute payload assembly

## Out of Scope

- successful cloud preflight dispatch wiring
- cloud preflight request assembly extracted earlier
- router-local route-state resolution and branch selection
- local-route shell extracted in `1182`
- broader cloud target executor lifecycle behavior

## Proposed Approach

1. Introduce one bounded helper or neighboring contract module for the fallback decision cluster inside `orchestratorCloudRouteShell.ts`.
2. Keep within the extracted seam:
   - `CODEX_ORCHESTRATOR_CLOUD_FALLBACK` allow/deny interpretation
   - fail-fast versus fallback decision contract shaping
   - fallback reroute payload construction
3. Keep in `orchestratorCloudRouteShell.ts`:
   - cloud preflight invocation
   - `manifest.cloud_fallback` mutation and summary append
   - reroute execution
   - successful cloud pipeline dispatch
4. Add focused regressions that verify:
   - deny-mode fail-fast still returns the same contract
   - allow-mode fallback still produces the same detail plus reroute payload
   - successful cloud dispatch remains outside the extracted contract helper

## Validation

- focused cloud-route fallback regressions
- standard docs-first guards before implementation
- standard gate bundle plus explicit elegance review before closeout

## Risks

- pulling the seam too low would reopen cloud-route shell responsibilities that should stay adjacent to preflight invocation
- pulling the seam too high would leave avoidable fallback policy and contract clutter inside the shell
