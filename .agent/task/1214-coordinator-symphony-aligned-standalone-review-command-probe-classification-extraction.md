# Task Checklist - 1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction

- MCP Task ID: `1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`
- TECH_SPEC: `tasks/specs/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`, `tasks/specs/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`, `tasks/tasks-1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`, `.agent/task/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`
- [x] Deliberation/findings captured for the extraction lane. Evidence: `docs/findings/1214-standalone-review-command-probe-classification-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction.md`, `docs/findings/1214-standalone-review-command-probe-classification-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1214`. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T073220Z-docs-first/05-docs-review.log`, `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T073220Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Shared shell-probe and heavy-command classifier helpers extracted from `scripts/lib/review-execution-state.ts` into a bounded helper module without widening review-policy ownership. Evidence: `scripts/lib/review-command-probe-classification.ts`, `scripts/lib/review-execution-state.ts`, `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/00-summary.md`
- [x] Focused regressions prove the extracted classifier seam preserves nested payload probe detection, `grep` option parsing, env-var probe heuristics, heavy-command behavior, and review-output suffix normalization. Evidence: `tests/review-command-probe-classification.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/review-meta-surface-normalization.spec.ts`, `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/05a-targeted-tests.log`

## Validation & Closeout

- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/02-spec-guard.log`
- [x] `npm run docs:check`. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/07-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/08-docs-freshness.log`
- [x] Task-scoped `node scripts/delegation-guard.mjs` passed with manifest-backed delegation evidence. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/01-delegation-guard.log`, `.runs/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction-guard/cli/2026-03-15T09-34-40-535Z-483558c6/manifest.json`
- [x] `npm run build` passed on the shipped tree. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/03-build.log`
- [x] `npm run lint` passed on the shipped tree. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/04-lint.log`
- [x] Focused classifier regressions passed. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/05a-targeted-tests.log`
- [x] Full validation lane reran on the shipped tree and the recurring quiet-tail was recorded explicitly instead of being overstated as a clean aggregate pass. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/05-test.log`, `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/13-override-notes.md`
- [x] `node scripts/diff-budget.mjs` passed with explicit override only if required. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/09-diff-budget.log`, `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/13-override-notes.md`
- [x] Bounded `npm run review` returned a real regression, that fix shipped, and the subsequent drift was recorded truthfully as an override. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/10-review.log`, `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke` passed. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/11-pack-smoke.log`
- [x] Elegance review completed. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/12-elegance-review.md`
- [x] Closeout summary and explicit override notes recorded. Evidence: `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/00-summary.md`, `out/1214-coordinator-symphony-aligned-standalone-review-command-probe-classification-extraction/manual/20260315T093432Z-closeout/13-override-notes.md`
