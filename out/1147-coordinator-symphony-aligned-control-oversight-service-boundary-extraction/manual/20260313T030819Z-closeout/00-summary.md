# 1147 Closeout Summary

- Status: completed
- Scope: added a coordinator-owned oversight facade for the current Telegram consumer contract and rewired Telegram bootstrap/lifecycle onto that shared boundary without reopening Telegram polling, state-store, config, or authority surfaces.

## Shipped seam

- New facade: `orchestrator/src/cli/control/controlOversightFacade.ts`
- Lifecycle wiring: `orchestrator/src/cli/control/controlTelegramBridgeLifecycle.ts`
- Bootstrap wiring: `orchestrator/src/cli/control/controlTelegramBridgeBootstrapLifecycle.ts`
- Focused coverage: `orchestrator/tests/ControlOversightFacade.test.ts`, `orchestrator/tests/ControlTelegramBridgeLifecycle.test.ts`, `orchestrator/tests/ControlTelegramBridgeBootstrapLifecycle.test.ts`

## Validation

- `delegation-guard`, `spec-guard`, `build`, `lint`, `docs:check`, `docs:freshness`, `diff-budget` (with explicit stacked-branch override), bounded `review`, and `pack:smoke` passed.
- Focused final-tree regressions passed `4` files and `7` tests.
- Manual/mock runtime evidence confirmed the same facade instance flows into bridge startup and subscription, forwarded updates preserve `{ eventSeq, source }`, and unsubscribe happens before close.
- The full suite reached the recurring quiet-tail after visible progress in `tests/cli-orchestrator.spec.ts` and `tests/run-review.spec.ts`; that lane is carried as an explicit override instead of a false green.

## Outcome

- Telegram bootstrap and lifecycle now depend on one coordinator-owned oversight boundary instead of stitching runtime subscription and Telegram read assembly separately.
- The facade stays intentionally thin: it composes the existing read adapter and runtime subscription rather than introducing a second ownership layer.
- The new boundary is broader than a Telegram-only helper but still narrow enough to avoid reopening control authority, polling, env/config parsing, or state-store internals.
