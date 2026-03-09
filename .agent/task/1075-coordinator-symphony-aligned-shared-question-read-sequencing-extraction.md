# Task Checklist - 1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction

- MCP Task ID: `1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-shared-question-read-sequencing-extraction.md`
- TECH_SPEC: `tasks/specs/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-shared-question-read-sequencing-extraction.md`

> This lane extracts the shared question-read sequencing seam so API and Telegram question surfaces stop assembling the same coordination flow inline.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-shared-question-read-sequencing-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-shared-question-read-sequencing-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-shared-question-read-sequencing-extraction.md`, `tasks/specs/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction.md`, `tasks/tasks-1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction.md`, `.agent/task/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1075-shared-question-read-sequencing-extraction-deliberation.md`, `out/1074-coordinator-symphony-aligned-question-read-retry-deduplication/manual/20260309T015848Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction.md`, `docs/findings/1075-shared-question-read-sequencing-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1075`. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T022339Z-docs-first/00-summary.md`, `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T022339Z-docs-first/05-docs-review-override.md`.

## Shared Question-Read Sequencing

- [x] Shared question-read sequencing helper added for snapshot-expire-list-retry coordination. Evidence: `orchestrator/src/cli/control/questionReadSequence.ts`, `orchestrator/tests/QuestionReadSequence.test.ts`.
- [x] The authenticated `/questions` route delegates shared sequencing to the helper. Evidence: `orchestrator/src/cli/control/questionQueueController.ts`, `orchestrator/tests/QuestionQueueController.test.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] Telegram oversight `readQuestions()` delegates the same sequencing and preserves answered-question child retries. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/TelegramOversightBridge.test.ts`, `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/11-manual-question-read-sequencing-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/01-delegation-guard.log`, `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/13-override-notes.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/05-test.log`, `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/05b-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/08-diff-budget.log`, `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/09-review.log`, `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock question-read sequencing evidence captured. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/11-manual-question-read-sequencing-check.json`.
- [x] Elegance review completed. Evidence: `out/1075-coordinator-symphony-aligned-shared-question-read-sequencing-extraction/manual/20260309T023946Z-closeout/12-elegance-review.md`.
