# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Control Action API Client Extraction

## Objective

Extract the remaining `/control/action` transport client from `telegramOversightBridge.ts` into one dedicated helper without moving Telegram command orchestration, nonce/actor shaping, or mutation authority.

## Steps

1. Add a bounded control-action client helper near `telegramOversightBridge.ts`.
2. Move control auth headers, `POST /control/action`, response parsing, and control transport error translation into that helper.
3. Update `telegramOversightBridge.ts` to delegate through the helper while keeping `/pause|/resume` orchestration intact.
4. Add focused tests for control transport success and failure behavior.
5. Run the standard validation lane, capture manual/mock evidence, and sync closeout mirrors.

## Guardrails

- Do not touch polling/update lifecycle.
- Do not touch Telegram Bot API client behavior extracted in `1126`.
- Do not move nonce/actor shaping or mutation authorization out of the bridge shell.
- Keep the solution to one transport helper seam.
