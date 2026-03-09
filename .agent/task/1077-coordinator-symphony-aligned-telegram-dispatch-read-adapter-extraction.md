# Task Checklist - 1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction

- MCP Task ID: `1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction.md`
- TECH_SPEC: `tasks/specs/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction.md`

> This lane extracts the remaining Telegram dispatch-read adapter assembly so `controlServer.ts` keeps shell ownership while Telegram dispatch-read setup moves behind one bounded helper.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction.md`, `tasks/specs/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction.md`, `tasks/tasks-1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction.md`, `.agent/task/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1077-telegram-dispatch-read-adapter-extraction-deliberation.md`, `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction.md`, `docs/findings/1077-telegram-dispatch-read-adapter-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1077`. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T034451Z-docs-first/00-summary.md`, `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T034451Z-docs-first/05-docs-review-override.md`.

## Telegram Dispatch-Read Adapter

- [x] Telegram-local dispatch-read assembly extracted behind one bounded helper. Evidence: `orchestrator/src/cli/control/controlTelegramDispatchRead.ts`, `orchestrator/tests/ControlTelegramDispatchRead.test.ts`.
- [x] `controlServer.ts` delegates Telegram `readDispatch()` to the extracted helper while leaving the shared audit emitter reusable for API and Telegram surfaces. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/11-manual-telegram-dispatch-check.json`.
- [x] Existing Telegram `/dispatch` behavior and dispatch audit emission remain intact for ready and fail-closed paths. Evidence: `orchestrator/tests/ControlTelegramDispatchRead.test.ts`, `orchestrator/tests/TelegramOversightBridge.test.ts`, `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/01-delegation-guard.log`, `.runs/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction-guard/cli/2026-03-09T04-59-01-486Z-04be47c1/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/05-test.log`, `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/05b-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/08-diff-budget.log`, `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/09-review.log`, `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock Telegram dispatch-read evidence captured. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/11-manual-telegram-dispatch-check.json`.
- [x] Elegance review completed. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/12-elegance-review.md`.
