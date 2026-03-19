# Task Checklist - 1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction

- MCP Task ID: `1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`
- TECH_SPEC: `tasks/specs/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`

> This lane continues the Symphony-alignment mainline by extracting the child-run question-resolution adapter assembly from `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`, `tasks/specs/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`, `tasks/tasks-1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`, `.agent/task/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1073-question-child-resolution-adapter-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction.md`, `docs/findings/1073-question-child-resolution-adapter-extraction-deliberation.md`, `out/1072-coordinator-symphony-aligned-control-request-context-assembly-extraction/manual/20260308T220352Z-closeout/14-next-slice-note.md`.
- [x] docs-review approval/override captured for registered `1073`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260308T222321Z-docs-first/00-summary.md`, `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260308T222321Z-docs-first/05-docs-review-override.md`.

## Question Child-Resolution Adapter Extraction

- [x] Child-resolution adapter assembly ownership moved out of `controlServer.ts` into a dedicated control-local module. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlQuestionChildResolution.ts`.
- [x] The extracted seam preserves fallback event emission, delegation/run-root policy, and helper behavior. Evidence: `orchestrator/src/cli/control/controlQuestionChildResolution.ts`, `orchestrator/tests/ControlQuestionChildResolution.test.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] Question/expiry behavior remains intact after the extraction. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/11-manual-question-child-resolution-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/05-test.log`, `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/05b-targeted-tests.log`, `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/08-diff-budget.log`, `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/09-review.log`, `.runs/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/cli/2026-03-09T01-16-15-040Z-67469a98/review/output.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock child-resolution seam evidence captured. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/11-manual-question-child-resolution-check.json`.
- [x] Elegance review completed. Evidence: `out/1073-coordinator-symphony-aligned-question-child-resolution-adapter-extraction/manual/20260309T010648Z-closeout/12-elegance-review.md`.
