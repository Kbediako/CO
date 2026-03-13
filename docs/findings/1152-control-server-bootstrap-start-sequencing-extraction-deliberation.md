# 1152 Deliberation - Control Server Bootstrap Start Sequencing Extraction

## Why this seam is next

- `1151` brought `controlTelegramBridgeBootstrapLifecycle.ts` down to a thin Telegram-specific adapter.
- The remaining real behavior in this cluster is now generic bootstrap sequencing inside `ControlServerBootstrapLifecycleRuntime.start()`.
- Cutting further inside the Telegram bootstrap wrapper would be policy-free churn rather than a truthful Symphony-aligned seam.

## Bounded target

- Primary file: `orchestrator/src/cli/control/controlServerBootstrapLifecycle.ts`
- Primary behavior: `persistControlBootstrapMetadata(...) -> startExpiryLifecycle() -> best-effort telegramBridgeLifecycle.start(...)`

## Constraints

- Preserve metadata persistence before any runtime startup
- Preserve expiry lifecycle startup before Telegram bridge startup
- Preserve non-fatal Telegram bridge startup failure handling and existing warning surface
- Keep `close()` ownership and the generic bootstrap lifecycle contract unchanged

## Validation focus

- `orchestrator/tests/ControlServerBootstrapLifecycle.test.ts`
- Adjacent constructor/wiring tests only if type or constructor surfaces move

## Decision

Proceed with a docs-first slice named `1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction`.
