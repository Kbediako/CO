# Task Checklist - 1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction

- MCP Task ID: `1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md`
- TECH_SPEC: `tasks/specs/1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md`

> This lane follows `1150` from the now-neutral read-plus-update oversight contract seam. The next bounded Symphony-aligned move is to extract the remaining lazy bootstrap-side oversight-facade assembly without reopening Telegram runtime behavior.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md`, `tasks/specs/1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md`, `tasks/tasks-1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md`, `.agent/task/1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md`
- [x] Deliberation/findings captured for the bootstrap-side oversight-factory seam. Evidence: `docs/findings/1151-control-telegram-bridge-bootstrap-oversight-factory-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md`, `docs/findings/1151-control-telegram-bridge-bootstrap-oversight-factory-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1151`. Evidence: `out/1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction/manual/20260313T064728Z-docs-first/00-summary.md`, `out/1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction/manual/20260313T064728Z-docs-first/04-docs-review.json`, `.runs/1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction/cli/2026-03-13T06-53-47-957Z-6285e0cb/manifest.json`

## Control Telegram Bridge Bootstrap Oversight Factory Extraction

- [ ] One adjacent helper/factory replaces the inline lazy oversight-facade assembly in `controlTelegramBridgeBootstrapLifecycle.ts`.
- [ ] `controlTelegramBridgeBootstrapLifecycle.ts` consumes the extracted helper without changing the downstream callback contract.
- [ ] Focused helper/bootstrap regressions preserve the existing runtime behavior.

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
- [ ] Manual/mock bootstrap oversight-factory evidence captured.
- [ ] Elegance review completed.
