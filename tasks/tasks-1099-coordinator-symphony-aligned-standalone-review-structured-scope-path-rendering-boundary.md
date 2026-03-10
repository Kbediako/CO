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
- [x] docs-review approval/override captured for registered `1099`. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T094312Z-docs-first/05-docs-review-override.md`.

## Structured Scope-Path Rendering Boundary

- [x] Prompt-side scope rendering stays path-only while making paired rename/copy surfaces more explicit. Evidence: `scripts/run-review.ts`, `scripts/lib/review-scope-paths.ts`, `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/11-manual-structured-scope-path-check.json`.
- [x] Unusual-path rendering remains bounded and deterministic without reviving raw git summary blocks. Evidence: `scripts/lib/review-scope-paths.ts`, `tests/review-scope-paths.spec.ts`, `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/11-manual-structured-scope-path-check.json`.
- [x] Focused regression coverage proves the new rendering contract without changing `review-execution-state.ts`. Evidence: `tests/review-scope-paths.spec.ts`, `tests/run-review.spec.ts`, `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/09-review.log`, `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/10-pack-smoke.log`.
- [x] Manual structured scope-path evidence captured. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/11-manual-structured-scope-path-check.json`.
- [x] Elegance review completed. Evidence: `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/12-elegance-review.md`.
