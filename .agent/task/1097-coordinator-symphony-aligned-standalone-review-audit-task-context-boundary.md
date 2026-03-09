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
- [ ] docs-review approval/override captured for registered `1097`.

## Audit Task-Context Boundary

- [ ] Audit-mode task context is reduced to bounded path-oriented identity data.
- [ ] Audit-mode prompts no longer inline PRD summary bullets or broader checklist content.
- [ ] Task inference from manifest/run-dir inputs still produces the bounded audit context.
- [ ] Focused regression coverage proves the slimmer prompt contract without changing audit evidence surfaces.

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
- [ ] Manual audit task-context evidence captured.
- [ ] Elegance review completed.
