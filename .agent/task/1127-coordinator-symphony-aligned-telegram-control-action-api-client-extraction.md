# Task Checklist - 1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction

- MCP Task ID: `1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md`
- TECH_SPEC: `tasks/specs/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md`

> This lane continues the Symphony-aligned Telegram thinning track after `1126` by extracting the remaining inline `/control/action` transport client while leaving command orchestration, sequencing, and mutation authority unchanged.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md`, `tasks/specs/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md`, `tasks/tasks-1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md`, `.agent/task/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T033500Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1127-telegram-control-action-api-client-extraction-deliberation.md`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T033500Z-docs-first/00-summary.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T033500Z-docs-first/00-summary.md`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md`, `docs/findings/1127-telegram-control-action-api-client-extraction-deliberation.md`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T033500Z-docs-first/00-summary.md`.
- [x] docs-review approval or explicit override captured for registered `1127`. Evidence: `.runs/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/cli/2026-03-12T02-31-38-548Z-c62056d4/manifest.json`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T033500Z-docs-first/00-summary.md`.

## Telegram Control Transport

- [x] `telegramOversightBridge.ts` delegates control POST request/response handling into one bounded helper seam. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/src/cli/control/telegramOversightControlActionApiClient.ts`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/00-summary.md`.
- [x] The extracted seam owns control auth headers, `POST /control/action`, and control error translation without moving command orchestration, nonce shaping, or mutation authority out of the bridge. Evidence: `orchestrator/src/cli/control/telegramOversightControlActionApiClient.ts`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/12-manual-telegram-control-action-client-check.json`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/13-elegance-review.md`.
- [x] Focused Telegram/control regressions prove `/pause` and `/resume` transport behavior remains unchanged. Evidence: `orchestrator/tests/TelegramOversightBridge.test.ts`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/08-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/09-diff-budget.log`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/14-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/10-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/11-pack-smoke.log`.
- [x] Manual/mock Telegram control transport evidence captured. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/12-manual-telegram-control-action-client-check.json`.
- [x] Elegance review completed. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/13-elegance-review.md`.
