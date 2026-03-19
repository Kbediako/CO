# Task Checklist - 1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary

- MCP Task ID: `1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`
- TECH_SPEC: `tasks/specs/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`

> This lane follows `1115` by tightening the bounded diff-review citation contract so standalone review does not widen into repo-wide citation/pattern hunts just to justify same-diff progress.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`, `tasks/specs/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`, `tasks/tasks-1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`, `.agent/task/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1116-standalone-review-diff-local-concrete-progress-evidence-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md`, `docs/findings/1116-standalone-review-diff-local-concrete-progress-evidence-boundary-deliberation.md`.

## Diff-Local Concrete Progress Evidence Boundary

- [x] The bounded diff-review prompt explicitly defines citation-style touched-path findings with locations as sufficient concrete same-diff progress and says repo-wide example hunts are unnecessary. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/05a-prompt-contract-test.log`, `.runs/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary-scout/cli/2026-03-11T10-13-44-918Z-39d8d658/review/prompt.txt`.
- [x] The runtime review path stays diff-local or otherwise avoids reproducing the repo-wide citation-hunt timeout trace after the prompt contract is tightened. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/05b-runtime-citation-contract-test.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/09-review.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/11-manual-diff-local-citation-contract-check.json`.
- [x] Existing `1115` behavior remains intact: legitimate same-diff concrete findings with explicit touched-path locations still suppress verdict-stability drift. Evidence: `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/05c-review-execution-state.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/05-test.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/05a-prompt-contract-test.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/05b-runtime-citation-contract-test.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/05c-review-execution-state.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/08-diff-budget.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/09-review.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/10-pack-smoke.log`.
- [x] Manual diff-local citation-contract verification captured. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/11-manual-diff-local-citation-contract-check.json`.
- [x] Elegance review completed. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/12-elegance-review.md`.
