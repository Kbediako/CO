# Technical Spec — Tasks Archive Policy (Task 0924)

Source of truth for requirements: `tasks/0924-prd-tasks-archive-policy.md`.

## Objective
Keep `docs/TASKS.md` below a configured line-count threshold by archiving completed task snapshots to a dedicated archive branch.

## Scope
### In scope
- A policy config that defines the line threshold and archive branch details.
- A script that removes completed task sections when `docs/TASKS.md` exceeds the threshold.
- An archive file format stored on a non-main branch and linked from `docs/TASKS.md`.

### Out of scope
- Removing canonical task files under `tasks/` or `.agent/task/`.
- Changing task statuses or timestamps in `tasks/index.json`.
- External services or network calls.

## Design

### Archive policy config
- File: `docs/tasks-archive-policy.json`.
- Fields:
  - `version` (integer)
  - `max_lines` (integer)
  - `archive_branch` (string)
  - `archive_file_pattern` (string, uses `YYYY`)

### Archive selection rules
- Tasks with `status: succeeded` (or `gate.status: succeeded`) and a non-empty completion date are eligible. If `completed_at` is missing, the script falls back to the gate `run_id` date.
- Preserve all active/in-progress/approved tasks on main.
- When `docs/TASKS.md` exceeds `max_lines`, archive the oldest eligible tasks until the file is under the threshold.
- If a snapshot lacks a `docs-sync` block, the script archives the header-delimited snapshot section instead.

### Archive file format
- File location (archive branch): docs/TASKS-archive-YYYY.md (not present on main).
- Header includes generation date, source branch, and policy reference.
- Archived sections retain their original snapshots and `docs-sync` blocks for auditability.

### Script behavior
- Script: `scripts/tasks-archive.mjs`.
- Inputs:
  - `--policy <path>` (defaults to `docs/tasks-archive-policy.json`)
  - `--dry-run` (report-only)
  - `--out <path>` (archive payload output; defaults to `out/<task-id>/TASKS-archive-YYYY.md`)
- Outputs:
  - Updates `docs/TASKS.md` in-place when archiving occurs.
  - Writes the archive payload for the year to the output path.
  - Logs archived task keys and line-count deltas.

### docs/TASKS.md updates
- Add an "Archive index" section that links to the archive branch file (URL, not a repo path).
- Keep `docs/TASKS.md` focused on active + recent tasks.

## Testing Strategy
- Run the archive script in dry-run mode to confirm selection logic.
- Run `npm run docs:check` and `npm run docs:freshness` via docs-review/implementation-gate.

## Documentation & Evidence
- PRD: `docs/PRD-tasks-archive-policy.md`
- Action Plan: `docs/ACTION_PLAN-tasks-archive-policy.md`
- Task checklist: `tasks/tasks-0924-tasks-archive-policy.md`
- Mini-spec: `tasks/specs/0924-tasks-archive-policy.md`

## Assumptions
- Archive branch name: `task-archives`.
- `docs/TASKS.md` line-count threshold: 450 lines.

## Open Questions (for review agent)
- None.

## Approvals
- Engineering: Pending
- Reviewer: Pending
