# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Oversight Update Handler Extraction

## Objective

Extract the remaining Telegram update-local ingress shell from `telegramOversightBridge.ts` without moving poll-loop lifecycle, `next_update_id` persistence, startup/shutdown, push-state handling, or downstream controller ownership.

## Steps

1. Add one bounded Telegram update handler/controller helper near `telegramOversightBridge.ts`.
2. Move message admission, authorized-chat filtering, plain-text help guidance, slash normalization, read routing, mutating fallback dispatch, and reply send-path invocation into the helper.
3. Keep `telegramOversightBridge.ts` responsible for update fetch sequencing, offset progression/persistence, bot identity startup, and push-state delivery.
4. Preserve existing `ControlTelegramReadController` and `ControlTelegramCommandController` ownership exactly.
5. Add focused integrated Telegram bridge coverage and optional unit coverage only if needed.
6. Run the standard validation/docs-first lane and capture explicit overrides only if a guard fails for reasons outside the bounded diff.

## Guardrails

- Do not move poll/update lifecycle or `next_update_id` persistence out of the bridge runtime.
- Do not re-open the read-controller seam from earlier Telegram slices.
- Do not re-open the mutating command controller seam from `1138`.
- Do not re-open the Telegram Bot API transport seam from `1126`.
- Do not widen into push-state or Linear runtime work in this slice.
