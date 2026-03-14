# PRD: Coordinator Symphony-Aligned Orchestrator Execution Routing Decision Shell Extraction

## Summary

After `1183` extracted the remaining cloud-route fallback contract, the next truthful seam is the route-decision shell still embedded inside `orchestratorExecutionRouter.ts`.

## Problem

`orchestrator/src/cli/services/orchestratorExecutionRouter.ts` still co-locates the top-level execution-routing decision shell:

- runtime-selection fail-fast behavior
- cloud versus local route branching
- thin forwarding into the already-extracted cloud and local route shells

That leaves one remaining orchestration shell inside the router even though route-state assembly, cloud-route internals, local-route internals, and fallback contract shaping are already split into smaller seams.

## Goal

Extract one bounded execution-routing decision shell so `orchestratorExecutionRouter.ts` becomes a thinner adapter around the already-extracted route shells while preserving the exact current routing behavior.

## Non-Goals

- changing route-state assembly or runtime-mode selection
- changing cloud-preflight request assembly or fallback contract shaping
- changing local-route shell internals
- changing successful cloud pipeline dispatch or broader executor lifecycle behavior
- changing downstream manifest or summary contracts

## Success Criteria

- one bounded helper owns the remaining execution-routing decision shell currently co-located in `orchestratorExecutionRouter.ts`
- `orchestratorExecutionRouter.ts` keeps only the thin adapter responsibilities that still need to remain adjacent to the public routing boundary
- focused regressions preserve runtime-selection fail-fast behavior, cloud/local branching, and fallback-adjusted downstream forwarding without reopening cloud/local shell internals
