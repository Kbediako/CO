# Task Checklist - 1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction

- MCP Task ID: `1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md`

> This lane follows `1143` with a bounded production seam: extract inbound Telegram polling/update-offset orchestration without reopening config parsing, queue ownership, or existing controller/client boundaries.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md`, `tasks/specs/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md`, `tasks/tasks-1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md`, `.agent/task/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md`
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1144-telegram-oversight-polling-controller-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [ ] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md`, `docs/findings/1144-telegram-oversight-polling-controller-extraction-deliberation.md`
- [ ] docs-review approval or explicit override captured for registered `1144`.

## Telegram Polling Controller Extraction

- [ ] One dedicated controller owns the inbound polling loop, `getUpdates` offset/timeout orchestration, and per-update error isolation.
- [ ] `telegramOversightBridge.ts` remains the authoritative owner of in-memory whole-state sequencing, queue lifecycle, bot identity lifecycle, and controller/API-client composition.
- [ ] Focused regressions preserve `next_update_id` advancement plus the pinned monotonic `updated_at` guarantee.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `node scripts/diff-budget.mjs`
- [ ] `npm run review`
- [ ] `npm run pack:smoke`
- [ ] Manual/mock Telegram polling-controller evidence captured.
- [ ] Elegance review completed.
