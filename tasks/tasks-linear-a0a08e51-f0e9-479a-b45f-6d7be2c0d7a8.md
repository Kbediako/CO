# Task Checklist - linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8

- Linear Issue: `CO-175` / `a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8`
- MCP Task ID: `linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8`
- Primary PRD: `docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- Task spec: `tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the saved workpad source were drafted for `CO-175`. Evidence: `docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`, `docs/TECH_SPEC-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`, `docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`, `tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`, `tasks/tasks-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`, `.agent/task/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/workpad.md`.
- [x] Pre-implementation issue-quality review notes were captured in the task spec before implementation. Evidence: `tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`.
- [x] Docs-review evidence is captured before implementation, or a truthful fallback is recorded if wrapper/provenance or known baseline boundaries prevent completion. Evidence: `.runs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8-co-175-docs-review/cli/2026-04-14T01-26-14-851Z-cf156543/manifest.json`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/docs-review-fallback.md`.

## Workflow
- [x] `linear issue-context` inspected live team states before any transition. Evidence: packaged `linear issue-context --issue-id a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8`.
- [x] Exactly one explicit same-turn parallelization decision was recorded. Evidence: packaged `linear parallelization --decision stay_serial --reason single_bounded_change`.
- [x] Issue moved from live `Backlog` to the live started state (`In Progress`) before active work. Evidence: packaged `linear transition --issue-id a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8 --state "In Progress" --format json`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: Linear comment `2c7d4608-80fc-41bd-a48d-c383afe6d4e4`, packaged `linear upsert-workpad --issue-id a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8 --body-file out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/workpad.md`.

## Investigation
- [x] The Apr 14 baseline was reproduced with saved JSON and markdown artifacts. Evidence: `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-docs-freshness-report.json`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-docs-freshness-summary.md`.
- [x] The stale set was classified by cohort, class, path family, and task/spec lineage. Evidence: `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-cohort-classification.json`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-cohort-classification.md`.

## Implementation
- [x] Rolling freshness cohort policy is documented in a durable guide and `docs/docs-catalog.json`. Evidence: `docs/guides/docs-freshness-cohorts.md`, `docs/docs-catalog.json`.
- [x] `scripts/docs-freshness.mjs` separates blocking stale rows from policy-covered rolling cohort rows. Evidence: `scripts/docs-freshness.mjs`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/post-policy-docs-freshness-report.json`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/post-policy-docs-freshness-summary.md`.
- [x] `scripts/spec-guard.mjs` reports eligible owner-backed stale specs as rolling cohort debt while keeping invalid/out-of-policy specs blocking. Evidence: `node scripts/spec-guard.mjs` passed with `Spec guard rolling freshness cohort entries: 14`.
- [x] Focused tests cover eligible rolling cohorts, non-eligible stale failures, expired cohort candidates, over-budget cohort candidates, invalid policy classes, and spec-guard rolling/fail-closed behavior. Evidence: `npx vitest run --config vitest.config.core.ts tests/docs-freshness.spec.ts tests/spec-guard.spec.ts` passed 23 tests.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: passed with `1 subagent manifest(s) found`.
- [x] `node scripts/spec-guard.mjs`. Evidence: passed with 14 CO-175-owned rolling spec entries.
- [x] `npm run build`. Evidence: passed.
- [x] `npm run lint`. Evidence: passed.
- [x] `npm run test`. Evidence: passed, 338 files / 3779 tests.
- [x] `npm run docs:check`. Evidence: passed.
- [x] `npm run docs:freshness`. Evidence: passed with `rolling freshness cohort entries: 221` and zero blocking stale rows.
- [x] `npm run repo:stewardship`. Evidence: passed, 4793 tracked files, 0 action-required.
- [x] `node scripts/diff-budget.mjs`. Evidence: passed working-tree scope, files=3/25 and lines=27/1200 for the latest review patch; `BASE_SHA=cac56ec8916562197967098443a3b6da7f0eb7da node scripts/diff-budget.mjs` passed, files=13/25 and lines=1066/1200.
- [x] Standalone review and elegance review are captured before review handoff. Evidence: review wrapper telemetry `../.runs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/cli/2026-04-14T01-14-59-466Z-39f8823e/review/telemetry.json` recorded `review_outcome=failed-boundary` / `command-intent`; manual review and elegance fallback recorded in `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/review-and-elegance.md`.

## Handoff
- [ ] Workpad refreshed after docs-first, after implementation, and immediately before review handoff. Evidence: pending.
- [ ] PR attached to the Linear issue before any review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition, PR checks are green, and `pr ready-review` drains cleanly. Evidence: pending.
