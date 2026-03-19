---
id: 20260313-1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction
title: Coordinator Symphony-Aligned Telegram Projection Notification Controller Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md
related_tasks:
  - tasks/tasks-1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Projection Notification Controller Extraction

## Summary

Extract the remaining outbound Telegram projection-notification branch from `telegramOversightBridge.ts` into one dedicated controller/helper so the bridge runtime keeps lifecycle/queue ownership while projection rendering, transition evaluation, and send fan-out move behind a bounded seam.

## Current State

After `1125`, `1126`, `1127`, `1138`, and `1139`, `telegramOversightBridge.ts` is materially thinner, but it still owns:

1. projection rendering via `readController.renderProjectionDeltaMessage()`,
2. projection transition evaluation via `computeTelegramProjectionStateTransition(...)`,
3. `skip` / `pending` / `send` branching,
4. multi-chat send fan-out for projection updates,
5. next-state return/persist orchestration for one outbound projection update.

These concerns are cohesive with each other and can move without also moving queue ownership or poll/update lifecycle.

## Symphony Alignment Note

Symphony’s direction is to keep runtime shells thin and isolate provider/operator protocol handling behind smaller controllers. CO should match that shape here while intentionally keeping stronger queue ownership, update-offset control, and bridge-state ownership in the runtime shell.

## Proposed Design

### 1. Extract one Telegram projection-notification controller

Introduce one control-local helper near `telegramOversightBridge.ts` that owns:
- projection rendering for one push attempt,
- transition evaluation against the current bridge state,
- `skip` / `pending` / `send` outcome handling,
- multi-chat send fan-out for a `send` transition,
- returning the next bridge state for persistence.

### 2. Keep bridge shell authoritative for lifecycle and queue ownership

`telegramOversightBridge.ts` should continue to own:
- poll-loop/update fetch sequencing,
- `next_update_id` progression and persistence,
- startup/shutdown,
- bot identity loading,
- notification queue serialization and error logging,
- raw Telegram update fetch orchestration.

### 3. Preserve prior helper/controller boundaries

The extracted notification controller must continue to compose with:
- `ControlTelegramReadController` for projection presentation,
- `computeTelegramProjectionStateTransition(...)` from `controlTelegramPushState.ts` for push dedupe/cooldown policy,
- the existing Telegram Bot API client send path for outbound delivery.

## Files / Modules

- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- one new control-local Telegram projection-notification controller/helper near `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/controlTelegramReadController.ts` (consumed, no redesign)
- `orchestrator/src/cli/control/controlTelegramPushState.ts` (consumed, no redesign)
- `orchestrator/tests/TelegramOversightBridge.test.ts`
- optional focused unit coverage if the extracted controller needs its own dedicated test file

## Risks

- Scope creep into queue ownership, poll-loop lifecycle, or state persistence shelling.
- Accidentally re-opening push-state policy already extracted in `1125`.
- Splitting send/persist ownership ambiguously between the bridge shell and the extracted controller.

## Validation Plan

- Keep integrated Telegram bridge push tests as the primary proof surface for unchanged send/dedupe/cooldown behavior.
- Add focused unit coverage only if the extracted notification controller needs dedicated branch tests.
- Run the standard docs-first guard bundle before implementation.
