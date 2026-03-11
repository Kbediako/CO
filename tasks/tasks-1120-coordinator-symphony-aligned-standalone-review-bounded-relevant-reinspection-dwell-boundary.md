# Task Checklist - 1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary

- MCP Task ID: `1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md`
- TECH_SPEC: `tasks/specs/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md`

> This lane follows `1119` by tightening the bounded standalone-review contract around repetitive reinspection of the same touched files and adjacent relevant helpers/tests after startup-anchor success.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md`, `tasks/specs/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md`, `tasks/tasks-1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md`, `.agent/task/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md`, `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1120-standalone-review-bounded-relevant-reinspection-dwell-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md`, `docs/findings/1120-standalone-review-bounded-relevant-reinspection-dwell-boundary-deliberation.md`.

## Bounded Relevant Reinspection Dwell

- [ ] Bounded standalone review fails promptly when it repetitively reinspects the same touched files and adjacent relevant helpers/tests after startup-anchor success without concrete findings. Evidence: `TODO-closeout/05b-targeted-tests.log`, `TODO-closeout/09-review.log`.
- [ ] Operator-facing failure output and telemetry distinguish bounded relevant reinspection dwell from off-task meta-surface drift. Evidence: `TODO-closeout/09-review.log`, `TODO-closeout/11-manual-relevant-reinspection-check.json`.
- [ ] First-pass diverse relevant inspection and concrete finding output remain allowed. Evidence: `TODO-closeout/05c-whole-file.log`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs --task 1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary`. Evidence: `TODO-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `TODO-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `TODO-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `TODO-closeout/04-lint.log`.
- [ ] `npx vitest run tests/review-execution-state.spec.ts -t "relevant reinspection"`. Evidence: `TODO-closeout/05a-targeted-review-execution-state.log`.
- [ ] `npx vitest run tests/run-review.spec.ts -t "relevant reinspection"`. Evidence: `TODO-closeout/05b-targeted-tests.log`.
- [ ] `npx vitest run tests/run-review.spec.ts`. Evidence: `TODO-closeout/05c-whole-file.log`.
- [ ] `npm run test`. Evidence: `TODO-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `TODO-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `TODO-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `TODO-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `TODO-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `TODO-closeout/10-pack-smoke.log`.
- [ ] Manual bounded relevant reinspection validation captured. Evidence: `TODO-closeout/11-manual-relevant-reinspection-check.json`.
- [ ] Elegance review completed. Evidence: `TODO-closeout/12-elegance-review.md`.
