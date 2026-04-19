# Task Checklist - linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8

- Linear Issue: `CO-175` / `a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8`
- MCP Task ID: `linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8`
- Primary PRD: `docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- TECH_SPEC: `tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- Shared source anchor: `ctx:sha256:c4f24ab84edb50fdc98e76b64014ea589485230f2da0aba7746189ae723a9798#chunk:c000001`
- Current origin manifest: `.runs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8-co175-docs-reopen/cli/2026-04-18T04-42-20-811Z-4332c1c3/manifest.json`

## Docs-First
- [x] PRD refreshed for the reopened Apr 18 CO-175 over-budget maintenance state. Evidence: `docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`.
- [x] TECH_SPEC refreshed with the March 18 `1289-1298` cohort contract, protected terms, and parent-owned implementation boundaries. Evidence: `tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`, `docs/TECH_SPEC-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`.
- [x] ACTION_PLAN refreshed for parent-owned March 18 cohort resolution and focused docs validation. Evidence: `docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`.
- [x] `tasks/index.json` and `docs/TASKS.md` updated within the declared docs scope. Evidence: those files.
- [x] Checklist mirrored to `.agent/task/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`. Evidence: `.agent/task/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md` review notes.

## Child-Lane Scope
- [x] Child lane stayed inside the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist and final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [x] Parent resolves the March 18 `1289-1298` historical packet cohort through reviewed owner action under reopened `CO-175`. Evidence: `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/apr18-final-clean-maintenance.json`.
- [x] The existing rolling cohort `co-175-apr-14-march-14-tasks-1164-1195` remains visible and unchanged. Evidence: `docs/docs-catalog.json`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/apr18-final-clean-maintenance.json`.
- [x] `npm run docs:freshness` no longer reports the March 18 `70` blocking stale docs. Evidence: `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/apr18-final-docs-freshness.json`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/apr18-final-docs-freshness.md`.
- [x] `npm run docs:freshness:maintain` no longer reports `block_policy_over_budget` for clean unrelated diffs and returns an allowed decision with `blocking_changed_paths=[]`. Evidence: `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/apr18-final-clean-maintenance.json`.
- [x] The parent does not widen caps or windows and does not resolve the cohort with only a blind `last_review` bump. Evidence: `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`.

## Validation
- [x] Child scoped JSON parse check. Evidence: `python3 -c "import json, pathlib; json.loads(pathlib.Path('tasks/index.json').read_text()); print('tasks/index.json OK')"`
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "docs:freshness|docs:freshness:maintain|block_policy_over_budget|candidate_entries=291|current_cohorts=8|max_cohorts=2|blocking_changed_paths=\\[\\]|CO-175|co-175-apr-14-march-14-tasks-1164-1195|1289-1298|last_review=2026-03-18|70|221" docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md docs/TECH_SPEC-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md tasks/tasks-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md .agent/task/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md docs/TECH_SPEC-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md tasks/tasks-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md .agent/task/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md tasks/index.json docs/TASKS.md`.
- [x] Parent before/after `npm run docs:freshness`. Evidence: `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/apr18-before-docs-freshness.json`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/apr18-before-docs-freshness.md`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/apr18-final-docs-freshness.json`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/apr18-final-docs-freshness.md`.
- [x] Parent before/after `npm run docs:freshness:maintain`. Evidence: `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/apr18-before-maintenance.json`, `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/apr18-final-clean-maintenance.json`.
- [x] Parent `node scripts/spec-guard.mjs --dry-run` after packet acceptance. Evidence: command passed on the integrated parent diff.
- [x] Parent guide and registry updates proving the Apr 18 decision state. Evidence: `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`.

## Progress Log
- 2026-04-14: CO-175 originally landed the rolling cohort policy for the Apr 14 March 14 baseline and kept `docs:freshness` fail closed for undeclared, expired, invalid, or over-budget stale docs.
- 2026-04-18: This bounded same-issue child lane refreshed the CO-175 docs packet for the reopened maintenance state. Current truth carried into the packet is `origin/main` `b678ce4`, `70` blocking stale docs from March 18 lineage `1289-1298`, `221` existing CO-175 rolling rows, and `docs:freshness:maintain` reporting `block_policy_over_budget` with `candidate_entries=291`, `current_cohorts=8`, `max_cohorts=2`, and `blocking_changed_paths=[]`. The packet preserves the recommendation to update existing owner issue `CO-175` rather than expand caps, and it preserves the existing rolling cohort id `co-175-apr-14-march-14-tasks-1164-1195`.
- 2026-04-18: Parent implementation declared `co-175-apr-18-march-18-cli-1289-1298`, updated `docs/guides/docs-freshness-cohorts.md`, and reran the parent gates. Current branch truth is `0` blocking stale docs, `291` rolling CO-175 entries, and `docs:freshness:maintain = pass_with_owned_rolling_debt` with `current_cohorts=2`, `max_cohorts=2`, and `blocking_changed_paths=[]`.
