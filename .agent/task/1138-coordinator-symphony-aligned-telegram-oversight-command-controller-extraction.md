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

- [x] `telegramOversightBridge.ts` delegates only the mutating `/pause` and `/resume` branch into one bounded helper seam. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/src/cli/control/controlTelegramCommandController.ts`, `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/00-summary.md`
- [x] The extracted controller owns only `/pause` and `/resume` handling without moving command admission, read routing, polling/update lifecycle, or push-state ownership out of the bridge shell. Evidence: `orchestrator/src/cli/control/controlTelegramCommandController.ts`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md`, `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/12-manual-telegram-command-controller-check.md`
- [x] `/pause` and `/resume` still flow through the existing `/control/action` client with the same nonce, actor, transport, and traceability behavior. Evidence: `orchestrator/tests/ControlTelegramCommandController.test.ts`, `orchestrator/tests/TelegramOversightBridge.test.ts`, `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/05-targeted-tests.log`
- [x] Focused Telegram bridge regressions prove the operator command surface remains unchanged. Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/05-targeted-tests.log`, `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/12-manual-telegram-command-controller-check.md`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/03-build.log`
- [x] `npm run lint` Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/04-lint.log`
- [x] `npm run test` Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/06-test.log`
- [x] `npm run docs:check` Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/07-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/08-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/09-diff-budget.log`
- [x] `npm run review` Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/10-review.log`
- [x] `npm run pack:smoke` Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/11-pack-smoke.log`
- [x] Manual/mock Telegram command-controller evidence captured. Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/12-manual-telegram-command-controller-check.md`
- [x] Elegance review completed. Evidence: `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-closeout/13-elegance-review.md`
