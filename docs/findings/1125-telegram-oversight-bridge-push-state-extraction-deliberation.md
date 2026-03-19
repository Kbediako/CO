# 1125 Deliberation - Telegram Oversight Bridge Push-State Extraction

## Why This Slice

Post-`1124`, the next truthful Telegram seam is the persisted push-state and cooldown bookkeeping cluster still living inline in `telegramOversightBridge.ts`.

## Evidence

- `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/20260312T003259Z-closeout/14-next-slice-note.md`
- `orchestrator/src/cli/control/telegramOversightBridge.ts`

## In Scope

- `telegram-oversight-state.json` load/default parsing
- push-state bookkeeping for last-sent and pending projection hashes
- cooldown gating used by projection pushes
- persistence writes for those state transitions

## Out of Scope

- polling/update ingestion
- Bot API transport and `sendMessage`
- `/pause` and `/resume` mutation authority
- the presenter/controller surface extracted in `1124`
- Linear or broader `controlServer.ts` refactors

## Why Not Broader

This is the smallest coherent remaining Telegram seam after `1124`. Jumping to a broader Telegram or Linear refactor would reopen transport or provider boundaries prematurely instead of continuing the thin-shell layering incrementally.
