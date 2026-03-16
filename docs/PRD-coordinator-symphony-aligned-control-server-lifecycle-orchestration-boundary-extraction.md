# PRD: Coordinator Symphony-Aligned Control Server Lifecycle Orchestration Boundary Extraction

## Summary

After `1233` froze the control request/action dispatch family, the next truthful broader seam is the control-server lifecycle orchestration boundary around startup, readiness, bootstrap assembly, and shutdown sequencing.

## Problem

The control-server host-runtime layer still coordinates a cross-file lifecycle boundary spanning:

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/controlServerReadyInstanceLifecycle.ts`
- `orchestrator/src/cli/control/controlServerReadyInstanceStartup.ts`
- `orchestrator/src/cli/control/controlServerBootstrapStartSequence.ts`
- `orchestrator/src/cli/control/controlBootstrapAssembly.ts`

That layer owns important side effects and sequencing constraints: startup ordering, bind/readiness coupling, bootstrap assembly, auth/token metadata persistence timing, and close/teardown flow. Unlike the route/action dispatch family, this still looks like a real ownership boundary rather than a set of already-thin orchestration shims.

## Goal

Extract the control-server lifecycle orchestration boundary into a more coherent surface while preserving startup, readiness, bootstrap, and shutdown behavior.

## Non-Goals

- reopening the already-frozen request/action dispatch family from `1233`
- widening into Telegram, Linear, oversight, or control bootstrap policy beyond the lifecycle seam needed here
- changing route parsing, authenticated-route admission, or per-endpoint control action behavior
- forcing a broader control refactor outside the lifecycle boundary

## Success Criteria

- the lifecycle startup/close orchestration boundary is identified precisely and moved behind a truthful helper surface
- startup ordering and readiness/auth metadata coupling remain behaviorally identical
- validation focuses on lifecycle sequencing risks rather than unrelated route/controller behavior
- the lane stays bounded to the lifecycle ownership layer rather than reopening already-extracted control families
