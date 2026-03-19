# Task Checklist - 1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification

- MCP Task ID: `1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`
- TECH_SPEC: `tasks/specs/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`, `tasks/specs/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`, `tasks/tasks-1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`, `.agent/task/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`
- [x] Deliberation/findings captured for the classification lane. Evidence: `docs/findings/1218-standalone-review-shell-command-parser-review-support-classification-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification.md`, `docs/findings/1218-standalone-review-shell-command-parser-review-support-classification-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1218`. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T130532Z-docs-first/04-docs-review.json`, `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T130532Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Shell-command parser helper paths now inherit the intended `review-support` classification and pairwise touched-path adjacency across the built helper, direct consumer sources, normalization host/spec, and execution-state host/spec without collapsing into an overbroad clique. Evidence: `scripts/lib/review-meta-surface-normalization.ts`, `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/00-summary.md`
- [x] Focused normalization and review-state regressions prove the shipped parser families allow direct adjacency while preserving anti-clique behavior for sibling consumer reads. Evidence: `tests/review-meta-surface-normalization.spec.ts`, `tests/review-execution-state.spec.ts`, `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/05a-targeted-tests.log`

## Validation & Closeout

- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/02-spec-guard.log`
- [x] `npm run docs:check`. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/07-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/08-docs-freshness.log`
- [x] Task-scoped `node scripts/delegation-guard.mjs` passed with manifest-backed delegation evidence. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/01-delegation-guard.log`, `.runs/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification-guard/cli/2026-03-15T13-16-16-533Z-a9c7b973/manifest.json`
- [x] `npm run build` passed on the shipped tree. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/03-build.log`
- [x] `npm run lint` passed on the shipped tree. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/04-lint.log`
- [x] Focused shell-command parser classification regressions passed. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/05a-targeted-tests.log`
- [x] Full validation lane passed on the shipped tree or the explicit override was recorded truthfully. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/13-override-notes.md`
- [x] `node scripts/diff-budget.mjs` passed with explicit override only if required. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/09-diff-budget.log`, `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/13-override-notes.md`
- [x] Bounded `npm run review` returned no findings or an explicit override was recorded truthfully. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/10-review.log`, `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke` passed. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/11-pack-smoke.log`
- [x] Elegance review completed. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/12-elegance-review.md`
- [x] Closeout summary and explicit override notes recorded. Evidence: `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/00-summary.md`, `out/1218-coordinator-symphony-aligned-standalone-review-shell-command-parser-review-support-classification/manual/20260315T131549Z-closeout/13-override-notes.md`
