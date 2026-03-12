# 1139 Closeout Summary

- Status: completed
- Scope: extract the Telegram update-local ingress shell from `telegramOversightBridge.ts` into one dedicated helper while keeping poll/update lifecycle, `next_update_id` persistence, bot identity startup, and push-state ownership in the bridge runtime.

## What shipped

- Added `orchestrator/src/cli/control/controlTelegramUpdateHandler.ts` for the bounded update-local ingress seam:
  - `handleUpdate(...)` now owns message/chat admission, authorized-chat filtering, plain-text `/help` guidance, slash-command normalization, read routing, mutating fallback routing, and reply send-path invocation.
  - The helper keeps the extracted logic narrow by depending only on the existing read controller, mutating controller, allowed-chat set, and send-message function.
- Updated `orchestrator/src/cli/control/telegramOversightBridge.ts` to:
  - keep polling, startup/shutdown, `next_update_id` persistence, bot identity bootstrap, and projection-push ownership in the bridge runtime,
  - instantiate the new update handler once in the constructor,
  - delegate only the update-local `handleUpdate(...)` shell through the extracted helper.
- Added `orchestrator/tests/ControlTelegramUpdateHandler.test.ts` for the extracted seam, including direct coverage for:
  - updates without a chat payload,
  - unauthorized chats,
  - plain-text help guidance,
  - bot-targeted read-command normalization,
  - mutating fallback routing,
  - unknown-command fallback.

## Validation

- Deterministic guards passed through `pack:smoke`.
- Focused final-tree Telegram regressions passed: `3` files, `23` tests.
- Full suite passed on the final tree: `196` files, `1428` tests.
- Bounded review converged to a no-findings verdict on the final extraction.
- A bounded `gpt-5.4` scout also returned no findings and confirmed the seam is truthful/minimal.
- Manual/mock seam evidence captured in `12-manual-telegram-update-handler-check.md`.

## Overrides

- The pre-implementation `docs-review` attempt remained blocked at its own delegation guard, so the lane carries the already-recorded docs-review override from docs-first registration rather than a clean docs-review pass.
- `node scripts/delegation-guard.mjs` used the explicit override recorded for this local appserver posture.
- `node scripts/diff-budget.mjs` used the explicit stacked-branch override required by the long-lived Symphony-alignment branch baseline.
