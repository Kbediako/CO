# PRD - Coordinator Symphony-Aligned Telegram Oversight Bridge Presenter/Controller Split

## Summary

After the `controlServer` thinning track through `1123`, the largest remaining mixed operator surface is `telegramOversightBridge.ts`. The bridge runtime still combines Telegram transport polling with read-side command routing, `/status|/issue|/dispatch|/questions` rendering, and projection-hash-based push shaping.

## Problem

`telegramOversightBridge.ts` currently owns four distinct concerns inline:
- Telegram polling and update transport,
- command routing for read-side operator commands,
- selected-run and dispatch presentation for Telegram responses,
- projection hashing and push-message shaping for delta notifications.

The read-adapter prerequisite is already in place, so this is now the truthful Symphony-aligned seam. Symphony keeps transport/controller shells thin and pushes projection shaping into presenters; CO should follow that shape here without weakening mutation authority or changing provider behavior.

## Goals

- Extract the Telegram read-side presenter/controller surface out of `telegramOversightBridge.ts`.
- Keep the bridge runtime focused on Telegram polling transport, state persistence, API calls, and mutation-authority boundaries.
- Preserve `/start`, `/help`, `/status`, `/issue`, `/dispatch`, `/questions`, and push-notification behavior exactly.
- Keep pause/resume mutation authority in the bridge/controller shell, not in a pure presenter.

## Non-Goals

- Changes to Telegram polling, `getUpdates`, or `sendMessage` transport behavior.
- Changes to control mutation payload ownership, nonces, or control-token usage.
- Changes to `controlRuntime.ts`, `linearDispatchSource.ts`, or `controlActionPreflight.ts`.
- Linear provider capability expansion or review-wrapper follow-on work.

## User Value

- Moves CO’s Telegram operator surface closer to Symphony’s presenter/controller separation while preserving CO’s harder authority model.
- Makes the bot-facing surface easier to extend for downstream operators without re-entangling transport and presentation logic.

## Acceptance Criteria

- `telegramOversightBridge.ts` no longer owns the full inline read-side command rendering surface.
- A dedicated Telegram presenter/controller seam owns `/status`, `/issue`, `/dispatch`, `/questions`, help/start rendering, and projection-hash-based push shaping.
- Telegram transport polling, state persistence, API calls, and pause/resume mutation authority remain behaviorally unchanged.
- Focused Telegram regressions prove integrated polling render, push deduplication, prompt/urgency hash sensitivity, and no-selected fallback behavior remain intact.
