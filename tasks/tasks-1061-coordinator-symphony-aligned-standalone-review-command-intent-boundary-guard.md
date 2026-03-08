# Task Checklist - 1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard

- MCP Task ID: `1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`
- TECH_SPEC: `tasks/specs/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`

> This lane turns the remaining `1060` review-wrapper drift into one bounded command-intent boundary seam owned by the shared review execution state.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`, `tasks/specs/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`, `tasks/tasks-1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`, `.agent/task/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1061-standalone-review-command-intent-boundary-guard-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`, `docs/findings/1061-standalone-review-command-intent-boundary-guard-deliberation.md`.
- [x] docs-review approval/override captured for registered `1061`. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T061939Z-docs-first/05-docs-review-override.md`.

## Standalone Review Command-Intent Boundary Guard

- [x] `ReviewExecutionState` exposes explicit command-intent boundary classification from live runtime facts. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/00-summary.md`, `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/11-manual-review-runtime-check.json`.
- [x] `scripts/run-review.ts` fails closed on bounded-policy-violating command launches. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/00-summary.md`, `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/11-manual-review-runtime-check.json`.
- [x] Targeted review-wrapper coverage proves policy-violating command intents now terminate deterministically. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/05-targeted-tests.log`, `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/05b-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/09-review.log`, `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/10-pack-smoke.log`.
- [x] Manual review-wrapper/runtime artifact captured. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/11-manual-review-runtime-check.json`.
- [x] Elegance review completed. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/12-elegance-review.md`.
