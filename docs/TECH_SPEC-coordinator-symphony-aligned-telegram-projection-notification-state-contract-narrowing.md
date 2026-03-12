---
id: 20260313-1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing
title: Coordinator Symphony-Aligned Telegram Projection Notification State Contract Narrowing
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md
related_tasks:
  - tasks/tasks-1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Projection Notification State Contract Narrowing

## Summary

Narrow the state contract of `controlTelegramProjectionNotificationController.ts` so the controller operates on a smaller push-state input/output or patch shape, while `telegramOversightBridge.ts` keeps full bridge-state assembly and persistence.

## Current State

After `1140`, the projection-notification controller is the right bounded seam, but it still:

1. accepts the full `TelegramOversightBridgeState`,
2. returns the full `TelegramOversightBridgeState`,
3. therefore still knows about `next_update_id` and other bridge-owned state shape it does not conceptually own.

The bridge still owns persistence and queueing, so this is now a contract-width problem rather than a branch-mixing problem.

## Proposed Design

### 1. Narrow the controller input

Replace the full-state input with the minimum data the controller actually needs for notification decisions, likely:
- the current push-state slice and/or a dedicated projection-notification state input,
- optional event sequence,
- rendered projection fingerprint/text dependencies injected separately.

### 2. Narrow the controller output

Return the minimum outcome needed for the bridge to update its owned state, likely:
- delivery outcome (`skip` / `pending` / `send`),
- next push-state or a small patch/result object,
- no full bridge-state return.

### 3. Keep bridge assembly authoritative

`telegramOversightBridge.ts` should remain the only place that:
- carries `next_update_id`,
- stamps any bridge-level metadata that remains runtime-owned,
- assembles the full `TelegramOversightBridgeState`,
- persists `telegram-oversight-state.json`.

## Risks

- Accidentally re-opening the already-extracted push-state policy seam.
- Widening the slice into another lifecycle refactor instead of a pure contract narrowing.
- Regressing dedupe/cooldown semantics while reshaping state input/output.

## Validation Plan

- Keep focused controller tests as the primary proof surface for contract narrowing.
- Keep integrated Telegram bridge push tests as the regression backstop.
- Run the standard docs-first guard bundle before implementation.
