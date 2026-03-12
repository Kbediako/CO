# 1139 Deliberation - Telegram Oversight Update Handler Extraction

- Date: 2026-03-13
- Task: `1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction`

## Why this slice

- `1138` closed the operator-only mutating `/pause` and `/resume` extraction truthfully.
- That leaves one clearly bounded Telegram runtime seam: the update-local shell around `handleUpdate` and `dispatchCommand`.
- The remaining logic is now cohesive enough to extract without also moving poll-loop state progression or bridge-state ownership.

## In Scope

- The update-local message admission, normalization, routing, and reply-dispatch shell currently in `telegramOversightBridge.ts`.
- One extracted Telegram update handler/controller/helper.
- Focused Telegram regression coverage for the preserved update-local behavior.

## Out of Scope

- Poll-loop lifecycle, update fetch orchestration, or `next_update_id` persistence.
- Telegram Bot API transport.
- `ControlTelegramReadController` redesign.
- `ControlTelegramCommandController` redesign.
- Push-state or Linear runtime work.

## Recommendation

- Proceed with one bounded Telegram update handler/controller seam.
- Keep the bridge runtime authoritative for fetch/offset/persist/push ownership.
- Keep read and mutating controller composition unchanged inside the extracted update handler.
