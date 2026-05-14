# PRD - Coordinator Symphony-Aligned Telegram Oversight Update Handler Extraction

## Summary

After `1138` extracted the mutating `/pause` and `/resume` controller, the remaining non-lifecycle Telegram bridge surface is the update-local shell in `telegramOversightBridge.ts`: message/chat admission, slash-command normalization, read routing, mutating fallback dispatch, and reply send-path orchestration.

## Problem

`telegramOversightBridge.ts` still mixes two different concerns:
- runtime shell ownership:
  - poll-loop lifecycle,
  - `next_update_id` persistence,
  - startup/shutdown,
  - push-state transitions;
- update-local ingress handling:
  - `message.chat` admission,
  - authorized-chat filtering,
  - plain-text `/help` guidance,
  - slash-command normalization,
  - read-controller dispatch,
  - mutating-controller fallback,
  - reply send-path orchestration.

That leaves the bridge thicker than the current Symphony-aligned target even though the mutating operator seam is already isolated.

## Goals

- Extract the update-local Telegram ingress shell into one bounded helper/controller seam.
- Keep `telegramOversightBridge.ts` focused on poll/update sequencing, persistence, startup/shutdown, and push-state lifecycle.
- Preserve the existing read-controller and mutating-controller behavior exactly.
- Keep Telegram Bot API transport, `/control/action` transport hardening, and bridge state ownership unchanged.

## Non-Goals

- Changes to poll-loop lifecycle or `next_update_id` persistence.
- Changes to `ControlTelegramReadController`.
- Changes to `ControlTelegramCommandController`.
- Changes to Telegram Bot API transport or `/control/action` transport.
- Push-state or Linear runtime refactors.

## User Value

- Continues the Symphony-like thinning of the Telegram runtime shell without weakening CO’s stricter control model.
- Makes update-local Telegram behavior easier to evolve independently from poll/update lifecycle and bridge state.
- Sets up a cleaner final Telegram bridge shell for downstream operator and future user-facing surfaces.

## Acceptance Criteria

- `telegramOversightBridge.ts` no longer owns the inline update-local `handleUpdate` / `dispatchCommand` shell.
- A dedicated control-local helper/controller owns message admission, slash normalization, read routing, mutating fallback routing, and reply send-path invocation for one update.
- `telegramOversightBridge.ts` keeps poll-loop sequencing, `next_update_id` persistence, startup/shutdown, Telegram bot identity loading, and push-state ownership.
- Focused Telegram regressions prove the update-local operator surface remains unchanged.
