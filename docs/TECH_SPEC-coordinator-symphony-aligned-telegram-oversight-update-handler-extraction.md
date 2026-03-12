---
id: 20260313-1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction
title: Coordinator Symphony-Aligned Telegram Oversight Update Handler Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md
related_tasks:
  - tasks/tasks-1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Oversight Update Handler Extraction

## Summary

Extract the remaining update-local Telegram ingress shell from `telegramOversightBridge.ts` into one dedicated handler/controller so the bridge runtime keeps lifecycle/state ownership while message admission, normalization, routing, and reply dispatch move behind a bounded seam.

## Current State

After `1126`, `1127`, and `1138`, `telegramOversightBridge.ts` is materially thinner, but it still owns:

1. update-local `message.chat` admission and authorized-chat filtering,
2. plain-text `/help` guidance,
3. slash-command normalization,
4. read-controller dispatch,
5. mutating-controller fallback dispatch,
6. reply send-path invocation for one update.

These concerns are now cohesive with each other and can move without also moving poll-loop state progression.

## Symphony Alignment Note

Symphony’s direction is to keep runtime shells thin and isolate provider/operator protocol handling behind smaller controllers. CO should match that shape here while intentionally keeping stronger mutation authority, update-offset control, and bridge-state ownership in the runtime shell.

## Proposed Design

### 1. Extract one Telegram update handler/controller

Introduce one control-local helper near `telegramOversightBridge.ts` that owns:
- update-local message/chat admission,
- authorized-chat filtering,
- plain-text `/help` guidance,
- slash-command normalization,
- read-controller dispatch,
- mutating-controller fallback dispatch,
- reply send-path invocation for one update.

### 2. Keep bridge shell authoritative for lifecycle and state

`telegramOversightBridge.ts` should continue to own:
- poll-loop/update fetch sequencing,
- `next_update_id` progression and persistence,
- startup/shutdown,
- bot identity loading,
- push-state and projection-delta sequencing,
- raw Telegram update fetch orchestration.

### 3. Preserve controller composition

The extracted update handler must continue to delegate through:
- `ControlTelegramReadController` for `/start`, `/help`, `/status`, `/issue`, `/dispatch`, and `/questions`,
- `ControlTelegramCommandController` for `/pause` and `/resume`,
- the existing Telegram Bot API client send path for reply delivery.

## Files / Modules

- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- one new control-local Telegram update handler/controller/helper near `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/controlTelegramReadController.ts` (consumed, no redesign)
- `orchestrator/src/cli/control/controlTelegramCommandController.ts` (consumed, no redesign)
- `orchestrator/tests/TelegramOversightBridge.test.ts`
- optional focused unit coverage if the extracted handler needs its own dedicated test file

## Risks

- Scope creep into poll-loop lifecycle, `next_update_id` persistence, or push-state extraction.
- Accidentally moving read-side question sequencing or mutating transport semantics out of their existing controllers.
- Splitting reply ownership ambiguously between the bridge shell and the extracted handler.

## Validation Plan

- Keep integrated Telegram bridge tests as the primary proof surface for unchanged ingress behavior and offset progression.
- Add focused unit coverage only if the extracted update handler needs dedicated branch tests.
- Run the standard docs-first guard bundle before implementation.
