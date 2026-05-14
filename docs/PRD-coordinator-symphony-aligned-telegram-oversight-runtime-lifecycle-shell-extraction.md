# PRD - Coordinator Symphony-Aligned Telegram Oversight Runtime Lifecycle Shell Extraction

## Summary

After `1144` removed the inbound polling/update-offset orchestration, the largest unmatched Telegram responsibility still embedded in `telegramOversightBridge.ts` is the runtime lifecycle shell: persisted-state bootstrap, bot identity fetch, polling-controller start/abort wiring, and shutdown ordering against the projection notification queue.

## Problem

The Telegram oversight bridge now already delegates update handling, command handling, push policy, state storage, transport, and inbound polling orchestration through dedicated helpers. What still remains inline is the startup/shutdown choreography that loads persisted state, verifies bot identity, launches the polling controller, and tears the runtime down in the correct order.

Leaving that lifecycle shell inline keeps the bridge thicker than the current Symphony-aligned target and makes the runtime entrypoint own one last cross-cutting coordination cluster that should be independently testable.

## Goals

- Extract the remaining Telegram runtime lifecycle shell into one dedicated helper.
- Keep `telegramOversightBridge.ts` as the public composition entrypoint over the existing Telegram controllers/clients/helpers.
- Preserve bridge-owned whole-state authority, `next_update_id` ownership, and projection notification ordering exactly.
- Keep the slice bounded to startup/shutdown lifecycle choreography only.

## Non-Goals

- No config parsing or env-resolution changes.
- No polling-controller behavior changes.
- No read, command, or push policy changes.
- No Linear/runtime/provider feature work.

## Outcome

The Telegram oversight bridge should become a thinner Symphony-aligned composition shell, while the remaining startup/shutdown lifecycle choreography moves behind one explicit helper that still respects CO's stricter bridge-owned state authority model.
