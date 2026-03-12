# 1138 Closeout Summary

- Status: completed
- Scope: extract only the Telegram mutating `/pause` and `/resume` operator branch from `telegramOversightBridge.ts` into a dedicated controller while keeping chat admission, slash-command normalization, read routing, polling/update lifecycle, push-state ownership, and `/control/action` transport hardening in place.

## What shipped

- Added `orchestrator/src/cli/control/controlTelegramCommandController.ts` for the operator-only mutating seam:
  - `dispatchMutatingCommand(...)` now owns only `/pause` and `/resume`,
  - non-mutating commands now return `null` so the bridge keeps read routing and fallback ownership,
  - the existing nonce, actor, transport principal, and traceability reply shaping remain unchanged.
- Updated `orchestrator/src/cli/control/telegramOversightBridge.ts` to:
  - keep message/chat admission, authorized-chat filtering, plain-text `/help` guidance, slash-command normalization, read-controller dispatch, and unknown-command fallback in the bridge shell,
  - delegate only the mutating `/pause` and `/resume` branch through the extracted controller,
  - keep polling/update sequencing, `next_update_id` persistence, startup/shutdown, and push-state delivery unchanged.
- Added `orchestrator/tests/ControlTelegramCommandController.test.ts` for the extracted mutating seam, including direct coverage for:
  - non-mutating `null` passthrough,
  - disabled mutation posture,
  - preserved `/control/action` transport fields,
  - actor fallback plus payload-error reply shaping.
- Narrowed the `1138` docs package so the task/spec/PRD/TECH_SPEC/ACTION_PLAN match the truthful operator-only seam instead of the earlier over-broad command-cluster wording.

## Validation

- Deterministic guards passed through `pack:smoke`.
- Focused final-tree Telegram regressions passed: `2` files, `17` tests.
- Full suite passed on the final tree: `195` files, `1422` tests.
- Bounded review converged to a no-findings verdict on the final extraction.
- A bounded `gpt-5.4` scout confirmed the narrowed seam is now operator-only and read routing remains in the bridge.
- Manual/mock seam evidence captured in `12-manual-telegram-command-controller-check.md`.

## Overrides

- The pre-implementation `docs-review` attempt remained blocked at its own delegation guard, so the lane carries the already-recorded docs-review override from docs-first registration rather than a clean docs-review pass.
- `node scripts/delegation-guard.mjs` used the explicit override recorded for this local appserver posture.
- `node scripts/diff-budget.mjs` used the explicit stacked-branch override required by the long-lived Symphony-alignment branch baseline.
