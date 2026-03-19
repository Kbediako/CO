# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Execution Routing Decision Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1184-coordinator-symphony-aligned-orchestrator-execution-routing-decision-shell-extraction`
- Status: Draft

## Background

`1180` moved route-state assembly out of the router, `1181` and `1182` split cloud and local route shells, and `1183` extracted the remaining cloud-route fallback contract. The remaining dense routing surface is the execution-routing decision shell still embedded inside `orchestratorExecutionRouter.ts`.

## Scope

- extract one bounded execution-routing decision shell adjacent to `orchestratorExecutionRouter.ts`
- preserve:
  - runtime-selection fail-fast behavior
  - cloud versus local route branching
  - forwarding into the already-extracted cloud and local route shells
- add focused regressions for routing fail-fast behavior, cloud/local branching, and fallback-adjusted forwarding

## Out of Scope

- route-state assembly or runtime selection
- cloud-route shell internals
- local-route shell internals
- cloud-preflight request assembly or fallback contract shaping
- successful cloud pipeline dispatch or broader cloud/local executor lifecycle behavior

## Proposed Approach

1. Introduce one bounded neighboring helper for the execution-routing decision shell currently held in `orchestratorExecutionRouter.ts`.
2. Keep within the extracted seam:
   - route-level fail-fast shaping for runtime-selection errors
   - route-level mode branching
   - thin cloud/local forwarding contracts
3. Keep outside the seam:
   - route-state assembly
   - cloud/local shell implementation details
   - downstream executor lifecycle behavior
4. Add focused regressions that verify:
   - runtime-selection failure still short-circuits before downstream execution
   - cloud routing still forwards to the cloud shell with the same options
   - local routing still forwards to the local shell with the same fallback-adjusted execution/runtime modes

## Validation

- focused router regressions
- standard docs-first guards before implementation
- standard gate bundle plus explicit elegance review before closeout

## Risks

- extracting too little would leave the router with avoidable orchestration clutter
- extracting too much would reopen cloud/local shell internals that were already split in earlier lanes
