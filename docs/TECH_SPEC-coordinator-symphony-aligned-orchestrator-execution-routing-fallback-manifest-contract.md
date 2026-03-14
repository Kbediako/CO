# TECH SPEC: Coordinator Symphony-Aligned Orchestrator Execution-Routing Fallback Manifest Contract

## Context

`1169` already extracted the broad router-local policy helpers. The truthful remaining density is now narrower: the cloud preflight failure contract inside `executeCloudRoute(...)`, especially the distinction between hard-fail status/summary shaping and optional fallback manifest/note/reroute shaping.

## Scope

- tighten or extract the cloud-preflight failure contract in `orchestratorExecutionRouter.ts`
- preserve cloud hard-fail behavior when fallback is disabled
- preserve recursive `mcp` fallback inputs when fallback is allowed
- extend focused router tests for contract-local fallback invariants

## Out of Scope

- new runtime/provider policy
- lifecycle or executor refactors
- broader `orchestrator.ts` work
- review-wrapper or diagnostics reliability work

## Proposed Design

1. Isolate the hard-fail versus fallback manifest/error-note shaping into a smaller router-local contract helper or equivalent bounded branch surface.
2. Keep preflight execution, hard-fail/fallback decision ownership, and recursive fallback execution inside the router module.
3. Preserve the exact `runtimeModeRequested`, `runtimeModeSource`, and `envOverrides` values forwarded into the recursive `mcp` reroute.
4. Add focused tests for:
   - hard-fail manifest/error-note shaping
   - successful fallback manifest/error-note shaping
   - recursive reroute input preservation

## Validation

- focused `OrchestratorExecutionRouter` tests
- adjacent router-level regression coverage for fallback behavior
- normal docs-first guard bundle
