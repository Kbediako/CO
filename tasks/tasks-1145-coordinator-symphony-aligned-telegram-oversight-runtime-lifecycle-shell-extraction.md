# Task Checklist - 1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction

- MCP Task ID: `1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md`

> This lane follows `1144` with a bounded production seam: extract the remaining Telegram startup/shutdown lifecycle choreography without reopening config parsing, polling behavior, or existing controller/client boundaries.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md`, `tasks/specs/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md`, `tasks/tasks-1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md`, `.agent/task/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md`
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1145-telegram-oversight-runtime-lifecycle-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md`, `docs/findings/1145-telegram-oversight-runtime-lifecycle-shell-extraction-deliberation.md`
- [x] docs-review approval captured for registered `1145`. Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T003943Z-docs-first/00-summary.md`, `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T003943Z-docs-first/05-docs-review.json`, `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T003943Z-docs-first/06-docs-review-rerun.json`

## Telegram Runtime Lifecycle Shell Extraction

- [ ] One dedicated helper owns Telegram bridge startup/shutdown lifecycle choreography.
- [ ] `telegramOversightBridge.ts` remains the public composition entrypoint and authoritative owner of bridge state.
- [ ] Focused regressions preserve startup/bootstrap and shutdown ordering semantics.

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
- [ ] Manual/mock Telegram lifecycle evidence captured.
- [ ] Elegance review completed.
