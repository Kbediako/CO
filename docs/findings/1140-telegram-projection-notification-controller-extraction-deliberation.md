# 1140 Deliberation - Telegram Projection Notification Controller Extraction

- Date: 2026-03-13
- Task: `1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction`

## Why this slice

- `1139` closed the update-local ingress extraction truthfully.
- `1125` already extracted push-state defaults and transition policy, so the remaining cohesive Telegram runtime seam is the outbound projection-notification orchestration around `maybeSendProjectionDelta(...)`.
- The remaining logic is now cohesive enough to extract without also moving queue ownership or poll-loop state progression.

## In Scope

- The outbound projection render/transition/send shell currently in `telegramOversightBridge.ts`.
- One extracted Telegram projection-notification controller/helper.
- Focused Telegram regression coverage for preserved projection push behavior.

## Out of Scope

- Notification queue ownership, poll-loop lifecycle, or `next_update_id` persistence.
- Telegram Bot API transport redesign.
- `ControlTelegramReadController` redesign.
- `controlTelegramPushState.ts` redesign.
- Inbound Telegram update handling or Linear runtime work.

## Recommendation

- Proceed with one bounded Telegram projection-notification controller seam.
- Keep the bridge runtime authoritative for queue/fetch/offset/persist ownership.
- Keep read presentation and push-state transition policy unchanged inside the extracted controller composition.
