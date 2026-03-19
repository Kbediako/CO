# PRD: Coordinator Symphony-Aligned Orchestrator Cloud Route Fallback Contract Extraction

## Summary

After `1182` extracted the local-route shell out of `orchestratorExecutionRouter.ts`, the next truthful seam is the remaining cloud-route fallback decision cluster inside `orchestratorCloudRouteShell.ts`.

## Problem

`orchestrator/src/cli/services/orchestratorCloudRouteShell.ts` still co-locates several pure contract decisions with the cloud-route shell entrypoint:

- cloud fallback allow/deny policy parsing
- preflight-failure contract shaping
- fallback reroute payload assembly for the fallback-to-`mcp` path

That leaves one dense cloud-route contract surface embedded inside the shell even though the broader router and local-route boundaries are already separated.

## Goal

Extract one bounded cloud-route fallback contract helper so `orchestratorCloudRouteShell.ts` stays the shell boundary for preflight invocation and dispatch while delegating pure fallback decision shaping through a smaller, more Symphony-aligned contract module.

## Non-Goals

- changing successful cloud preflight dispatch
- changing cloud preflight request assembly
- changing `orchestratorExecutionRouter.ts` route-state resolution or branch selection
- changing the local-route shell extracted in `1182`
- changing broader cloud target executor lifecycle behavior

## Success Criteria

- one bounded helper owns cloud fallback allow/deny policy parsing plus preflight-failure contract shaping
- `orchestratorCloudRouteShell.ts` remains the shell boundary for preflight invocation, manifest mutation, reroute dispatch, and successful cloud execution handoff
- focused regressions pin fail-fast behavior, fallback contract shaping, and reroute payload assembly without reopening router or executor seams
