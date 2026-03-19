# Task Checklist - 1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction

- MCP Task ID: `1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction.md`
- TECH_SPEC: `tasks/specs/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction.md`

> This lane extracts the remaining Telegram question-read adapter assembly so `controlServer.ts` keeps shell ownership while Telegram question-read setup moves behind one bounded helper.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction.md`, `tasks/specs/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction.md`, `tasks/tasks-1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction.md`, `.agent/task/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1076-telegram-question-read-adapter-assembly-extraction-deliberation.md`, `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction.md`, `docs/findings/1076-telegram-question-read-adapter-assembly-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1076`. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T031942Z-docs-first/00-summary.md`, `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T031942Z-docs-first/05-docs-review-override.md`.

## Telegram Question-Read Adapter

- [x] Telegram-local question-read assembly extracted behind one bounded helper. Evidence: `orchestrator/src/cli/control/controlTelegramQuestionRead.ts`, `orchestrator/tests/ControlTelegramQuestionRead.test.ts`.
- [x] `controlServer.ts` delegates Telegram `readQuestions()` to the extracted helper without widening shell authority. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/11-manual-telegram-question-read-check.json`.
- [x] Existing Telegram retry behavior remains intact for expired and answered child-question flows. Evidence: `orchestrator/tests/TelegramOversightBridge.test.ts`, `orchestrator/tests/QuestionReadSequence.test.ts`, `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/01-delegation-guard.log`, `.runs/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction-guard/cli/2026-03-09T03-31-33-658Z-fa2edb49/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/05-test.log`, `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/05b-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/08-diff-budget.log`, `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/09-review.log`, `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock Telegram question-read evidence captured. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/11-manual-telegram-question-read-check.json`.
- [x] Elegance review completed. Evidence: `out/1076-coordinator-symphony-aligned-telegram-question-read-adapter-assembly-extraction/manual/20260309T033030Z-closeout/12-elegance-review.md`.
