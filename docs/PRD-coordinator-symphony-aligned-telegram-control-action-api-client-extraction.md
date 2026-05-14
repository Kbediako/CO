# PRD - Coordinator Symphony-Aligned Telegram Control Action API Client Extraction

## Summary

After `1126` moved Telegram Bot API transport out of `telegramOversightBridge.ts`, the remaining inline transport concern is the bridge's direct `/control/action` POST client used by `/pause` and `/resume`.

## Problem

`telegramOversightBridge.ts` still owns the control-plane transport boundary for Telegram-issued mutations:
- auth header construction,
- `POST /control/action` request dispatch,
- control-response parsing,
- control transport error translation.

Those concerns are transport-specific and separable from the bridge's orchestration responsibilities:
- command routing,
- nonce and actor shaping,
- polling/update sequencing,
- offset persistence,
- push-state handling.

Leaving control transport inline keeps the bridge shell thicker than the current Symphony-aligned target.

## Goals

- Extract `/control/action` transport into one bounded helper/client seam.
- Keep `telegramOversightBridge.ts` focused on command orchestration, sequencing, and mutation authority ownership.
- Preserve existing `/pause` and `/resume` request and error behavior.
- Keep the current Telegram and control auth surfaces unchanged.

## Non-Goals

- Changes to polling/update sequencing or `next_update_id` persistence.
- Changes to Telegram Bot API transport already extracted in `1126`.
- Changes to presenter/controller or push-state seams extracted in `1124` and `1125`.
- Broader command/config refactors in `telegramOversightBridge.ts`.
- Changes to Linear or broader `controlServer.ts` work.

## User Value

- Continues the Symphony-like thinning of the Telegram bridge without weakening CO's stricter control model.
- Isolates the remaining control transport dependency behind a smaller interface, making later mutation-surface changes safer and more testable.

## Acceptance Criteria

- `telegramOversightBridge.ts` no longer owns inline control POST dispatch or control-response parsing.
- A dedicated helper/client owns control auth headers, `POST /control/action`, and error translation.
- Command routing, nonce construction, and mutation authority remain in `telegramOversightBridge.ts`.
- Focused tests prove `/pause` and `/resume` transport behavior remains intact.
