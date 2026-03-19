---
id: 20260313-1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction
title: Coordinator Symphony-Aligned Telegram Oversight Polling Controller Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md
related_tasks:
  - tasks/tasks-1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Oversight Polling Controller Extraction

## Summary

Extract the remaining inbound Telegram polling/update-offset orchestration from `telegramOversightBridge.ts` into one dedicated controller while keeping bridge-owned state authority, lifecycle ownership, and existing controller/client seams intact.

## Current State

After `1138`, `1139`, `1141`, `1142`, and `1143`, the Telegram oversight surface already has dedicated seams for:

1. lifecycle wiring,
2. read rendering,
3. command handling,
4. update handling,
5. projection-notification policy,
6. persisted state storage,
7. Bot API and control-action clients.

What still remains inline in `telegramOversightBridge.ts` is the inbound polling/update-offset cluster:

1. the `pollLoop()` orchestration,
2. `getUpdates` timeout/offset coordination,
3. per-update error isolation while the loop continues,
4. `next_update_id` advancement and persistence after processed updates.

## Symphony Alignment Note

Symphony-style runtime shells are thinnest when transport/controller orchestration lives behind explicit controllers and the top-level runtime focuses on composition plus authority boundaries. CO should continue in that direction here while intentionally keeping whole-state ownership in the bridge runtime.

## Proposed Design

### 1. Add one polling controller

Introduce `controlTelegramPollingController.ts` near the existing Telegram control helpers. It should own:

- the repeated polling loop,
- the `getUpdates` call shape and timeout/offset flow,
- per-update try/catch isolation,
- the decision path that advances and persists `next_update_id` after successfully observed updates.

### 2. Keep bridge-owned authority intact

`telegramOversightBridge.ts` should continue to own:

- the in-memory `TelegramOversightBridgeState`,
- whether the runtime is closed,
- notification-queue ownership,
- Bot identity lifecycle,
- command/update/push controller composition,
- the final composition of the polling controller dependencies.

### 3. Reuse existing state helpers

The polling controller should consume the existing state helpers introduced by `1143` instead of reopening persistence design:

- persisted-state load/save stays in `telegramOversightBridgeStateStore.ts`,
- monotonic top-level `updated_at` reconciliation stays in the same helper module,
- the bridge remains the authoritative holder of the current state object.

## Files / Modules

- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- one new polling controller near `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/telegramOversightBridgeStateStore.ts`
- `orchestrator/tests/TelegramOversightBridge.test.ts`
- one new focused polling-controller test near `orchestrator/tests/`

## Risks

- Accidentally broadening the seam into config parsing or bridge lifecycle extraction.
- Accidentally moving whole-state ownership or queue ownership out of the bridge.
- Breaking the pinned `next_update_id` / monotonic `updated_at` guarantees while moving offset-persistence orchestration.

## Validation Plan

- Add focused polling-controller coverage for update-offset orchestration and error isolation.
- Keep integrated `TelegramOversightBridge` regressions for bridge-owned state/persistence guarantees.
- Run the standard docs/build/lint/test/review/pack lane on the final tree.
