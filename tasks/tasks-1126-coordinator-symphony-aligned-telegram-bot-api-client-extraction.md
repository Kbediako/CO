# Task Checklist - 1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction

- MCP Task ID: `1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md`
- TECH_SPEC: `tasks/specs/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md`

> This lane continues the Symphony-aligned Telegram thinning track after `1125` by extracting the embedded Telegram Bot API client surface while leaving sequencing, push-state policy, and mutation authority unchanged.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md`, `tasks/specs/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md`, `tasks/tasks-1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md`, `.agent/task/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T012641Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1126-telegram-bot-api-client-extraction-deliberation.md`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T012641Z-docs-first/00-summary.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T012641Z-docs-first/00-summary.md`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction.md`, `docs/findings/1126-telegram-bot-api-client-extraction-deliberation.md`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T012641Z-docs-first/00-summary.md`.
- [x] docs-review approval or explicit override captured for registered `1126`. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T012641Z-docs-first/00-summary.md`, `.runs/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/cli/2026-03-12T01-36-53-497Z-f73b1757/manifest.json`, `.runs/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction-guard/cli/2026-03-12T01-33-01-920Z-048025b6/manifest.json`.

## Telegram Bot API Client

- [x] `telegramOversightBridge.ts` delegates Telegram Bot API request/response handling into one bounded helper seam. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/src/cli/control/telegramOversightApiClient.ts`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/00-summary.md`.
- [x] The extracted seam owns Bot API URL construction plus `getMe`, `getUpdates`, and `sendMessage` request/response handling without moving sequencing, push-state policy, or mutation authority out of the bridge. Evidence: `orchestrator/src/cli/control/telegramOversightApiClient.ts`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/11-manual-telegram-api-client-check.json`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/12-elegance-review.md`.
- [x] Focused Telegram regressions prove query construction, send payloads, and Telegram error propagation remain unchanged. Evidence: `orchestrator/tests/TelegramOversightApiClient.test.ts`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/08-diff-budget.log`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock Telegram Bot API client evidence captured. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/11-manual-telegram-api-client-check.json`.
- [x] Elegance review completed. Evidence: `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/12-elegance-review.md`.
