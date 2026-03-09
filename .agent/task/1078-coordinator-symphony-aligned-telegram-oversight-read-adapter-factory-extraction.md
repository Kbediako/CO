# Task Checklist - 1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction

- MCP Task ID: `1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md`
- TECH_SPEC: `tasks/specs/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md`

> This lane extracts the remaining Telegram oversight read-adapter factory so `controlServer.ts` keeps shell ownership while the Telegram read surface is assembled behind one bounded helper.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md`, `tasks/specs/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md`, `tasks/tasks-1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md`, `.agent/task/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1078-telegram-oversight-read-adapter-factory-extraction-deliberation.md`, `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md`, `docs/findings/1078-telegram-oversight-read-adapter-factory-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1078`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/20260309T051450Z-docs-first/00-summary.md`, `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/20260309T051450Z-docs-first/05-docs-review-override.md`.

## Telegram Read-Adapter Factory

- [ ] Telegram oversight read-adapter factory extracted behind one bounded helper. Evidence: extracted control-local Telegram read-adapter helper, `orchestrator/tests/TelegramOversightBridge.test.ts`.
- [ ] `controlServer.ts` delegates `createTelegramOversightReadAdapter()` to the extracted helper while preserving existing lifecycle and transport ownership. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/11-manual-telegram-read-adapter-check.json`.
- [ ] Existing Telegram selected-run, `/dispatch`, and `/questions` behavior remain intact under focused regressions. Evidence: `orchestrator/tests/TelegramOversightBridge.test.ts`, `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`, `.runs/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction-guard/cli/<timestamp>/manifest.json`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/05-test.log`, `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.
- [ ] `npm run docs:check`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock Telegram read-adapter evidence captured. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/11-manual-telegram-read-adapter-check.json`.
- [ ] Elegance review completed. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
