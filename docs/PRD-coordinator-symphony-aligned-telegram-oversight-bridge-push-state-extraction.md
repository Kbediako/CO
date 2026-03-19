# PRD - Coordinator Symphony-Aligned Telegram Oversight Bridge Push-State Extraction

## Summary

After `1124` moved the Telegram read-side presenter/controller out of `telegramOversightBridge.ts`, the remaining mixed shell is the bridge push-state cluster: persisted Telegram oversight state, projection-hash bookkeeping, and cooldown gating for push notifications.

## Problem

`telegramOversightBridge.ts` still owns three tightly related but separable concerns inline:
- persistent `telegram-oversight-state.json` load/default behavior,
- push dedupe state bookkeeping for last-sent and pending projection hashes,
- cooldown eligibility logic that decides whether a new projection can be sent immediately or must remain pending.

Those responsibilities are distinct from polling transport and from the read-side presenter extracted in `1124`, so leaving them inline keeps the bridge thicker than the current Symphony-aligned target.

## Goals

- Extract the Telegram bridge push-state and cooldown persistence surface into one bounded helper seam.
- Keep `telegramOversightBridge.ts` focused on Telegram transport, bridge lifecycle, and mutation-authority ownership.
- Preserve projection push dedupe and cooldown behavior exactly.
- Keep the persisted state schema unchanged.

## Non-Goals

- Changes to Telegram polling, `getUpdates`, `sendMessage`, or Bot API transport.
- Changes to `/pause`, `/resume`, control-token writes, or any mutation authority.
- Changes to the presenter/controller seam shipped in `1124`.
- Changes to Linear ingestion or broader `controlServer.ts` work.

## User Value

- Moves the Telegram oversight surface closer to Symphony’s thin-shell shape without weakening CO’s stricter authority model.
- Makes downstream Telegram behavior easier to extend and reason about by separating transport from projection-state policy.

## Acceptance Criteria

- `telegramOversightBridge.ts` no longer owns inline `telegram-oversight-state.json` load/default parsing or the full projection push-state bookkeeping path.
- A dedicated helper owns push-state defaults, pending/last-sent hash updates, and cooldown gating decisions.
- Telegram transport, mutation authority, and presenter/controller behavior remain unchanged.
- Focused Telegram regressions prove projection push dedupe, pending-state persistence, and cooldown behavior remain intact.
