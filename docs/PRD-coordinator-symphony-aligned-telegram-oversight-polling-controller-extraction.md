# PRD - Coordinator Symphony-Aligned Telegram Oversight Polling Controller Extraction

## Summary

After `1143` removed the remaining persisted-state shell, the largest unmatched Telegram responsibility still embedded in `telegramOversightBridge.ts` is the inbound polling/update-offset orchestration: the polling loop, `getUpdates` timeout/offset flow, per-update error isolation, and the final `next_update_id` persistence path.

## Problem

The Telegram oversight bridge now has dedicated seams for lifecycle, read rendering, command handling, update handling, projection-notification policy, persisted state storage, and transport clients. What still remains inline is the orchestration that repeatedly polls Telegram, routes updates through the handler, advances the update offset, and persists the resulting state.

Leaving that orchestration inside the bridge keeps the runtime shell thicker than the current Symphony-aligned target and makes the bridge own one last control-path concern that should be independently testable.

## Goals

- Extract the inbound Telegram polling/update-offset orchestration into one dedicated controller.
- Keep `telegramOversightBridge.ts` as a thin composition shell over the existing Telegram controllers/clients/helpers.
- Preserve the current `next_update_id` and monotonic `updated_at` guarantees exactly.
- Keep the slice bounded to polling/update-offset orchestration only.

## Non-Goals

- No config parsing or env-resolution changes.
- No Bot API client contract changes.
- No read, command, or push policy changes.
- No Linear/runtime/provider feature work.

## Outcome

The Telegram oversight bridge should become a thinner Symphony-aligned composition shell, while inbound polling/update-offset orchestration moves behind one explicit controller that still respects CO’s stricter bridge-owned state authority model.
