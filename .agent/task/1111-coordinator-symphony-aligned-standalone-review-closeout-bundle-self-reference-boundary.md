# Task Checklist - 1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary

- MCP Task ID: `1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md`
- TECH_SPEC: `tasks/specs/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md`

> This lane follows `1110` by preventing bounded diff review from rereading the current closeout bundle before broader standalone-review drift work resumes.

## Foundation

- [ ] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md`, `tasks/specs/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md`, `tasks/tasks-1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md`, `.agent/task/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md`.
- [ ] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1111-standalone-review-closeout-bundle-self-reference-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [ ] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [ ] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary.md`, `docs/findings/1111-standalone-review-closeout-bundle-self-reference-boundary-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1111`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-docs-first/05-docs-review-override.md`.

## Closeout-Bundle Self-Reference Boundary

- [ ] In diff mode, direct reads of the active closeout bundle count as a self-referential boundary surface. Evidence: `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`.
- [ ] Repo-wide searches that surface active closeout-bundle paths contribute to the same boundary. Evidence: `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`.
- [ ] Legitimate startup-anchor and audit evidence (`MANIFEST`, `RUNNER_LOG`) remain allowed. Evidence: `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`.
- [ ] Runtime-facing coverage proves bounded diff review terminates on active closeout-bundle self-reference without reopening unrelated meta-surface work. Evidence: `tests/run-review.spec.ts`, `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/08-diff-budget.log`, `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/10-pack-smoke.log`.
- [ ] Manual closeout-bundle self-reference evidence captured. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/11-manual-closeout-self-reference-check.json`.
- [ ] Elegance review completed. Evidence: `out/1111-coordinator-symphony-aligned-standalone-review-closeout-bundle-self-reference-boundary/manual/TODO-closeout/12-elegance-review.md`.
