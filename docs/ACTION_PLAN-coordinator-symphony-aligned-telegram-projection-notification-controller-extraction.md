# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Projection Notification Controller Extraction

## Objective

Extract the remaining outbound Telegram projection-notification orchestration from `telegramOversightBridge.ts` without moving queue ownership, poll-loop lifecycle, `next_update_id` persistence, startup/shutdown, or upstream read/push-state controller ownership.

## Steps

1. Add one bounded Telegram projection-notification controller/helper near `telegramOversightBridge.ts`.
2. Move projection rendering, transition evaluation, skip/pending/send branching, multi-chat send fan-out, and next-state return for one push attempt into the helper.
3. Keep `telegramOversightBridge.ts` responsible for queue serialization, closed checks, persistence shelling, startup/shutdown, and update fetch sequencing.
4. Preserve existing `ControlTelegramReadController` and `controlTelegramPushState.ts` ownership exactly.
5. Add focused integrated Telegram bridge coverage and optional unit coverage only if needed.
6. Run the standard validation/docs-first lane and capture explicit overrides only if a guard fails for reasons outside the bounded diff.

## Guardrails

- Do not move queue ownership or notification error logging out of the bridge runtime.
- Do not re-open the push-state helper seam from `1125`.
- Do not re-open the Telegram Bot API transport seam from `1126`.
- Do not re-open inbound Telegram update handling after `1139`.
- Do not widen into Linear runtime work in this slice.
