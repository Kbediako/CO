# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Oversight Polling Controller Extraction

## Objective

Thin the remaining Telegram oversight bridge control-path shell by extracting inbound polling/update-offset orchestration into one dedicated controller while preserving bridge-owned state authority.

## Steps

1. Inspect the remaining inline polling/update-offset cluster in `telegramOversightBridge.ts`.
2. Introduce one dedicated polling controller for loop orchestration, update handling flow, and offset persistence.
3. Rewire `telegramOversightBridge.ts` to compose that controller without moving whole-state ownership out of the bridge.
4. Add focused polling-controller regressions and keep integrated bridge regressions for pinned state guarantees.
5. Run the standard validation lane and record the bounded closeout.

## Guardrails

- Do not reopen config/env parsing.
- Do not change Bot API client or control-action client contracts.
- Do not move queue ownership, bot identity ownership, or read/command/push controller ownership out of the bridge.
- Keep the slice bounded to polling/update-offset orchestration only.
