# 1140 Closeout Summary

- Status: completed
- Scope: extract the outbound Telegram projection-notification orchestration from `telegramOversightBridge.ts` into one dedicated controller while keeping queue ownership, persisted bridge-state ownership, startup/shutdown, and poll/update lifecycle in the bridge runtime.

## What shipped

- Added `orchestrator/src/cli/control/controlTelegramProjectionNotificationController.ts` for the bounded outbound projection-notification seam:
  - `notifyProjectionDelta(...)` now owns projection rendering, push-state transition evaluation, `skip` / `pending` / `send` branching, and multi-chat send fan-out.
  - The helper depends only on `renderProjectionDeltaMessage`, the push-state helper, the allowed-chat set, and the send-message function.
- Updated `orchestrator/src/cli/control/telegramOversightBridge.ts` to:
  - keep `pushEnabled` / `closed` gating and serialized `notificationQueue` ownership,
  - keep bridge-state ownership and persistence in the runtime shell,
  - delegate only the branch-local outbound notification orchestration through the extracted controller.
- Added `orchestrator/tests/ControlTelegramProjectionNotificationController.test.ts` for the extracted seam, including direct coverage for:
  - unchanged projection skip behavior,
  - cooldown/pending behavior,
  - eligible send fan-out to all allowed chats.

## Validation

- Deterministic guards passed through `pack:smoke`.
- Focused final-tree Telegram regressions passed: `2` files, `16` tests.
- Full suite passed on the final tree: `197` files, `1431` tests.
- Bounded review converged to a no-findings verdict on the final extraction.
- A bounded `gpt-5.4` scout also returned no findings and confirmed the seam remains truthful/minimal.
- Manual/mock seam evidence captured in `12-manual-telegram-projection-notification-check.md`.

## Overrides

- The pre-implementation `docs-review` attempt remained blocked at its own delegation guard, so the lane carries the already-recorded docs-review override from docs-first registration rather than a clean docs-review pass.
- `node scripts/delegation-guard.mjs` used the explicit override recorded for this local appserver posture.
- `node scripts/diff-budget.mjs` used the explicit stacked-branch override required by the long-lived Symphony-alignment branch baseline.
