---
id: 20260313-1143-coordinator-symphony-aligned-telegram-oversight-state-store-extraction
title: Coordinator Symphony-Aligned Telegram Oversight State Store Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-state-store-extraction.md
related_tasks:
  - tasks/tasks-1143-coordinator-symphony-aligned-telegram-oversight-state-store-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Oversight State Store Extraction

## Summary

Extract the remaining Telegram bridge persistence shell from `telegramOversightBridge.ts` into one dedicated helper that owns state-file path resolution, persisted-state reads/writes, and the monotonic top-level `updated_at` merge used when bridge-owned state patches are applied.

## Current State

After `1125`, `controlTelegramPushState.ts` already owns:

1. the persisted bridge-state shape,
2. default state construction,
3. push transition policy for `last_sent_*`, `pending_*`, and `last_event_seq`.

After `1141` and `1142`, the bridge also has a direct regression backstop for preserving `next_update_id` and keeping top-level `updated_at` monotonic under projection/update interleaving.

What still remains inline in `telegramOversightBridge.ts` is the bridge-local persistence shell:

1. the `telegram-oversight-state.json` file-name/path resolution,
2. persisted-state load at startup and persisted-state writes after state changes,
3. monotonic top-level `updated_at` reconciliation when applying projection state patches.

## Symphony Alignment Note

Symphony keeps long-lived runtime shells authoritative for sequencing and lifecycle, but pushes local persistence mechanics into dedicated helpers once the ownership boundary is well understood. CO should match that shape here while intentionally keeping runtime whole-state ownership in the bridge.

## Proposed Design

### 1. Add one Telegram state-store helper

Introduce one new control-local helper near `telegramOversightBridge.ts`, tentatively `telegramOversightBridgeStateStore.ts`, that owns:

- `telegram-oversight-state.json` path resolution from the run directory,
- load/save of `TelegramOversightBridgeState`,
- monotonic top-level `updated_at` reconciliation for bridge-applied state patches.

### 2. Keep the bridge authoritative

`telegramOversightBridge.ts` should continue to own:

- the in-memory `TelegramOversightBridgeState`,
- `next_update_id` advancement decisions,
- poll-loop sequencing and abort lifecycle,
- notification-queue ownership,
- Bot API client ownership,
- command/update controller ownership.

### 3. Preserve the persisted schema and interleaving guarantees

The extracted helper must preserve:

- the exact persisted JSON schema,
- default fallback behavior when the file is absent or malformed,
- monotonic `updated_at` semantics across overlapping write paths,
- no rollback of `next_update_id` through projection persistence.

## Files / Modules

- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- `orchestrator/src/cli/control/controlTelegramPushState.ts`
- one new control-local helper near `orchestrator/src/cli/control/` for Telegram oversight state-store persistence
- `orchestrator/tests/TelegramOversightBridge.test.ts`
- `orchestrator/tests/ControlTelegramPushState.test.ts`

## Risks

- Accidentally moving push-state policy back out of `controlTelegramPushState.ts`.
- Accidentally broadening the seam into queue, transport, or lifecycle extraction.
- Breaking the monotonic `updated_at` and `next_update_id` guarantees already pinned by `1142`.

## Validation Plan

- Add focused state-store helper coverage if the helper exposes a direct proof surface.
- Keep integrated `TelegramOversightBridge` regressions as the primary proof for preserved interleaving behavior.
- Run the standard docs/build/lint/test/review/pack lane on the final tree.
