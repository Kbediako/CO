# PRD - Coordinator Symphony-Aligned Telegram Bot API Client Extraction

## Summary

After `1124` moved the Telegram read-side presenter/controller out of `telegramOversightBridge.ts` and `1125` moved push-state/cooldown policy into `controlTelegramPushState.ts`, the remaining mixed shell is the bridge’s embedded Telegram Bot API client: URL construction, `getMe`, `getUpdates`, and `sendMessage` request/response handling.

## Problem

`telegramOversightBridge.ts` still owns the provider-coupled Telegram transport layer inline:
- Bot API URL construction,
- `getMe` startup identity fetch,
- `getUpdates` query shaping and response parsing,
- `sendMessage` request/response validation,
- Telegram envelope error mapping.

Those concerns are transport-specific and separable from the bridge’s orchestration responsibilities:
- poll-loop sequencing,
- update offset advancement,
- command routing and mutation authority,
- push-state transitions already extracted in `1125`.

Leaving Bot API transport inline keeps the bridge runtime thicker than the current Symphony-aligned target.

## Goals

- Extract Telegram Bot API request/response handling into one bounded client/helper seam.
- Keep `telegramOversightBridge.ts` focused on sequencing, orchestration, and mutation-authority ownership.
- Preserve exact `getUpdates`, `getMe`, and `sendMessage` behavior and error mapping.
- Keep the current Telegram configuration surface unchanged.

## Non-Goals

- Changes to polling/update sequencing or `next_update_id` persistence.
- Changes to `/pause`, `/resume`, control-token writes, or any mutation authority.
- Changes to the read-side controller shipped in `1124`.
- Changes to push-state/cooldown policy shipped in `1125`.
- Changes to Linear ingestion or broader `controlServer.ts` work.

## User Value

- Continues the Symphony-like thinning of the Telegram bridge without weakening CO’s stricter control model.
- Isolates provider-coupled transport behind a smaller interface, making later Telegram changes safer and more testable.

## Acceptance Criteria

- `telegramOversightBridge.ts` no longer owns inline Bot API URL construction or the full `getMe` / `getUpdates` / `sendMessage` fetch-and-parse flow.
- A dedicated helper/client owns Telegram request construction, envelope parsing, and error mapping.
- Poll-loop sequencing, update handling, push-state transitions, and control mutation authority remain in `telegramOversightBridge.ts`.
- Focused tests prove query construction, send payloads, and Telegram error propagation remain intact.
