# TECH_SPEC: Coordinator Symphony-Aligned Delegation Server Remaining Wrapper-Surface Reassessment

## Context

Post-`1231`, the delegation-server subsystem is split across coherent nearby helper and host boundaries:

- `delegationServerTransport`
- `delegationServerToolDispatchShell`
- `delegationServerQuestionFlowShell`
- the host-owned handler/policy surfaces still in `delegationServer.ts`

The remaining question is no longer a local inline seam next to the freshly extracted helpers; it is whether the broader delegation-server wrapper surface still contains any truthful next implementation boundary at all.

## Requirements

1. Reinspect the remaining delegation-server wrapper subsystem across:
   - `orchestrator/src/cli/delegationServer.ts`
   - `orchestrator/src/cli/delegationServerTransport.ts`
   - `orchestrator/src/cli/delegationServerToolDispatchShell.ts`
   - `orchestrator/src/cli/delegationServerQuestionFlowShell.ts`
2. Confirm whether any concrete bounded implementation seam still exists on the current tree.
3. If no real seam remains, close the lane as an explicit broader freeze / no-op result instead of inventing another extraction.
4. Keep the lane read-only except for docs/task/mirror updates required to register and close the reassessment.
5. Do not reopen Telegram, Linear, doctor, diagnostics, or RLM surfaces unless new evidence proves they are the next truthful lane.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- docs-review approval or explicit override

## Exit Conditions

- `go`: a concrete bounded implementation seam is identified with exact candidate files and a clear reason it is not a fake abstraction
- `no-go`: no truthful broader delegation-server seam remains and the reassessment closes as an explicit freeze / stop signal
