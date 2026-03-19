---
id: 20260312-1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction
title: Coordinator Symphony-Aligned Telegram Bot API Client Extraction
status: draft
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md
related_tasks:
  - tasks/tasks-1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Bot API Client Extraction

## Summary

Extract the remaining Telegram provider-transport surface from `telegramOversightBridge.ts` so the bridge shell keeps orchestration and mutation ownership while Bot API request/response handling moves behind one dedicated client seam.

## Current State

After `1124` and `1125`, `telegramOversightBridge.ts` is materially thinner, but it still owns:

1. Telegram Bot API URL construction,
2. `getMe` startup identity fetch,
3. `getUpdates` query construction and response parsing,
4. `sendMessage` request/response validation,
5. Telegram envelope error mapping.

These concerns are cohesive with each other but separate from bridge sequencing and separate from the read-side/push-state surfaces already extracted.

## Symphony Alignment Note

Symphony’s direction is to keep runtime shells thin and isolate provider-coupled transport behind smaller adapters or clients. CO should match that shape here while intentionally keeping bridge sequencing and `/pause|/resume` control authority in the shell.

## Proposed Design

### 1. Extract one Telegram Bot API client

Introduce one control-local helper module near `telegramOversightBridge.ts` that owns:
- Bot API URL construction,
- `getMe` request/response handling,
- `getUpdates` request shaping and response parsing,
- `sendMessage` request/response validation,
- Telegram envelope error mapping.

### 2. Keep bridge shell authoritative

`telegramOversightBridge.ts` should continue to own:
- poll-loop sequencing and retry timing,
- update offset/state persistence,
- update dispatch and command routing,
- `/pause` / `/resume` mutation authority,
- push-state transitions and projection delivery sequencing.

### 3. Preserve typed payload contracts

The extracted client must preserve:
- existing Telegram envelope validation semantics,
- query parameters for `getUpdates`,
- request body shape for `sendMessage`,
- startup identity loading behavior used by bridge initialization.

## Files / Modules

- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- one new control-local Telegram API client/helper near `orchestrator/src/cli/control/`
- focused coverage under `orchestrator/tests/TelegramOversightBridge.test.ts` or a new dedicated helper test file

## Risks

- Accidentally widening scope into sequencing or mutation authority.
- Changing Telegram request shapes or error handling.
- Moving too much of the runtime shell instead of only provider transport.

## Validation Plan

- Add focused coverage around the extracted Telegram Bot API client seam.
- Keep integrated bridge tests as the primary proof surface.
- Run the standard docs-first guard bundle before implementation.
