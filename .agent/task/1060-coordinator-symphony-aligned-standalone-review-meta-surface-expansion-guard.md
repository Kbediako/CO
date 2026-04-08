# Task Checklist - 1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard

- MCP Task ID: `1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`
- TECH_SPEC: `tasks/specs/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`

> This lane turns the real `1059` broadening evidence into one bounded reliability control: fail-closed meta-surface expansion detection driven by the shared review execution state owner.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`, `tasks/specs/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`, `tasks/tasks-1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`, `.agent/task/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1060-standalone-review-meta-surface-expansion-guard-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`, `docs/findings/1060-standalone-review-meta-surface-expansion-guard-deliberation.md`.
- [x] docs-review approval/override captured for registered `1060`. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-docs-first/05-docs-review-override.md`.

## Standalone Review Meta-Surface Expansion Guard

- [x] `ReviewExecutionState` exposes bounded meta-surface expansion classification from live runtime facts. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/00-summary.md`, `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/11-manual-review-runtime-check.md`.
- [x] `scripts/run-review.ts` fails closed on that classification with artifact-first failure output. Evidence: `scripts/run-review.ts`, `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/00-summary.md`.
- [x] Targeted review-wrapper coverage proves sustained meta-surface expansion now terminates deterministically. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/09-review.log`, `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/10-pack-smoke.log`.
- [x] Manual review-wrapper/runtime artifact captured. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/11-manual-review-runtime-check.md`.
- [x] Elegance review completed. Evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/12-elegance-review.md`.
