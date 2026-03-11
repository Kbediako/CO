# Task Checklist - 1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary

- MCP Task ID: `1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`
- TECH_SPEC: `tasks/specs/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`

> This lane follows `1118` by tightening the bounded standalone-review boundary around post-anchor rereads of the active closeout bundle for the task under review.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `tasks/specs/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `tasks/tasks-1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `.agent/task/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T120730Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1119-standalone-review-active-closeout-bundle-fast-fail-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `docs/findings/1119-standalone-review-active-closeout-bundle-fast-fail-boundary-deliberation.md`.

## Active Closeout Bundle Boundary

- [ ] Bounded standalone review fails promptly when it starts post-anchor rereads of the active closeout bundle for the current task. Evidence: `TODO-closeout/05-targeted-tests.log`, `TODO-closeout/09-review.log`.
- [ ] Telemetry and operator-facing failure output continue to identify `review-closeout-bundle`. Evidence: `TODO-closeout/09-review.log`, `TODO-closeout/11-manual-closeout-bundle-check.json`.
- [ ] Audit-mode allowances for run manifests and runner logs remain intact. Evidence: `TODO-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs --task 1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary`. Evidence: `TODO-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `TODO-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `TODO-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `TODO-closeout/04-lint.log`.
- [ ] `npx vitest run tests/review-execution-state.spec.ts -t "active closeout"`. Evidence: `TODO-closeout/05a-targeted-review-execution-state.log`.
- [ ] `npm run test -- tests/run-review.spec.ts`. Evidence: `TODO-closeout/05-targeted-tests.log`.
- [ ] `npm run test`. Evidence: `TODO-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `TODO-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `TODO-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `TODO-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `TODO-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `TODO-closeout/10-pack-smoke.log`.
- [ ] Manual active-closeout-bundle validation captured. Evidence: `TODO-closeout/11-manual-closeout-bundle-check.json`.
- [ ] Elegance review completed. Evidence: `TODO-closeout/12-elegance-review.md`.
