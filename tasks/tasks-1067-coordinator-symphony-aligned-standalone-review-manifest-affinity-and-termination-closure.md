# Task Checklist - 1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure

- MCP Task ID: `1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`
- TECH_SPEC: `tasks/specs/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`

> This lane closes the next standalone-review lifecycle seam after `1066`: manifest affinity plus bounded termination closure.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`, `tasks/specs/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`, `tasks/tasks-1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`, `.agent/task/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1067-standalone-review-manifest-affinity-and-termination-closure-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`, `docs/findings/1067-standalone-review-manifest-affinity-and-termination-closure-deliberation.md`.
- [x] docs-review approval/override captured for registered `1067`. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T114152Z-docs-first/00-summary.md`, `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T114152Z-docs-first/05-docs-review.json`.

## Standalone Review Lifecycle Closure

- [x] Standalone review resolves the active manifest/run lineage instead of attaching by raw newest-mtime fallback. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`, `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/05-targeted-tests.log`, `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/11-manual-review-runtime-check.json`.
- [x] Review artifacts remain bound to the same resolved run lineage. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`, `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/05-targeted-tests.log`, `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/11-manual-review-runtime-check.json`.
- [x] Bounded review termination waits for child closure before surfacing failure. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`, `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/05-targeted-tests.log`, `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/11-manual-review-runtime-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/05-targeted-tests.log`, `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/05b-full-test.log`, `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/09-review.log`, `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/10-pack-smoke.log`.
- [x] Manual review-wrapper/runtime artifact captured. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/11-manual-review-runtime-check.json`.
- [x] Elegance review completed. Evidence: `out/1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure/manual/20260308T115539Z-closeout/12-elegance-review.md`.
