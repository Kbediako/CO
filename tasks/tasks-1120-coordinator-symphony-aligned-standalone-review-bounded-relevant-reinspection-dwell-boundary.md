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

- [x] Bounded standalone review fails promptly when it repetitively reinspects the same touched files and adjacent relevant helpers/tests after startup-anchor success without concrete findings. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/05b-targeted-tests.log`, `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/09-review.log`.
- [x] Operator-facing failure output and telemetry distinguish bounded relevant reinspection dwell from off-task meta-surface drift. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/09-review.log`, `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/11-manual-relevant-reinspection-check.json`.
- [x] First-pass diverse relevant inspection and concrete finding output remain allowed. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs --task 1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary`. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/04-lint.log`.
- [x] `npx vitest run tests/review-execution-state.spec.ts -t "relevant reinspection"`. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/05a-targeted-review-execution-state.log`.
- [x] `npx vitest run tests/run-review.spec.ts -t "relevant reinspection"`. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/05b-targeted-tests.log`.
- [x] Final bounded review plus focused targeted regressions superseded a separate whole-file `tests/run-review.spec.ts` terminal gate for this lane. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/05b-targeted-tests.log`, `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/09-review.log`, `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/13-override-notes.md`.
- [x] `npm run test`. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/05-test.log`, `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/09-review.log`, `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/10-pack-smoke.log`.
- [x] Manual bounded relevant reinspection validation captured. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/11-manual-relevant-reinspection-check.json`.
- [x] Elegance review completed. Evidence: `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T132813Z-closeout/12-elegance-review.md`.
