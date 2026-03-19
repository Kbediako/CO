---
id: 20260312-1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction
title: Coordinator Symphony-Aligned Telegram Oversight Bridge Push-State Extraction
status: draft
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md
related_tasks:
  - tasks/tasks-1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Oversight Bridge Push-State Extraction

## Summary

Extract the remaining Telegram bridge push-state/cooldown persistence cluster from `telegramOversightBridge.ts` so the bridge shell keeps transport and mutation ownership while stateful projection gating moves behind one dedicated helper.

## Current State

After `1124`, `telegramOversightBridge.ts` is materially thinner, but it still owns:

1. `telegram-oversight-state.json` load/default parsing,
2. the `TelegramOversightBridgeState.push` bookkeeping lifecycle,
3. cooldown gating that decides whether a projection hash is sent immediately or persisted as pending,
4. persistence writes for those transitions.

These are cohesive with each other but separate from polling transport and separate from the read-side presenter/controller that now lives in `controlTelegramReadController.ts`.

## Symphony Alignment Note

Symphony keeps transport/controller shells thin and pushes stateful projection shaping into dedicated helpers instead of letting transport shells own multiple policy surfaces inline. CO should match that shape here while intentionally keeping pause/resume mutation authority in the bridge shell.

## Proposed Design

### 1. Extract one push-state helper

Introduce one control-local helper module near `telegramOversightBridge.ts` that owns:
- persisted Telegram oversight state load/default behavior,
- typed access/update of `last_sent_projection_hash`, `last_sent_at`, `last_event_seq`, `pending_projection_hash`, and `pending_projection_observed_at`,
- cooldown eligibility decisions for projection pushes,
- persistence writes for those state transitions.

### 2. Keep bridge shell authoritative

`telegramOversightBridge.ts` should continue to own:
- polling/update ingestion,
- `callTelegram(...)`, `sendMessage(...)`, and Bot API URL building,
- control mutation authority for `/pause` and `/resume`,
- invocation of the presenter/controller extracted in `1124`.

### 3. Preserve state schema and ordering

The extracted helper must preserve:
- existing persisted JSON field names,
- fallback defaults when state is missing or malformed,
- the current ordering/timing of pending-hash and last-sent hash updates.

## Files / Modules

- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- one new control-local helper near `orchestrator/src/cli/control/` for Telegram push state
- focused coverage under `orchestrator/tests/TelegramOversightBridge.test.ts`

## Risks

- Accidentally changing cooldown eligibility or pending-hash retention semantics.
- Accidentally moving transport concerns instead of just state policy.
- Altering persisted state schema or fallback defaults.

## Validation Plan

- Add focused Telegram regression coverage around the extracted push-state seam.
- Keep integrated bridge tests as the primary proof surface.
- Run the standard docs-first guard bundle before implementation.
