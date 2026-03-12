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
- [ ] docs-review approval or explicit override captured for registered `1127`.

## Telegram Control Transport

- [ ] `telegramOversightBridge.ts` delegates control POST request/response handling into one bounded helper seam.
- [ ] The extracted seam owns control auth headers, `POST /control/action`, and control error translation without moving command orchestration, nonce shaping, or mutation authority out of the bridge.
- [ ] Focused Telegram/control regressions prove `/pause` and `/resume` transport behavior remains unchanged.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] `npm run review`.
- [ ] `npm run pack:smoke`.
- [ ] Manual/mock Telegram control transport evidence captured.
- [ ] Elegance review completed.
