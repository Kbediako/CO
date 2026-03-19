# TECH_SPEC: Coordinator Symphony-Aligned Control Bootstrap And Telegram Oversight Contract Reassessment

## Context

The control-server lifecycle shell is now frozen after `1235`, but the bootstrap and Telegram oversight contract still spans metadata persistence, expiry startup, lazy oversight-facade wiring, best-effort bridge activation, and serialized bridge replacement and close behavior.

## Requirements

1. Reinspect the broader bootstrap and Telegram oversight contract across:
   - `orchestrator/src/cli/control/controlServerBootstrapLifecycle.ts`
   - `orchestrator/src/cli/control/controlTelegramBridgeLifecycle.ts`
   - `orchestrator/src/cli/control/controlServerBootstrapStartSequence.ts`
   - `orchestrator/src/cli/control/controlTelegramBridgeBootstrapLifecycle.ts`
   - adjacent focused tests for bootstrap sequencing and bridge lifecycle replacement
2. Confirm whether any concrete bounded implementation seam still exists on the current tree.
3. If no real seam remains, close the lane as an explicit broader freeze / no-op result instead of inventing another extraction.
4. Keep the lane read-only except for docs, task, and mirror updates required to register and close the reassessment.
5. Keep request/action dispatch, broader oversight projection policy, Linear, and control seed-loading families out of scope unless new evidence proves they are the next truthful lane.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- docs-review approval or explicit override

## Exit Conditions

- `go`: a concrete bounded implementation seam is identified with exact candidate files and a clear reason it is not a fake abstraction
- `no-go`: no truthful broader bootstrap and Telegram oversight seam remains and the reassessment closes as an explicit freeze / stop signal
