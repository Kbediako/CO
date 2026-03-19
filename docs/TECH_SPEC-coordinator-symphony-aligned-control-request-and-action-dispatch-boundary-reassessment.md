# TECH_SPEC: Coordinator Symphony-Aligned Control Request and Action Dispatch Boundary Reassessment

## Context

The control subsystem already has many extracted lifecycle and route helpers, but the request/action dispatch path remains a broader coordination boundary across controller and route layers.

## Requirements

1. Reinspect the control request/action dispatch family across:
   - `orchestrator/src/cli/control/controlRequestController.ts`
   - `orchestrator/src/cli/control/controlRequestRouteDispatch.ts`
   - `orchestrator/src/cli/control/controlActionController.ts`
   - adjacent request/authenticated-route and action-sequencing helpers they coordinate
2. Confirm whether any concrete bounded implementation seam still exists on the current tree.
3. If no real seam remains, close the lane as an explicit broader freeze / no-op result instead of inventing another extraction.
4. Keep the lane read-only except for docs/task/mirror updates required to register and close the reassessment.
5. Keep Telegram, Linear, oversight, and bootstrap/startup families out of scope unless new evidence proves they are the next truthful lane.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- docs-review approval or explicit override

## Exit Conditions

- `go`: a concrete bounded implementation seam is identified with exact candidate files and a clear reason it is not a fake abstraction
- `no-go`: no truthful broader control request/action dispatch seam remains and the reassessment closes as an explicit freeze / stop signal
