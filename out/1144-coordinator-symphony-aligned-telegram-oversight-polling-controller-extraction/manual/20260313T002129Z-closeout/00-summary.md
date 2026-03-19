# 1144 Closeout Summary

- Status: completed
- Scope: extracted the remaining inbound Telegram polling/update-offset orchestration from `telegramOversightBridge.ts` into `controlTelegramPollingController.ts` while keeping bridge-owned state authority, queue lifecycle, bot identity lifecycle, and controller/API-client composition unchanged.

## Shipped seam

- New controller: `orchestrator/src/cli/control/controlTelegramPollingController.ts`
- Bridge shell remains in: `orchestrator/src/cli/control/telegramOversightBridge.ts`
- Focused controller coverage: `orchestrator/tests/ControlTelegramPollingController.test.ts`
- Integrated bridge coverage: `orchestrator/tests/TelegramOversightBridge.test.ts`

## Validation

- `delegation-guard`, `spec-guard`, `build`, `lint`, `docs:check`, `docs:freshness`, and `pack:smoke` passed.
- Focused Telegram regressions passed `2` files and `17` tests.
- The task-scoped delegated scout completed successfully through `delegation-guard`, `build`, `lint`, `test`, and `spec-guard` during the docs-first package.
- The remaining non-green signals are explicit overrides, not correctness findings:
  - `npm run test` hit the recurring quiet tail after the final visible `tests/cli-orchestrator.spec.ts` case on both pipe and TTY reruns.
  - `npm run review` inspected the bounded diff, then drifted into speculative broader inspection instead of converging to a narrow verdict.

## Outcome

- The new controller owns the poll loop, `getUpdates` timeout/offset flow, per-update error isolation, and callback-driven `next_update_id` advancement.
- The bridge still owns in-memory whole-state sequencing and performs the final persisted-state write through explicit callbacks, which keeps the lane aligned with the existing harder CO authority model.
- Delegated seam review returned no bounded correctness finding and specifically warned against over-moving whole-state ownership into the controller; the final implementation keeps that boundary intact.
