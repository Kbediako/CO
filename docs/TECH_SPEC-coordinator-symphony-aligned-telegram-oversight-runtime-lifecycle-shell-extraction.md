---
id: 20260313-1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction
title: Coordinator Symphony-Aligned Telegram Oversight Runtime Lifecycle Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md
related_tasks:
  - tasks/tasks-1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Oversight Runtime Lifecycle Shell Extraction

## Summary

Extract the remaining startup/shutdown lifecycle choreography from `telegramOversightBridge.ts` after `1144` while keeping bridge-owned state authority and the existing controller/client seams intact.

## Current State

After `1138`, `1139`, `1140`, `1143`, and `1144`, the Telegram oversight surface already has dedicated seams for:

1. operator-only oversight commands,
2. update-local command/update dispatch,
3. projection-notification policy,
4. persisted state storage and monotonic `updated_at` reconciliation,
5. Bot API and control-action clients,
6. inbound polling/update-offset orchestration.

What still remains inline in `telegramOversightBridge.ts` is the runtime lifecycle cluster:

1. persisted-state bootstrap before polling begins,
2. `getMe()` bot identity fetch and startup logging,
3. polling-controller start wiring and loop ownership,
4. abort / loop-await / projection-notification shutdown ordering during close.

## Symphony Alignment Note

Symphony-style runtime shells are thinnest when startup/shutdown choreography lives behind explicit helpers and the top-level runtime focuses on composition plus authority boundaries. CO should continue in that direction here while intentionally keeping whole-state ownership in the bridge runtime.

## Proposed Design

### 1. Add one lifecycle helper

Introduce one Telegram lifecycle helper near the existing control helpers. It should own:

- persisted-state bootstrap for the bridge runtime,
- bot identity fetch plus startup log shaping,
- polling-controller start wiring,
- shutdown ordering across abort, loop await, and projection-notification queue close.

### 2. Keep bridge-owned authority intact

`telegramOversightBridge.ts` should continue to own:

- the in-memory `TelegramOversightBridgeState`,
- `next_update_id` and the authoritative current state object,
- notification queue ownership,
- bot identity as bridge state,
- command/update/push controller composition,
- final composition of the lifecycle helper dependencies.

### 3. Reuse existing extracted seams

The lifecycle helper should compose the existing extracted seams rather than reopening them:

- persisted-state reads/writes stay in `telegramOversightBridgeStateStore.ts`,
- polling behavior stays in `controlTelegramPollingController.ts`,
- update dispatch stays in `controlTelegramUpdateHandler.ts`,
- push policy stays in `controlTelegramProjectionNotificationController.ts`,
- transport stays in `telegramOversightApiClient.ts`.

## Files / Modules

- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- one new lifecycle helper near `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/controlTelegramPollingController.ts`
- `orchestrator/src/cli/control/telegramOversightBridgeStateStore.ts`
- `orchestrator/tests/TelegramOversightBridge.test.ts`
- one new focused lifecycle test near `orchestrator/tests/`

## Risks

- Accidentally broadening the seam into config parsing or unrelated controller policy.
- Accidentally moving whole-state ownership or notification-queue ownership out of the bridge.
- Breaking startup or shutdown ordering while moving the lifecycle choreography out of `telegramOversightBridge.ts`.

## Validation Plan

- Add focused lifecycle coverage for bootstrap ordering and shutdown sequencing.
- Keep integrated `TelegramOversightBridge` regressions for bridge-owned state/queue guarantees.
- Run the standard docs/build/lint/test/review/pack lane on the final tree.
