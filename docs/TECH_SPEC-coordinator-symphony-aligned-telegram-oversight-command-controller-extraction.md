---
id: 20260313-1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction
title: Coordinator Symphony-Aligned Telegram Oversight Command Controller Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md
related_tasks:
  - tasks/tasks-1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Oversight Command Controller Extraction

## Summary

Extract the remaining mutating Telegram operator branch from `telegramOversightBridge.ts` into one dedicated controller so the bridge shell keeps lifecycle/runtime ownership while `/pause` and `/resume` request shaping and reply generation move behind a bounded seam.

## Current State

After `1124`, `1125`, `1126`, and `1127`, `telegramOversightBridge.ts` is materially thinner, but it still owns:

1. command admission for incoming Telegram updates,
2. command routing for `/help`, `/status`, `/issue`, `/dispatch`, `/questions`, `/pause`, and `/resume`,
3. reply generation and send-path orchestration,
4. mutating command invocation through the extracted `/control/action` client.

The truthful remaining extraction seam is narrower than the whole command cluster: read routing and update admission stay coupled to offset/lifecycle ownership, while the mutating `/pause` and `/resume` request/reply branch is the part that can move cleanly.

## Symphony Alignment Note

Symphony’s direction is to keep runtime shells thin and isolate operator or provider protocol behavior behind smaller adapters/controllers. CO should match that shape here while intentionally keeping stronger mutation authority and `/control/action` transport hardening intact.

## Proposed Design

### 1. Extract one Telegram mutating command controller

Introduce one control-local helper near `telegramOversightBridge.ts` that owns:
- `/pause` and `/resume` request shaping,
- mutating reply generation,
- mutating command delegation to the existing `/control/action` client,
- any tiny local helpers required only by the mutating branch.

### 2. Keep bridge shell authoritative for runtime lifecycle

`telegramOversightBridge.ts` should continue to own:
- command admission,
- slash-command normalization,
- non-mutating read dispatch through the existing read controller,
- polling/update loop lifecycle,
- update offset persistence,
- startup/shutdown,
- bridge config parsing,
- push-state and projection-delta sequencing,
- raw Telegram update fetch orchestration.

### 3. Preserve existing mutation transport

The extracted controller must preserve:
- `/pause` and `/resume` behavior through the existing `telegramOversightControlActionApiClient`,
- current nonce/actor/transport fields,
- existing mutation/error reply behavior exposed to Telegram users.

## Files / Modules

- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- one new control-local Telegram command controller/helper near `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/telegramOversightControlActionApiClient.ts` (interface-lift only if required)
- `orchestrator/tests/TelegramOversightBridge.test.ts`
- optional focused unit coverage if the extracted controller needs its own dedicated test file

## Risks

- Scope creep into read routing, question sequencing, polling/update lifecycle, or push-state extraction.
- Accidentally bypassing `/control/action` transport hardening for mutating commands.
- Splitting reply ownership ambiguously between the bridge shell and the extracted controller.

## Validation Plan

- Keep integrated Telegram bridge tests as the primary proof surface for read routing, offset progression, and mutating-command wiring.
- Add focused unit coverage only if the extracted controller needs dedicated command-branch tests.
- Run the standard docs-first guard bundle before implementation.
