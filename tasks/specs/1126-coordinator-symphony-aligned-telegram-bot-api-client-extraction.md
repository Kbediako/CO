---
id: 20260312-1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction
title: Coordinator Symphony-Aligned Telegram Bot API Client Extraction
status: completed
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md
related_tasks:
  - tasks/tasks-1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Bot API Client Extraction

## Summary

Extract the Telegram Bot API client surface from `telegramOversightBridge.ts` so the runtime shell keeps sequencing, bridge lifecycle, and mutation authority while provider transport moves behind a dedicated helper.

## Scope

- Extract Bot API URL construction.
- Extract `getMe`, `getUpdates`, and `sendMessage` request/response handling.
- Delegate Telegram envelope parsing and error mapping out of `telegramOversightBridge.ts`.

## Out of Scope

- Poll-loop/update sequencing or `next_update_id` persistence.
- `/pause`, `/resume`, or any mutation-authority path.
- The presenter/controller seam extracted in `1124`.
- The push-state/cooldown seam extracted in `1125`.

## Notes

- 2026-03-12: Registered after `1125` completed. With the read-side presenter/controller and push-state policy already extracted, the next truthful Telegram seam is the remaining embedded Bot API transport/client cluster still living inline in `telegramOversightBridge.ts`. Evidence: `docs/findings/1126-telegram-bot-api-client-extraction-deliberation.md`, `out/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction/manual/20260312T010931Z-closeout/00-summary.md`, `out/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction/manual/20260312T010931Z-closeout/14-next-slice-note.md`.
- 2026-03-12: Docs-first approval captured. Local `spec-guard`, `docs:check`, and `docs:freshness` passed, the guard sub-run finished green, and `docs-review` succeeded at `.runs/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/cli/2026-03-12T01-36-53-497Z-f73b1757/manifest.json`. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T012641Z-docs-first/00-summary.md`, `.runs/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/cli/2026-03-12T01-36-53-497Z-f73b1757/manifest.json`, `.runs/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction-guard/cli/2026-03-12T01-33-01-920Z-048025b6/manifest.json`.
- 2026-03-12: Completed. `telegramOversightBridge.ts` now delegates Telegram Bot API transport through `telegramOversightApiClient.ts`, keeping startup ordering, poll-loop sequencing, offset persistence, push-state policy, and `/pause|/resume` mutation authority in the bridge shell. Final validation passed through `pack:smoke`, focused Telegram regressions passed (`16/16`), the final-tree full suite passed (`194/194` files, `1397/1397` tests), manual helper evidence was captured, and forced bounded review converged to a no-findings verdict. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/00-summary.md`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/09-review.log`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/13-override-notes.md`.
