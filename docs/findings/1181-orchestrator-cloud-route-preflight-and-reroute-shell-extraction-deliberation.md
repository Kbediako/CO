# Findings: 1181 Orchestrator Cloud Route Preflight And Reroute Shell Extraction Deliberation

## Decision

- Proceed with a bounded `1181` lane for the cloud-route preflight and reroute shell centered on `executeCloudRoute(...)` in `orchestratorExecutionRouter.ts`.

## Why This Slice

- `1180` removed the shared route-state assembly, leaving the cloud-route shell as the next dense cloud-only cluster inside the router.
- The inline cloud block is cohesive: it owns cloud preflight invocation, fail-fast handling, fallback manifest and summary updates, recursive reroute, and successful cloud dispatch.
- This is smaller and more truthful than reopening preflight helpers, shared route-state assembly, or lifecycle ownership.

## In Scope

- the cloud-route shell currently implemented by `executeCloudRoute(...)`
- cloud preflight invocation
- fail-fast handling for disabled fallback
- fallback manifest application and recursive reroute
- successful delegation into `executeCloudPipeline(...)`
- focused regressions for fail-fast, fallback reroute, and successful cloud delegation

## Out of Scope

- shared route-state assembly
- preflight request builder and failure-contract helpers
- cloud/local lifecycle shells
- runtime-provider internals
- executor internals
- broader router refactors beyond the bounded cloud-route shell

## Review Posture

- Local read-only review approves this as the next truthful seam after `1180`.
- The lane stays aligned with the Symphony shape by carving the remaining cloud-route shell out of the router without re-widening shared route-state or lifecycle surfaces.
