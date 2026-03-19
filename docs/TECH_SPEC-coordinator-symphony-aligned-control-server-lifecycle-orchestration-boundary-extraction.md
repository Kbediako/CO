# TECH_SPEC: Coordinator Symphony-Aligned Control Server Lifecycle Orchestration Boundary Extraction

## Context

The request/action dispatch family is already frozen after `1233`, but the control-server host-runtime layer still coordinates startup, readiness, bootstrap, and shutdown across several related lifecycle files.

## Requirements

1. Reinspect the lifecycle orchestration boundary across:
   - `orchestrator/src/cli/control/controlServer.ts`
   - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
   - `orchestrator/src/cli/control/controlServerReadyInstanceLifecycle.ts`
   - `orchestrator/src/cli/control/controlServerReadyInstanceStartup.ts`
   - `orchestrator/src/cli/control/controlServerBootstrapStartSequence.ts`
   - `orchestrator/src/cli/control/controlBootstrapAssembly.ts`
2. Extract the smallest truthful lifecycle orchestration seam that still owns startup/close sequencing.
3. Preserve readiness, bind ordering, persisted auth metadata timing, and teardown behavior.
4. Keep request/action dispatch, Telegram, Linear, oversight, and bootstrap policy families out of scope unless a tiny parity helper is strictly required.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- docs-review approval or explicit override

## Exit Conditions

- `go`: a concrete bounded lifecycle orchestration seam is identified with exact candidate files and a clear reason it is not a fake abstraction
- `no-go`: the supposed lifecycle seam is already fully extracted and the lane must be converted to a no-op reassessment
