# TECH_SPEC: Coordinator Symphony-Aligned Control Server Lifecycle Boundary Freeze Reassessment

## Context

`1234` extracted the stateful owned-runtime publication and shutdown boundary, leaving the rest of the control-server lifecycle chain split across narrow startup, bootstrap, and public wrapper helpers.

## Requirements

1. Reinspect the remaining control-server lifecycle family across:
   - `orchestrator/src/cli/control/controlServer.ts`
   - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
   - `orchestrator/src/cli/control/controlServerReadyInstanceLifecycle.ts`
   - `orchestrator/src/cli/control/controlServerOwnedRuntimeLifecycle.ts`
   - `orchestrator/src/cli/control/controlServerReadyInstanceStartup.ts`
   - `orchestrator/src/cli/control/controlServerStartupSequence.ts`
   - `orchestrator/src/cli/control/controlBootstrapAssembly.ts`
   - `orchestrator/src/cli/control/controlServerBootstrapStartSequence.ts`
2. Confirm whether any concrete bounded implementation seam still exists on the current tree.
3. If no real seam remains, close the lane as an explicit broader freeze / no-op result instead of inventing another extraction.
4. Keep the lane read-only except for docs/task/mirror updates required to register and close the reassessment.
5. Keep request/action dispatch, Telegram, Linear, oversight, and broader control-policy families out of scope unless new evidence proves otherwise.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- docs-review approval or explicit override

## Exit Conditions

- `go`: a concrete bounded implementation seam is identified with exact candidate files and a clear reason it is not a fake abstraction
- `no-go`: no truthful broader control-server lifecycle seam remains and the reassessment closes as an explicit freeze / stop signal
