# Task Checklist - 1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary

- MCP Task ID: `1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md`
- TECH_SPEC: `tasks/specs/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md`

> This lane narrows audit-mode prompt context before reopening the next Symphony-aligned product seam.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md`, `tasks/specs/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md`, `tasks/tasks-1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md`, `.agent/task/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1097-standalone-review-audit-task-context-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md`, `docs/findings/1097-standalone-review-audit-task-context-boundary-deliberation.md`.
- [x] docs-review approval/override captured for registered `1097`. Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185323Z-docs-first/05-docs-review-override.md`.

## Audit Task-Context Boundary

- [x] Audit-mode task context is reduced to bounded path-oriented identity data. Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/00-summary.md`, `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/11-manual-audit-task-context-check.json`.
- [x] Audit-mode prompts no longer inline PRD summary bullets or broader checklist content. Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/05-targeted-tests.log`, `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/11-manual-audit-task-context-check.json`.
- [x] Task inference from manifest/run-dir inputs still produces the bounded audit context. Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/05-targeted-tests.log`, `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/11-manual-audit-task-context-check.json`.
- [x] Focused regression coverage proves the slimmer prompt contract without changing audit evidence surfaces. Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/02-spec-guard.log`.
- [x] `npm run build` Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/03-build.log`.
- [x] `npm run lint` Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/04-lint.log`.
- [x] `npm run test` Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/05-test.log`.
- [x] `npm run docs:check` Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness` Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/08-diff-budget.log`.
- [x] `npm run review` Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/09-review.log`, `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/10-pack-smoke.log`.
- [x] Manual audit task-context evidence captured. Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/11-manual-audit-task-context-check.json`.
- [x] Elegance review completed. Evidence: `out/1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary/manual/20260309T185559Z-closeout/12-elegance-review.md`.
