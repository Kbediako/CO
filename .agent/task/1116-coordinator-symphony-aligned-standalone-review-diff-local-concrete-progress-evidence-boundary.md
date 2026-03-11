# Task Checklist - 1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary

- MCP Task ID: `1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`
- TECH_SPEC: `tasks/specs/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`

> This lane follows `1115` by tightening the bounded diff-review citation contract so standalone review does not widen into repo-wide citation/pattern hunts just to justify same-diff progress.

## Foundation

- [ ] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`, `tasks/specs/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`, `tasks/tasks-1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`, `.agent/task/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`.
- [ ] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1116-standalone-review-diff-local-concrete-progress-evidence-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [ ] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [ ] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`, `docs/findings/1116-standalone-review-diff-local-concrete-progress-evidence-boundary-deliberation.md`.

## Diff-Local Concrete Progress Evidence Boundary

- [ ] The bounded diff-review prompt explicitly defines citation-style touched-path findings with locations as sufficient concrete same-diff progress and says repo-wide example hunts are unnecessary. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`.
- [ ] The runtime review path stays diff-local or otherwise avoids reproducing the repo-wide citation-hunt timeout trace after the prompt contract is tightened. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`.
- [ ] Existing `1115` behavior remains intact: legitimate same-diff concrete findings with explicit touched-path locations still suppress verdict-stability drift. Evidence: `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/TODO-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/TODO-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/TODO-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/TODO-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/TODO-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/TODO-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/TODO-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/TODO-closeout/08-diff-budget.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/TODO-closeout/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/TODO-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/TODO-closeout/10-pack-smoke.log`.
