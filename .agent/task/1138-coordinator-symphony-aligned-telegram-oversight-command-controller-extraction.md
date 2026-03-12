# Task Checklist - 1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction

- MCP Task ID: `1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md`

> This lane resumes the Symphony-aligned Telegram thinning track after `1127` by extracting the remaining operator command controller while leaving poll/update lifecycle, push-state handling, and `/control/action` transport ownership unchanged.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md`, `tasks/specs/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md`, `tasks/tasks-1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md`, `.agent/task/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md`, `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-docs-first/00-summary.md`
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1138-telegram-oversight-command-controller-extraction-deliberation.md`, `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-docs-first/00-summary.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-docs-first/00-summary.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md`, `docs/findings/1138-telegram-oversight-command-controller-extraction-deliberation.md`, `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-docs-first/00-summary.md`
- [x] docs-review approval or explicit override captured for registered `1138`. Evidence: `.runs/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/cli/2026-03-12T20-09-12-276Z-2ca21868/manifest.json`, `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-docs-first/00-summary.md`

## Telegram Command Controller

- [ ] `telegramOversightBridge.ts` delegates command admission, routing, and reply generation into one bounded helper seam.
- [ ] The extracted controller owns `/help`, `/status`, `/issue`, `/dispatch`, `/questions`, `/pause`, and `/resume` handling without moving polling/update lifecycle or push-state ownership out of the bridge shell.
- [ ] `/pause` and `/resume` still flow through the existing `/control/action` client with the same nonce, actor, transport, and traceability behavior.
- [ ] Focused Telegram bridge regressions prove the operator command surface remains unchanged.

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
- [ ] Manual/mock Telegram command-controller evidence captured.
- [ ] Elegance review completed.
