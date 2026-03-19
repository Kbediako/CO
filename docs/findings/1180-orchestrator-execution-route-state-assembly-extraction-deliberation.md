# Findings: 1180 Orchestrator Execution Route State Assembly Extraction Deliberation

## Decision

- Proceed with a bounded `1180` lane for the shared route-state assembly seam centered on `resolveExecutionRouteState(...)` in `orchestratorExecutionRouter.ts`.

## Why This Slice

- `1178` and `1179` removed the remaining cloud and local lifecycle shells, so the next dense shared surface is the pre-branch state assembly cluster used by both routes.
- The cluster is cohesive: it owns base env override merge, `resolveRuntimeSelection(...)`, manifest application, and the effective env objects consumed by the already-extracted cloud and local route helpers.
- This is smaller and more truthful than reopening cloud fallback policy, local/cloud lifecycle ownership, or runtime-provider internals.

## In Scope

- the shared route-state assembly currently in `resolveExecutionRouteState(...)`
- base env override merge
- runtime selection resolution and manifest application
- effective env override and merged-env assembly
- focused regressions for runtime selection invocation, manifest application, and env precedence

## Out of Scope

- cloud preflight request or fallback policy
- cloud or local lifecycle shell behavior
- runtime provider internals
- local or cloud executor internals
- broader router refactors beyond the shared route-state assembly seam

## Review Posture

- Local read-only review approves this as the next truthful seam after `1179`.
- The lane stays aligned with the Symphony shape by carving the shared route-state contract out of the router without re-widening lifecycle or fallback-policy surfaces.
