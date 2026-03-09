# Task Checklist - 1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary

- MCP Task ID: `1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`
- TECH_SPEC: `tasks/specs/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`

> This lane narrows prompt-side scope summaries after `1097` so review stays on canonical changed-surface identity instead of broad branch-history framing.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`, `tasks/specs/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`, `tasks/tasks-1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`, `.agent/task/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1098-standalone-review-canonical-scope-summary-boundary-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary.md`, `docs/findings/1098-standalone-review-canonical-scope-summary-boundary-deliberation.md`.
- [x] docs-review approval/override captured for registered `1098`. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195515Z-docs-first/05-docs-review-override.md`.

## Canonical Scope-Summary Boundary

- [x] Prompt-side scope summaries are reduced to canonical changed-surface identity data. Evidence: `scripts/run-review.ts`, `scripts/lib/review-scope-paths.ts`.
- [x] Branch-history framing no longer appears in the narrowed review scope summary. Evidence: `scripts/run-review.ts`, `docs/standalone-review-guide.md`, `tests/run-review.spec.ts`.
- [x] Review prompts still expose the bounded changed-file identity reviewers need. Evidence: `tests/run-review.spec.ts`, `tests/review-scope-paths.spec.ts`, `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/11-manual-canonical-scope-summary-check.json`.
- [x] Focused regression coverage proves the new scope-summary contract without changing `review-execution-state.ts`. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/09-review.log`, `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/10-pack-smoke.log`.
- [x] Manual canonical scope-summary evidence captured. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/11-manual-canonical-scope-summary-check.json`.
- [x] Elegance review completed. Evidence: `out/1098-coordinator-symphony-aligned-standalone-review-canonical-scope-summary-boundary/manual/20260309T195923Z-closeout/12-elegance-review.md`.
