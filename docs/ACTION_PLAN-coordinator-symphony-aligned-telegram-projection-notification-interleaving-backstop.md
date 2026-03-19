# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Projection Notification Interleaving Backstop

## Objective

Pin the post-1141 bridge interleaving semantics with a direct regression backstop, while avoiding another speculative Telegram refactor.

## Steps

1. Inspect the current `handleUpdates(...)` and `maybeSendProjectionDelta(...)` merge/persist paths in `telegramOversightBridge.ts`.
2. Identify the smallest test seam that can force the relevant ordering overlap.
3. Add one focused backstop proving preserved `next_update_id` and monotonic top-level `updated_at`.
4. Only if that backstop exposes a real defect, apply the smallest production fix and keep the scope bounded.
5. Re-run targeted Telegram regressions, then the full validation lane.

## Guardrails

- Prefer tests-only unless evidence shows a production defect.
- Do not reopen controller extraction or transport/lifecycle redesign.
- Keep the slice centered on bridge-owned merge/persist semantics only.
