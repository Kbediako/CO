---
id: 20260414-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8
title: CO workflow: reopen CO-175 for Apr 18 docs:freshness over-budget historical packet cohort
relates_to: docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md
risk: high
owners:
  - Codex
last_review: 2026-04-18
---

## Canonical Reference
- Task spec: `tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- PRD: `docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- Task checklist: `tasks/tasks-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- Shared source anchor: `ctx:sha256:c4f24ab84edb50fdc98e76b64014ea589485230f2da0aba7746189ae723a9798#chunk:c000001`

## Summary
`origin/main` `b678ce4` reopened CO-175 because Apr 18 docs maintenance hit a new March 18 historical packet cohort outside the declared rolling baseline. This branch resolves that with the second explicit baseline cohort `co-175-apr-18-march-18-cli-1289-1298`, so current branch truth is `0` blocking stale docs, `291` rolling CO-175 rows, and `docs:freshness:maintain = pass_with_owned_rolling_debt` with `current_cohorts=2`, `max_cohorts=2`, and `blocking_changed_paths=[]`.

## Requirements
- Preserve the existing rolling cohort `co-175-apr-14-march-14-tasks-1164-1195` and the fail-closed policy.
- Resolve the March 18 `1289-1298` historical packet cohort through reviewed owner action under reopened CO-175.
- Do not widen rolling caps or windows.
- Keep the March 18 cohort explicit in packet docs as:
  - Task Packet: `50`
  - Task Mirror: `10`
  - Report Only: `10`
- Preserve the before-state maintenance checksum and the after-state decision evidence:
  - `block_policy_over_budget`
  - `candidate_entries=291`
  - `current_cohorts=8`
  - `current_cohorts=2`
  - `max_cohorts=2`
  - `blocking_changed_paths=[]`
  - `pass_with_owned_rolling_debt`

## Evidence
- Shared source payload: `/Users/kbediako/Code/CO/.workspaces/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/.runs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8-co175-docs-reopen/cli/2026-04-18T04-42-20-811Z-4332c1c3/memory/source-0/source.txt`
- Shared source note: metadata/provenance only; reopen scope comes from the parent prompt plus repo-local March 18 packet lineage.
- Historical packet cohort:
  - `last_review=2026-03-18`
  - lineage `1289-1298`
  - path families `.agent/task`, `docs/findings`, `tasks/specs`, `tasks/tasks-*`, `docs/PRD-*`, `docs/TECH_SPEC-*`, `docs/ACTION_PLAN-*`

## Validation Plan
- Child lane:
  - JSON parse of `tasks/index.json`
  - protected-term grep over the refreshed packet and mirrors
  - `git diff --check` on touched scoped files
- Parent lane:
  - before/after `npm run docs:freshness`
  - before/after `npm run docs:freshness:maintain`
  - `node scripts/spec-guard.mjs --dry-run`
  - focused guide/registry updates proving the resolved Apr 18 state

## Approvals
- Reviewer: pending parent docs-review / implementation.
- Date: 2026-04-18
