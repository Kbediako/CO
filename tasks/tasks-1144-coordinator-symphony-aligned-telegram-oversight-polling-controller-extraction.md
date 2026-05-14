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

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md`, `docs/findings/1144-telegram-oversight-polling-controller-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1144`. Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T000149Z-docs-first/00-summary.md`, `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T000149Z-docs-first/05-docs-review-override.md`

## Telegram Polling Controller Extraction

- [x] One dedicated controller owns the inbound polling loop, `getUpdates` offset/timeout orchestration, and per-update error isolation. Evidence: `orchestrator/src/cli/control/controlTelegramPollingController.ts`, `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/12-manual-telegram-polling-controller-check.md`
- [x] `telegramOversightBridge.ts` remains the authoritative owner of in-memory whole-state sequencing, queue lifecycle, bot identity lifecycle, and controller/API-client composition. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/12-manual-telegram-polling-controller-check.md`, `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/13-elegance-review.md`
- [x] Focused regressions preserve `next_update_id` advancement plus the pinned monotonic `updated_at` guarantee. Evidence: `orchestrator/tests/ControlTelegramPollingController.test.ts`, `orchestrator/tests/TelegramOversightBridge.test.ts`, `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/05-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/03-build.log`
- [x] `npm run lint` Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/04-lint.log`
- [x] `npm run test` Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/05-targeted-tests.log`, `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/06-test.log`, `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/14-override-notes.md`
- [x] `npm run docs:check` Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/07-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/08-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/09-diff-budget.log`, `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/14-override-notes.md`
- [x] `npm run review` Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/10-review.log`, `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/14-override-notes.md`
- [x] `npm run pack:smoke` Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/11-pack-smoke.log`
- [x] Manual/mock Telegram polling-controller evidence captured. Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/12-manual-telegram-polling-controller-check.md`
- [x] Elegance review completed. Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/13-elegance-review.md`
