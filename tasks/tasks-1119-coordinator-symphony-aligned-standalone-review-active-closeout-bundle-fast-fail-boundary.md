# Task Checklist - 1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary

- MCP Task ID: `1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`
- TECH_SPEC: `tasks/specs/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`

> This lane follows `1118` by tightening the bounded standalone-review boundary around repeated direct rereads of the active closeout bundle for the task under review after earlier bounded inspection.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `tasks/specs/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `tasks/tasks-1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `.agent/task/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T120730Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1119-standalone-review-active-closeout-bundle-fast-fail-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md`, `docs/findings/1119-standalone-review-active-closeout-bundle-fast-fail-boundary-deliberation.md`.

## Active Closeout Bundle Boundary

- [x] Bounded standalone review fails promptly when it starts repeated direct rereads of the active closeout bundle for the current task after earlier bounded inspection. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/05b-targeted-tests.log`, `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/09-review.log`.
- [x] Telemetry and operator-facing failure output continue to identify `review-closeout-bundle`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/09-review.log`, `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/11-manual-closeout-bundle-check.json`, `.runs/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary-scout/cli/2026-03-11T12-13-09-171Z-7ef52029/review/telemetry.json`.
- [x] Audit-mode allowances for run manifests and runner logs remain intact. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/05c-whole-file.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs --task 1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/04-lint.log`.
- [x] `npx vitest run tests/review-execution-state.spec.ts -t "active closeout"`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/05a-targeted-review-execution-state.log`.
- [x] `npx vitest run tests/run-review.spec.ts -t "active closeout"`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/05b-targeted-tests.log`.
- [x] `npx vitest run tests/run-review.spec.ts`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/05c-whole-file.log`.
- [x] `npm run test`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/09-review.log`, `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/10-pack-smoke.log`.
- [x] Manual active-closeout-bundle validation captured. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/11-manual-closeout-bundle-check.json`.
- [x] Elegance review completed. Evidence: `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/12-elegance-review.md`.
