# 1141 Closeout Summary

- Status: completed
- Scope: narrow the extracted Telegram projection-notification controller contract so it stops accepting and returning the full bridge state while leaving whole-state assembly, persistence, queue ownership, and `next_update_id` ownership in `telegramOversightBridge.ts`.

## What shipped

- Narrowed `orchestrator/src/cli/control/controlTelegramProjectionNotificationController.ts`:
  - `notifyProjectionDelta(...)` now accepts only `pushState`,
  - the controller returns a bridge-applied `statePatch` instead of a full `TelegramOversightBridgeState`,
  - the helper remains limited to projection rendering, skip/pending/send branching, and multi-chat send fan-out.
- Narrowed `orchestrator/src/cli/control/controlTelegramPushState.ts`:
  - `computeTelegramProjectionStateTransition(...)` now consumes only the Telegram push-state slice,
  - the transition returns a small `{ updated_at, push }` patch rather than a full bridge-state object.
- Updated `orchestrator/src/cli/control/telegramOversightBridge.ts` to:
  - keep full-state ownership and persistence in the bridge runtime,
  - merge the returned push patch back into the live bridge state,
  - preserve `next_update_id`,
  - keep bridge-level `updated_at` monotonic via bridge-side merge semantics.
- Expanded focused regression coverage:
  - direct controller/state tests now assert the narrowed patch contract,
  - repeated pending hashes preserve the original pending-observed timestamp,
  - integrated bridge push tests seed non-zero `next_update_id` and prove it survives both send and cooldown/flush paths.

## Validation

- Deterministic guards passed through `pack:smoke`.
- Focused final-tree Telegram regressions passed: `3` files, `20` tests.
- Full suite passed on the final tree: `197` files, `1432` tests.
- Bounded `npm run review` converged to a no-findings verdict on the final diff.
- A bounded `gpt-5.4` review/elegance pass also returned no findings and confirmed the slice remains minimal.
- Manual/mock state-contract evidence captured in `12-manual-telegram-state-contract-check.md`.
- Post-sync docs checks and task/.agent mirror parity passed.

## Overrides

- The pre-implementation `docs-review` attempt remained blocked at its own delegation guard, so the lane carries the already-recorded docs-review override from docs-first registration rather than a clean docs-review pass.
- `node scripts/delegation-guard.mjs` used the explicit override recorded for this local appserver posture.
- `node scripts/diff-budget.mjs` used the explicit stacked-branch override required by the long-lived Symphony-alignment branch baseline.
