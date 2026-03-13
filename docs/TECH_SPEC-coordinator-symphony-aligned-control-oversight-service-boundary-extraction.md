# TECH_SPEC: Coordinator Symphony-Aligned Control Oversight Service Boundary Extraction

## Context

The post-`1146` Telegram path already has thinner bridge-local helpers, but Telegram still depends on coordinator state through several separate seams:

- runtime subscription in `controlTelegramBridgeLifecycle.ts`
- bootstrap-side read assembly in `controlTelegramBridgeBootstrapLifecycle.ts`
- selected-run/dispatch/question read assembly in `controlTelegramReadAdapter.ts`, `controlTelegramDispatchRead.ts`, and `controlTelegramQuestionRead.ts`

That means the remaining structural seam is no longer a Telegram-only bridge helper. It is a coordinator-owned oversight boundary that packages the current Telegram consumer contract behind one facade.

## In Scope

- Introduce one coordinator-owned oversight facade under `orchestrator/src/cli/control/`
- Expose the current Telegram consumer contract only:
  - selected-run read
  - dispatch read
  - question read
  - projection/update subscription
- Rewire Telegram bootstrap/lifecycle to depend on that facade
- Keep focused coordinator plus Telegram regressions green

## Out of Scope

- Telegram polling/update-handler/state-store/queue internals
- Env/config parsing in `telegramOversightBridge.ts`
- Broader `controlServer` or runtime authority refactors
- New surface semantics for Linear, Discord, or future consumers
- New policy or command behavior

## Design

1. Introduce one control-oversight facade module that owns the current Telegram-facing coordinator contract.
2. The facade should compose existing implementations rather than replace them wholesale:
   - selected-run snapshot access from runtime
   - dispatch read path
   - question read path
   - projection/update subscription from runtime
3. Keep Telegram bridge/bootstrap modules as consumers of the facade, not owners of coordinator read/subscription assembly.
4. Preserve boundedness:
   - no widening to generic multi-channel abstractions beyond the current Telegram surface
   - no new authority ownership transfer away from coordinator/runtime

## Validation

- Focused coordinator and Telegram tests for the new facade and integrated bootstrap/lifecycle wiring
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
