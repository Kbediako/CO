# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Oversight State Store Extraction

## Objective

Thin the remaining Telegram bridge persistence shell by extracting the bridge-local state-store helper while preserving whole-state authority and interleaving guarantees in the runtime.

## Steps

1. Inspect the remaining inline persistence cluster in `telegramOversightBridge.ts`.
2. Introduce one dedicated state-store helper for path resolution, persisted-state reads/writes, and monotonic `updated_at` reconciliation.
3. Rewire `telegramOversightBridge.ts` to delegate only that persistence shell.
4. Add or refine focused bridge/state-store regressions so the interleaving guarantee remains pinned.
5. Run the standard validation lane and record the bounded closeout.

## Guardrails

- Do not reopen push-state policy already owned by `controlTelegramPushState.ts`.
- Do not move poll-loop, queue, Bot API, or controller ownership out of the bridge.
- Keep the slice bounded to the state-store shell only.
