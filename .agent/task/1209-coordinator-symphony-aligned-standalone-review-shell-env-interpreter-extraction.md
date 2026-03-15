# Task Checklist - 1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction

- MCP Task ID: `1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`
- TECH_SPEC: `tasks/specs/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`, `tasks/specs/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`, `tasks/tasks-1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`, `.agent/task/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`
- [x] Deliberation/findings captured for the extraction lane. Evidence: `docs/findings/1209-standalone-review-shell-env-interpreter-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction.md`, `docs/findings/1209-standalone-review-shell-env-interpreter-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1209`. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T033505Z-docs-first/05-docs-review.log`, `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T033505Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Shared shell-env interpreter extracted from `scripts/lib/review-execution-state.ts` into a bounded helper module without widening review-policy ownership. Evidence: `scripts/lib/review-shell-env-interpreter.ts`, `scripts/lib/review-execution-state.ts`, `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/00-summary.md`
- [x] Focused `review-execution-state` regressions prove the extracted interpreter preserves current shell-env behavior, including nested generic `MANIFEST` rebinding. Evidence: `tests/review-execution-state.spec.ts`, `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/05a-targeted-review-execution-state.log`

## Validation & Closeout

- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/02-spec-guard.log`
- [x] `npm run docs:check`. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/07-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/08-docs-freshness.log`
- [x] Task-scoped `node scripts/delegation-guard.mjs` passed with manifest-backed delegation evidence. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/01-delegation-guard.log`, `.runs/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction-guard/cli/2026-03-15T04-02-22-812Z-6b1fe757/manifest.json`
- [x] `npm run build` passed on the shipped tree. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/03-build.log`
- [x] `npm run lint` passed on the shipped tree. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/04-lint.log`
- [x] Focused shell-env interpreter regressions passed. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/05a-targeted-review-execution-state.log`
- [x] Full validation lane passed on the shipped tree. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/05-test.log`
- [x] `node scripts/diff-budget.mjs` passed with explicit stacked-branch override. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/09-diff-budget.log`, `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/13-override-notes.md`
- [x] Bounded `npm run review` returned no findings on the implementation diff. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/10-review.log`
- [x] `npm run pack:smoke` passed. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/11-pack-smoke.log`
- [x] Elegance review completed. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/12-elegance-review.md`
- [x] Closeout summary and explicit override notes recorded. Evidence: `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/00-summary.md`, `out/1209-coordinator-symphony-aligned-standalone-review-shell-env-interpreter-extraction/manual/20260315T040118Z-closeout/13-override-notes.md`
