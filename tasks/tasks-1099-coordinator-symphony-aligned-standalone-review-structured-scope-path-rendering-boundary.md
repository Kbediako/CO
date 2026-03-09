# Task Checklist - 1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary

- MCP Task ID: `1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md`
- TECH_SPEC: `tasks/specs/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md`

> This lane follows `1098` by refining prompt-side scope rendering for paired and unusual path surfaces without reopening broader review-runtime or product/controller work.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md`, `tasks/specs/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md`, `tasks/tasks-1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md`, `.agent/task/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1099-standalone-review-structured-scope-path-rendering-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary.md`, `docs/findings/1099-standalone-review-structured-scope-path-rendering-boundary-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1099`.

## Structured Scope-Path Rendering Boundary

- [ ] Prompt-side scope rendering stays path-only while making paired rename/copy surfaces more explicit.
- [ ] Unusual-path rendering remains bounded and deterministic without reviving raw git summary blocks.
- [ ] Focused regression coverage proves the new rendering contract without changing `review-execution-state.ts`.

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
- [ ] Manual structured scope-path evidence captured.
- [ ] Elegance review completed.
