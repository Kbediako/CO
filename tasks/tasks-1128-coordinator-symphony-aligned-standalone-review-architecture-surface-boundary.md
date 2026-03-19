# Task Checklist - 1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary

- MCP Task ID: `1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md`
- TECH_SPEC: `tasks/specs/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md`

> This lane adds one explicit `architecture` review surface so broader design/context review has a first-class home instead of leaking into bounded diff review.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md`, `tasks/specs/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md`, `tasks/tasks-1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md`, `.agent/task/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1128-standalone-review-architecture-surface-boundary-deliberation.md`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/00-summary.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/00-summary.md`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md`, `docs/findings/1128-standalone-review-architecture-surface-boundary-deliberation.md`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/00-summary.md`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/01-spec-guard.log`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/02-docs-check.log`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/03-docs-freshness.log`.
- [x] docs-review approval or explicit override captured for registered `1128`. Evidence: `.runs/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary-scout/cli/2026-03-12T03-21-38-462Z-4e49eed1/manifest.json`, `.runs/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/cli/2026-03-12T03-31-32-510Z-bb0e3ced/manifest.json`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/00-summary.md`.

## Review Surface Contract

- [x] `run-review` exposes `architecture` as an explicit review surface without weakening `diff` or `audit`. Evidence: `scripts/run-review.ts`, `docs/standalone-review-guide.md`, `bin/codex-orchestrator.ts`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/00-summary.md`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/12-manual-review-architecture-surface-check.md`.
- [x] The diff startup-anchor contract no longer treats `git show <rev>:<path>` as a default diff anchor. Evidence: `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/00-summary.md`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/05-targeted-tests.log`.
- [x] Focused review-wrapper regressions cover the new surface and revised anchor behavior. Evidence: `tests/run-review.spec.ts`, `tests/review-execution-state.spec.ts`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/08-test.log`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/09-diff-budget.log`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/10-review.log`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/12-manual-review-architecture-surface-check.md`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/11-pack-smoke.log`.
- [x] Manual/mock review-surface evidence captured. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/12-manual-review-architecture-surface-check.md`.
- [x] Elegance review completed. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/15-elegance-review.md`.
