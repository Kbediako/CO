# PRD - Coordinator Symphony-Aligned Telegram Oversight State Store Extraction

## Summary

After `1125` extracted push-state policy and `1142` pinned the bridge-owned interleaving semantics, the remaining inline Telegram bridge persistence shell is the state-store cluster: path resolution for `telegram-oversight-state.json`, persisted-state reads/writes, and the monotonic top-level `updated_at` merge used when projection patches land.

## Problem

`telegramOversightBridge.ts` is materially thinner than it was before the recent Telegram slices, but it still mixes runtime ownership with a narrow persistence shell:

- resolving the run-local state file path,
- loading and saving persisted Telegram bridge state,
- reconciling monotonic top-level `updated_at` when bridge-owned state patches are applied.

Those concerns are cohesive with each other, but they are not polling transport, command/update handling, queue ownership, or mutation authority. Leaving them inline keeps the bridge thicker than the current Symphony-aligned target.

## Goals

- Extract the bridge-local Telegram state-store/persistence shell into one dedicated helper.
- Keep `telegramOversightBridge.ts` authoritative for in-memory whole-state ownership, sequencing, queue ownership, and Bot API lifecycle.
- Preserve the persisted state schema and current interleaving guarantees exactly.
- Keep the slice bounded to state-store concerns only.

## Non-Goals

- No changes to polling cadence, loop ownership, or abort behavior.
- No changes to Telegram command/update routing.
- No changes to push dedupe/cooldown policy already owned by `controlTelegramPushState.ts`.
- No Linear or broader coordinator-surface work.

## Outcome

The Telegram bridge should keep a thinner Symphony-aligned runtime shell, while the remaining persistence mechanics live behind a small dedicated state-store helper that preserves CO’s stricter bridge authority model.
