# Task Checklist - 1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary

- MCP Task ID: `1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`
- TECH_SPEC: `tasks/specs/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`

> This lane follows `1114` by adding a broader standalone-review terminal verdict boundary for generic speculative dwell after the bounded diff stops yielding concrete findings.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`, `tasks/specs/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`, `tasks/tasks-1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`, `.agent/task/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1115-standalone-review-generic-speculative-dwell-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`, `docs/findings/1115-standalone-review-generic-speculative-dwell-boundary-deliberation.md`.

## Generic Speculative Dwell Boundary

- [x] Standalone review detects sustained generic speculative dwell that does not introduce new concrete diff-local findings. Evidence: `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`, `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/05a-targeted-state-tests.log`.
- [x] The wrapper terminates explicitly with a generic speculative-dwell reason instead of idling to timeout when that broader pattern persists. Evidence: `scripts/lib/review-execution-state.ts`, `tests/run-review.spec.ts`, `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/05b-targeted-runtime-tests.log`.
- [x] Legitimate small-diff revisits that keep producing concrete findings do not trip the new boundary, and raw touched-file literals without location markers do not falsely suppress it. Evidence: `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`, `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/11-manual-generic-speculative-dwell-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/05a-targeted-state-tests.log`, `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/05b-targeted-runtime-tests.log`, `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/08-diff-budget.log`, `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/09-review.log`, `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/10-pack-smoke.log`.
- [x] Manual generic-speculative-dwell evidence captured. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/11-manual-generic-speculative-dwell-check.json`.
- [x] Elegance review completed. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/12-elegance-review.md`.
