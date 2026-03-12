---
id: 20260312-1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction
title: Coordinator Symphony-Aligned Telegram Control Action API Client Extraction
status: draft
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md
related_tasks:
  - tasks/tasks-1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Control Action API Client Extraction

## Summary

Extract the remaining control transport surface from `telegramOversightBridge.ts` so the bridge shell keeps command orchestration and mutation ownership while `/control/action` request/response handling moves behind one dedicated client seam.

## Current State

After `1124`, `1125`, and `1126`, `telegramOversightBridge.ts` is materially thinner, but it still owns:

1. Control auth header construction,
2. direct `POST /control/action`,
3. control-response parsing,
4. control error translation.

These concerns are cohesive with each other but separate from bridge sequencing and separate from the read-side, push-state, and Telegram Bot API surfaces already extracted.

## Symphony Alignment Note

Symphony’s direction is to keep runtime shells thin and isolate protocol-specific transport behind smaller adapters or clients. CO should match that shape here while intentionally keeping Telegram command routing and stricter mutation authority in the shell.

## Proposed Design

### 1. Extract one control action client

Introduce one control-local helper module near `telegramOversightBridge.ts` that owns:
- auth header construction for control POSTs,
- `POST /control/action`,
- response parsing,
- error translation for control transport failures.

### 2. Keep bridge shell authoritative

`telegramOversightBridge.ts` should continue to own:
- command routing and `/pause|/resume` selection,
- nonce and actor shaping,
- polling/update sequencing,
- update offset/state persistence,
- push-state transitions and projection delivery sequencing.

### 3. Preserve typed control contracts

The extracted client must preserve:
- existing auth header shape,
- existing `/control/action` payload transport,
- current control error messages consumed by Telegram command responses.

## Files / Modules

- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- one new control-local control-action client/helper near `orchestrator/src/cli/control/`
- focused coverage under `orchestrator/tests/TelegramOversightBridge.test.ts` or a new dedicated helper test file

## Risks

- Accidentally widening scope into command orchestration or nonce/actor shaping.
- Changing control transport error mapping.
- Moving too much of the runtime shell instead of only the control transport seam.

## Validation Plan

- Add focused coverage around the extracted control client seam.
- Keep integrated Telegram bridge mutation tests as the primary proof surface.
- Run the standard docs-first guard bundle before implementation.
