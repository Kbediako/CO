# Task Checklist - 1146-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction

- MCP Task ID: `1146-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1146-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction.md`

> This lane follows `1145` with the last clearly defensible Telegram bridge runtime seam: queued projection delivery orchestration only, without reopening config parsing, `next_update_id`, or broader bridge composition.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction.md`, `tasks/specs/1146-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction.md`, `tasks/tasks-1146-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction.md`, `.agent/task/1146-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction.md`
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1146-telegram-projection-delivery-queue-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1146-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction.md`, `docs/findings/1146-telegram-projection-delivery-queue-shell-extraction-deliberation.md`
- [x] docs-review approval captured for registered `1146`. Evidence: `out/1146-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction/manual/20260313T014651Z-docs-first/00-summary.md`, `out/1146-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction/manual/20260313T014651Z-docs-first/04-docs-review.json`, `out/1146-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction/manual/20260313T014651Z-docs-first/04a-delegated-scout.json`, `out/1146-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction/manual/20260313T014651Z-docs-first/05-docs-review.json`

## Telegram Projection Delivery Queue Shell Extraction

- [ ] One dedicated helper owns the queued projection delivery runtime shell.
- [ ] `telegramOversightBridge.ts` remains the public composition entrypoint and bridge-local state owner.
- [ ] Focused regressions preserve serialized projection delivery and persisted-state write-through semantics.

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
- [ ] Manual/mock Telegram projection delivery evidence captured.
- [ ] Elegance review completed.
