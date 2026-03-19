# 1126 Deliberation - Telegram Bot API Client Extraction

## Context

- `1124` extracted the Telegram read-side presenter/controller.
- `1125` extracted Telegram push-state defaults and cooldown transition policy.
- The bridge still embeds pure Telegram provider transport logic.

## Decision

Choose `1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction` as the next bounded lane.

## Why this seam

- It is the next smallest truthful post-`1125` extraction:
  - provider-coupled transport remains inline,
  - orchestration and authority remain in the bridge,
  - the transport cluster is cohesive and testable.
- It keeps the Symphony-aligned direction:
  - thinner orchestration shell,
  - smaller provider adapter/client seam,
  - no widening into broader control-runtime work.

## In Scope

- `telegramUrl(...)`
- `getMe` request/response handling
- `getUpdates` request shaping and response parsing
- `sendMessage` request/response validation
- Telegram envelope error mapping

## Out of Scope

- Poll-loop sequencing
- Update offset advancement and persistence
- Command routing and `/pause` / `/resume` mutation authority
- Push-state transitions already moved in `1125`

## Evidence

- `out/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction/manual/20260312T010931Z-closeout/14-next-slice-note.md`
- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- Bounded scout recommendation from the `explorer_fast` stream during post-`1125` continuation
