# Task Checklist - 1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard

- MCP Task ID: `1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`
- TECH_SPEC: `tasks/specs/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`

> This lane turns the remaining `1064` / `1065` review-wrapper suite drift into one bounded validation-suite boundary seam owned by the shared review execution state.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`, `tasks/specs/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`, `tasks/tasks-1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`, `.agent/task/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1066-standalone-review-validation-suite-boundary-guard-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`, `docs/findings/1066-standalone-review-validation-suite-boundary-guard-deliberation.md`.
- [x] docs-review approval/override captured for registered `1066`. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T105841Z-docs-first/00-summary.md`, `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T105841Z-docs-first/05-docs-review-override.md`.

## Standalone Review Validation-Suite Boundary Guard

- [x] `ReviewExecutionState` classifies explicit package-manager validation suites as a bounded-policy violation in default mode. Evidence: `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`, `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/11-manual-review-runtime-check.json`.
- [x] `scripts/run-review.ts` terminates promptly on the validation-suite boundary while preserving `CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1`. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`, `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/05b-targeted-tests.log`, `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/11-manual-review-runtime-check.json`.
- [x] Targeted review-wrapper coverage proves explicit validation-suite launches now fail closed before post-suite drift. Evidence: `tests/run-review.spec.ts`, `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/05-test.log`, `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/05b-targeted-tests.log`, `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/09-review.log`, `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/10-pack-smoke.log`.
- [x] Manual review-wrapper/runtime artifact captured. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/11-manual-review-runtime-check.json`.
- [x] Elegance review completed. Evidence: `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/12-elegance-review.md`.
