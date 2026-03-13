# TECH_SPEC: Coordinator Symphony-Aligned Control Server Bootstrap Start Sequencing Extraction

## Context

After `1151`, `controlTelegramBridgeBootstrapLifecycle.ts` is already close to its floor. The remaining meaningful behavior in this cluster is the generic bootstrap lifecycle start sequence inside `controlServerBootstrapLifecycle.ts`: persist control bootstrap metadata, start expiry lifecycle, then attempt Telegram bridge startup while swallowing startup failures into a warning.

## In Scope

- Add one adjacent helper module under `orchestrator/src/cli/control/` for bootstrap start sequencing
- Rewire `controlServerBootstrapLifecycle.ts` to delegate the ordered start flow to the helper
- Preserve the existing bootstrap lifecycle API and warn-and-continue Telegram bridge startup policy
- Keep focused bootstrap lifecycle regressions green

## Out of Scope

- Telegram-local helper extractions beneath `controlTelegramBridgeBootstrapLifecycle.ts`
- Bootstrap metadata schema or persistence path changes
- Expiry lifecycle logic changes
- Telegram bridge runtime lifecycle, polling, or projection delivery changes
- Broader startup-shell or `controlBootstrapAssembly.ts` refactors

## Design

1. Add an adjacent helper module, expected to be `controlServerBootstrapStartSequence.ts`, that accepts:
   - bootstrap paths plus `persistControl`
   - `startExpiryLifecycle`
   - optional Telegram bridge lifecycle
   - startup inputs (`baseUrl`, `controlToken`)
2. Keep `controlServerBootstrapLifecycle.ts` as the generic lifecycle owner that:
   - constructs the runtime
   - delegates `start(...)` to the helper
   - keeps `close()` ownership unchanged
3. Preserve the current runtime semantics exactly:
   - bootstrap metadata persistence must happen before expiry or bridge startup
   - expiry lifecycle start must happen before Telegram bridge startup
   - Telegram bridge startup failure must stay non-fatal and keep the existing warning surface
4. Avoid touching `controlBootstrapAssembly.ts` unless a type-level wiring change is strictly required.

## Validation

- Focused tests:
  - `orchestrator/tests/ControlServerBootstrapLifecycle.test.ts`
  - adjacent constructor/wiring checks only if needed:
    - `orchestrator/tests/ControlTelegramBridgeBootstrapLifecycle.test.ts`
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
