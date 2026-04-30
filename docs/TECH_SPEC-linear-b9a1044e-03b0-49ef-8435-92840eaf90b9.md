---
id: 20260430-linear-b9a1044e-03b0-49ef-8435-92840eaf90b9
title: "CO-429 CO-41 March 30 docs freshness registry residue"
relates_to: docs/PRD-linear-b9a1044e-03b0-49ef-8435-92840eaf90b9.md
risk: medium
owners:
  - Codex
last_review: 2026-04-30
---

# TECH_SPEC - CO-429 CO-41 March 30 docs freshness registry residue

This mirror points to the canonical task spec at `tasks/specs/linear-b9a1044e-03b0-49ef-8435-92840eaf90b9.md`.

## Implementation Summary
- Create the CO-429 docs-first packet and task mirrors for the CO-41 March 30 docs-freshness registry residue.
- Preserve protected terms: `docs:freshness`, `docs:freshness:maintain`, `docs/docs-freshness-registry.json`, `linear-af97d673-43a4-4a36-8738-b7f61e5b71a1`, `CO-41`, `last_review=2026-03-30 registry rows`, `task spec last_review=2026-04-19`, `terminal Done Linear state`, and `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/specs|last_review:2026-03-30|cadence_days:30`.
- Identify the six target residue paths for the CO-41 packet/mirror registry rows.
- Keep registry repair, task registry updates, docs task snapshots, validation, Linear state, workpad, GitHub, PR lifecycle, and merge parent-owned.

## Parent-Owned Implementation Boundaries
- Inspect current `docs:freshness` / `docs:freshness:maintain` output for CO-429.
- Repair only the six CO-41 packet/mirror rows in `docs/docs-freshness-registry.json` that still carry `last_review=2026-03-30` and `cadence_days=30`.
- Use the existing `task spec last_review=2026-04-19` evidence and CO-41 `terminal Done Linear state` rather than deleting packet docs.
- Preserve the CO-41 packet docs for audit history.
- Avoid CO-428 changes and avoid provider/control-host implementation.

## Parent Repair Status
- 2026-04-30: parent updated only the six CO-41 `linear-af97d673-43a4-4a36-8738-b7f61e5b71a1` rows in `docs/docs-freshness-registry.json` to `last_review=2026-04-19`.
- 2026-04-30: `docs:freshness` no longer reports the CO-41 rows as stale; remaining failures are the separate CO-428 March 30 active-spec cohort.

## Target Residue Paths
- `docs/PRD-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- `docs/TECH_SPEC-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- `docs/ACTION_PLAN-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- `tasks/specs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- `tasks/tasks-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`
- `.agent/task/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md`

## Child Validation Contract
- Child lane:
  - bounded docs packet and task mirror patch only
  - trailing-whitespace check on the six scoped CO-429 files
  - protected-term check across the six scoped CO-429 files
  - changed-path scope check for the six declared files
  - no full repo validation suites
- Parent lane:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - any required docs/task registry, PR, review, and closeout validation after patch import
