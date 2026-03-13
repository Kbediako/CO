# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Oversight Runtime Lifecycle Shell Extraction

## Objective

Thin the remaining Telegram oversight bridge lifecycle shell by extracting startup/shutdown choreography into one dedicated helper while preserving bridge-owned state authority and notification ordering.

## Steps

1. Confirm the remaining inline seam in `telegramOversightBridge.ts` is limited to startup/shutdown lifecycle choreography.
2. Introduce one dedicated lifecycle helper for persisted-state bootstrap, bot identity fetch, polling-controller start/abort wiring, and shutdown ordering.
3. Rewire `telegramOversightBridge.ts` to compose that helper without moving whole-state ownership or notification-queue ownership out of the bridge.
4. Add focused lifecycle regressions and keep integrated bridge regressions for authoritative state and shutdown guarantees.
5. Run the standard validation lane and record the bounded closeout.

## Guardrails

- Do not reopen config/env parsing.
- Do not change polling-controller behavior.
- Do not move read, command, or push policy ownership.
- Keep the slice bounded to startup/shutdown lifecycle choreography only.
