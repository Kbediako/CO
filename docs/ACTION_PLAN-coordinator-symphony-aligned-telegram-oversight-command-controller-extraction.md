# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Oversight Command Controller Extraction

## Objective

Extract the remaining Telegram mutating operator command controller from `telegramOversightBridge.ts` without moving command admission, read routing, polling lifecycle, update persistence, push-state handling, or `/control/action` transport ownership.

## Steps

1. Add one bounded Telegram command controller helper near `telegramOversightBridge.ts`.
2. Move only `/pause` and `/resume` request shaping plus mutating reply generation into the controller.
3. Keep `/pause` and `/resume` delegating through the existing control-action API client.
4. Update `telegramOversightBridge.ts` to keep admission/read routing local while delegating the mutating branch to the controller.
5. Add focused integrated Telegram bridge coverage and optional unit coverage only if needed.
6. Run the standard validation lane, capture manual/mock evidence, and sync closeout mirrors.

## Guardrails

- Do not touch polling/update lifecycle or `next_update_id` persistence.
- Do not move non-mutating read routing or question sequencing out of the bridge shell.
- Do not re-open the Telegram Bot API transport seam from `1126`.
- Do not re-open the `/control/action` transport client seam from `1127`.
- Do not widen into push-state or Linear runtime work in this slice.
