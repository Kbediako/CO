# Task Checklist - 1074-coordinator-symphony-aligned-question-read-retry-deduplication

- MCP Task ID: `1074-coordinator-symphony-aligned-question-read-retry-deduplication`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-question-read-retry-deduplication.md`
- TECH_SPEC: `tasks/specs/1074-coordinator-symphony-aligned-question-read-retry-deduplication.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-question-read-retry-deduplication.md`

> This lane hardens the shared question-read seam so freshly expired child questions are not immediately retried during the same API or Telegram read.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-question-read-retry-deduplication.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-question-read-retry-deduplication.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-question-read-retry-deduplication.md`, `tasks/specs/1074-coordinator-symphony-aligned-question-read-retry-deduplication.md`, `tasks/tasks-1074-coordinator-symphony-aligned-question-read-retry-deduplication.md`, `.agent/task/1074-coordinator-symphony-aligned-question-read-retry-deduplication.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1074-question-read-retry-deduplication-deliberation.md`, `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1074-coordinator-symphony-aligned-question-read-retry-deduplication.md`, `docs/findings/1074-question-read-retry-deduplication-deliberation.md`.
- [x] docs-review approval/override captured for registered `1074`. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015432Z-docs-first/00-summary.md`, `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015432Z-docs-first/05-docs-review-override.md`.

## Question-Read Retry Deduplication

- [x] Shared question-read retry helper added for pre-expiry candidate tracking. Evidence: `orchestrator/src/cli/control/questionReadRetryDeduplication.ts`, `orchestrator/tests/QuestionReadRetryDeduplication.test.ts`.
- [x] The authenticated `/questions` route uses the shared helper and no longer retries freshly expired records in the same read. Evidence: `orchestrator/src/cli/control/questionQueueController.ts`, `orchestrator/tests/QuestionQueueController.test.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] Telegram oversight `readQuestions()` uses the same shared helper and no longer retries freshly expired records in the same read. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/TelegramOversightBridge.test.ts`, `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/11-manual-question-read-retry-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/01-delegation-guard.log`, `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/13-override-notes.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/05-test.log`, `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/05b-targeted-tests.log`, `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/08-diff-budget.log`, `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/09-review.log`, `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock question-read retry evidence captured. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/11-manual-question-read-retry-check.json`.
- [x] Elegance review completed. Evidence: `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/12-elegance-review.md`.
