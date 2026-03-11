# Task Checklist - 1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary

- MCP Task ID: `1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`
- TECH_SPEC: `tasks/specs/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`

> This lane follows `1114` by adding a broader standalone-review terminal verdict boundary for generic speculative dwell after the bounded diff stops yielding concrete findings.

## Foundation

- [ ] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`, `tasks/specs/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`, `tasks/tasks-1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`, `.agent/task/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`.
- [ ] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1115-standalone-review-generic-speculative-dwell-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [ ] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [ ] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md`, `docs/findings/1115-standalone-review-generic-speculative-dwell-boundary-deliberation.md`.

## Generic Speculative Dwell Boundary

- [ ] Standalone review detects sustained generic speculative dwell that does not introduce new concrete diff-local findings. Evidence: `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`.
- [ ] The wrapper terminates explicitly with a generic speculative-dwell reason instead of idling to timeout when that broader pattern persists. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`.
- [ ] Legitimate small-diff revisits that keep producing concrete findings do not trip the new boundary. Evidence: `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/08-diff-budget.log`, `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/10-pack-smoke.log`.
- [ ] Manual generic-speculative-dwell evidence captured. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/11-manual-generic-speculative-dwell-check.json`.
- [ ] Elegance review completed. Evidence: `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/TODO-closeout/12-elegance-review.md`.
