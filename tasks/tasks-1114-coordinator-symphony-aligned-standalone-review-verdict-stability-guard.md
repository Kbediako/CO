# Task Checklist - 1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard

- MCP Task ID: `1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md`
- TECH_SPEC: `tasks/specs/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md`

> This lane follows `1113` by adding an explicit standalone-review verdict-stability boundary once speculative dwell stops producing new concrete review progress.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md`, `tasks/specs/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md`, `tasks/tasks-1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md`, `.agent/task/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1114-standalone-review-verdict-stability-guard-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard.md`, `docs/findings/1114-standalone-review-verdict-stability-guard-deliberation.md`.
- [x] docs-review approval/override captured for registered `1114`. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T074758Z-docs-first/05-docs-review-override.md`.

## Verdict Stability Guard

- [x] Standalone review detects sustained speculative dwell that no longer introduces new diff-relevant progress signals. Evidence: `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/05a-targeted-tests.log`.
- [x] The wrapper terminates explicitly with a verdict-stability reason instead of idling to timeout when that dwell pattern persists. Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/05b-runtime-tests.log`.
- [x] Legitimate ongoing review progress that continues introducing new concrete signals does not trip the new guard, and inspected fixture file contents are explicitly excluded from narrative drift accounting. Evidence: `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/12-manual-verdict-stability-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/05a-targeted-tests.log`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/05b-runtime-tests.log`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/06-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/07-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/08-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/09-diff-budget.log`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/14-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/10-review.log`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/14-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/11-pack-smoke.log`.
- [x] Manual verdict-stability evidence captured. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/12-manual-verdict-stability-check.json`.
- [x] Elegance review completed. Evidence: `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/13-elegance-review.md`.
