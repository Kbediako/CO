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

- [x] One dedicated helper owns Telegram bridge startup/shutdown lifecycle choreography. Evidence: `orchestrator/src/cli/control/telegramOversightBridgeRuntimeLifecycle.ts`, `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/11-manual-telegram-runtime-lifecycle-check.md`
- [x] `telegramOversightBridge.ts` remains the public composition entrypoint and authoritative owner of bridge state. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/11-manual-telegram-runtime-lifecycle-check.md`
- [x] Focused regressions preserve startup/bootstrap and shutdown ordering semantics. Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/03-build.log`
- [x] `npm run lint` Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/04-lint.log`
- [x] `npm run test` Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/05-test.log`
- [x] `npm run docs:check` Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/08-diff-budget.log`
- [x] `npm run review` Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/09-review.log`
- [x] `npm run pack:smoke` Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/10-pack-smoke.log`
- [x] Manual/mock Telegram lifecycle evidence captured. Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/11-manual-telegram-runtime-lifecycle-check.md`
- [x] Elegance review completed. Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T011553Z-closeout/12-elegance-review.md`
