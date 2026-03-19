# TECH_SPEC: Coordinator Symphony-Aligned Control Telegram Bridge Bootstrap Oversight Factory Extraction

## Context

After `1149` and `1150`, the remaining inline coordinator-owned wiring in this cluster is the bootstrap-local closure that assembles the Telegram oversight facade from `requestContextShared`, `getExpiryLifecycle()`, and `emitDispatchPilotAuditEvents`. That closure is still embedded directly in `controlTelegramBridgeBootstrapLifecycle.ts`, even though the surrounding read/update contracts are now neutralized.

## In Scope

- Add one adjacent helper/factory module under `orchestrator/src/cli/control/` for the lazy Telegram bootstrap oversight-facade assembly
- Rewire `controlTelegramBridgeBootstrapLifecycle.ts` to consume the extracted helper
- Preserve the existing lazy callback contract passed into `createControlTelegramBridgeLifecycle(...)`
- Keep focused bootstrap and adjacent lifecycle regressions green

## Out of Scope

- Telegram polling, projection delivery, or bridge runtime lifecycle behavior changes
- `ControlTelegramBridgeLifecycle` start/close sequencing changes
- Read-contract or update-contract ownership changes
- Broader `controlServer`, request-context, or bootstrap-assembly refactors
- New shared multi-channel factory abstractions

## Design

1. Add an adjacent helper module, expected to be `controlTelegramBridgeOversightFacadeFactory.ts`, that accepts the shared bootstrap inputs and returns the lazy `createOversightFacade` callback.
2. Keep `controlTelegramBridgeBootstrapLifecycle.ts` as a thin composition shell that wires:
   - run paths
   - generic control bootstrap lifecycle creation
   - Telegram bridge lifecycle creation
   - the extracted lazy oversight-factory callback
3. Preserve the current semantics:
   - no eager facade creation during bootstrap assembly
   - `getExpiryLifecycle()` is reread on each factory call
   - `emitDispatchPilotAuditEvents` continues to flow through unchanged
4. Keep the slice bounded below `controlServer.ts` and above Telegram runtime behavior.

## Validation

- Focused tests:
  - a focused helper test covering lazy facade creation plus per-call expiry lifecycle rereads
  - `orchestrator/tests/ControlTelegramBridgeBootstrapLifecycle.test.ts`
  - `orchestrator/tests/ControlTelegramBridgeLifecycle.test.ts`
  - `orchestrator/tests/ControlBootstrapAssembly.test.ts`
- `delegation-guard`
- `spec-guard`
- `build`
- `lint`
- `test`
- `docs:check`
- `docs:freshness`
- `diff-budget`
- `review`
- `pack:smoke`
