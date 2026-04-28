---
id: 20260428-linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1
title: "CO: re-home March 28 docs freshness cohort owner"
status: in_progress
owner: Codex
created: 2026-04-28
last_review: 2026-04-28
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md
related_action_plan: docs/ACTION_PLAN-linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md
related_tasks:
  - tasks/tasks-linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md
review_notes:
  - 2026-04-28: Child lane scaffolded the packet; parent owns and completes owner re-home, registry/catalog validation, Linear state, workpad, and PR lifecycle.
  - 2026-04-28: Parent re-homed rolling owner metadata to live CO-420, declared the exact Mar 28 cohort, restored docs/TASKS reserve headroom through archive movement, and reran docs freshness/docs check validation.
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
---

# TECH_SPEC - CO: re-home March 28 docs freshness cohort owner

## Canonical Reference
- PRD: `docs/PRD-linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md`
- Task checklist: `tasks/tasks-linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md`
- Agent mirror: `.agent/task/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md`

## Summary
- Objective: re-home the March 28 Task Packet / Task Mirror cohort under live same-project `CO-420` while preserving `docs:freshness` and `docs:freshness:maintain` fail-closed owner checks.
- Scope:
  - CO-420 PRD, TECH_SPEC mirror, ACTION_PLAN, canonical spec, task checklist, and `.agent/task` mirror
  - `docs/docs-catalog.json` rolling owner metadata and declared March 28 baseline cohort
  - `docs/docs-freshness-registry.json`, `tasks/index.json`, and `docs/TASKS.md` mirrors
- Constraints:
  - preserve `docs:freshness` and `docs:freshness:maintain` behavior
  - do not broaden beyond the named March 28 cohort unless `docs:freshness:maintain` proves the same canonical owner debt
  - do not modify `CO-415` timeout logic

## Issue-Shaping Contract
- User-request translation:
  - CO-420 exists to create a live owner path for the March 28 task packet/mirror cohort and to let validation prove owner truth through `docs:freshness:maintain`.
  - The lane must preserve `blocking_changed_paths=[]` evidence and keep CO-415 timeout work out of scope.
- Protected terms / exact artifact and surface names:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `docs/docs-catalog.json`
  - `docs/docs-freshness-registry.json`
  - `CO-401`
  - `block_unowned_repo_debt`
  - `configured_owner_terminal`
  - `blocking_changed_paths=[]`
  - `March 28 task packet/mirror cohort`
  - `March 28 Task Packet / Task Mirror cohort`
  - `docs:freshness:maintain canonical owner key`
- Nearby wrong interpretations to reject:
  - Do not treat this as a `CO-415` timeout/core validation repair.
  - Do not bypass, mute, or weaken `docs:freshness` or `docs:freshness:maintain`.
  - Do not let terminal `CO-401` remain the live intended owner without re-home evidence.
  - Do not change `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, `tasks/index.json`, or `docs/TASKS.md` outside the scoped owner re-home and packet registration.
  - Do not widen into broad stale-docs cleanup outside the March 28 task packet/mirror cohort.
- Explicit non-goals:
  - no code changes
  - no script/test/package changes
  - no unrelated Linear mutations
  - no child-owned Linear or PR lifecycle work; parent owns workpad, review, PR, and handoff
  - no catalog or registry edits outside the CO-420 owner re-home and packet registration

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `docs:freshness:maintain` owner truth | Maintenance blocks with `block_unowned_repo_debt` because `CO-401` is terminal and `configured_owner_terminal` applies. | Terminal owner truth should fail closed until a live same-project owner is assigned. | CO-420 is the live same-project owner for the `docs:freshness:maintain canonical owner key`. | Changing maintenance classifier semantics. |
| `docs/docs-catalog.json` | Rolling freshness owner metadata points at terminal `CO-401`; March 28 candidate rows are not declared as a baseline cohort. | Catalog owner metadata should align to the current live maintenance owner and declare only intentional rolling cohorts. | Owner metadata points to `CO-420` and declares the exact March 28 Task Packet / Task Mirror baseline cohort. | Broadening caps, window, eligible classes, or unrelated baseline cohorts. |
| `docs/docs-freshness-registry.json` | March 28 rows remain machine-visible stale registry entries; CO-420 packet rows are absent. | Registry rows should stay visible unless directly reviewed/refreshed, and new packet rows must be registered. | March 28 rows remain visible under the declared rolling cohort; CO-420 packet rows are registered with current review evidence. | Hiding or deleting stale rows. |
| CO-415 | Separate timeout/core validation issue. | Docs freshness owner re-home should not alter runtime timeout behavior. | CO-420 remains docs-only owner alignment. | Any `CO-415` implementation or validation repair. |

## Technical Requirements
- Functional requirements:
  1. Create the six scoped packet files.
  2. Preserve every required protected term exactly.
  3. Re-home `docs/docs-catalog.json` rolling owner metadata from terminal `CO-401` to live `CO-420`.
  4. Declare the exact March 28 Task Packet / Task Mirror baseline cohort without changing caps or weakening freshness gates.
  5. Register CO-420 packet rows and task mirrors.
- Non-functional requirements:
- docs-only diff
  - no policy weakening language
  - clear handoff boundaries
  - concise enough for parent review
- Interfaces / contracts:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `docs/docs-catalog.json`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`
  - `docs/TASKS.md`

## Not Done If
- `docs:freshness:maintain` still reports `configured_owner_terminal` or `block_unowned_repo_debt` for the March 28 cohort.
- The March 28 stale rows are deleted, hidden, or blindly date-bumped instead of re-homed or reviewed.
- The packet omits `CO-401`, `block_unowned_repo_debt`, `configured_owner_terminal`, or `blocking_changed_paths=[]`.
- The packet frames gate weakening as acceptable.
- The packet implies `CO-415` timeout logic belongs to this lane.

## Acceptance Criteria
- All six scoped packet files exist and are internally cross-linked.
- PRD and canonical spec both contain the current/reference/target parity matrix.
- Baseline reports preserve the original `block_unowned_repo_debt`, `configured_owner_terminal`, terminal `CO-401`, and `blocking_changed_paths=[]` evidence.
- `docs/docs-catalog.json` points rolling owner metadata at live `CO-420` and declares the exact March 28 Task Packet / Task Mirror baseline cohort.
- Post-fix `docs:freshness:maintain` reports live `CO-420` ownership without `configured_owner_terminal` or `block_unowned_repo_debt`.
- `docs:freshness` and `docs:check` pass without weakening freshness policy.
- Task checklist tracks child-scaffold items, owner re-home, registry mirrors, and validation evidence.
- `.agent/task` mirror gives a concise resume surface for future agents.

## Validation Plan
- Child lane:
  - `git apply --check` and parent `child-lane accept` for the packet patch.
- Parent lane:
  - Baseline `npm run docs:freshness` report: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/before/docs-freshness.json`.
  - Baseline `docs:freshness:maintain -- --format json` report: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/before/docs-freshness-maintenance.json`.
  - Post-fix `npm run docs:freshness` report: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/docs-freshness.json`.
  - Post-fix `docs:freshness:maintain -- --format json` report: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/docs-freshness-maintenance.json`.
  - `node scripts/spec-guard.mjs --dry-run`: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/spec-guard-dry-run.log`.
  - `npm run docs:check`: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/docs-check.log`.

## Open Questions
- None.

## Approvals
- Reviewer: parent CO-420 lane
- Date: 2026-04-28
