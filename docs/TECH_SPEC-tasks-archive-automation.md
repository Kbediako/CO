# Technical Spec — Tasks Archive Automation (Task 0925)

Source of truth for requirements: `tasks/0925-prd-tasks-archive-automation.md`.

## Objective
Automate the tasks archive workflow and harden snapshot anchoring so completed task sections are archived safely and consistently.

## Scope
### In scope
- A CI workflow that runs the archive script, pushes archive payloads to `task-archives`, and opens a PR for `docs/TASKS.md` updates.
- A safety check in the archive script to ensure snapshot headers match the task key before archiving the header block.
- Updated agent guidance describing the automated flow and manual fallback.

### Out of scope
- Auto-merging archive PRs.
- Changes to archive thresholds or branch naming.
- Reformatting existing task snapshots beyond the archive action.

## Design

### Archive workflow automation
- Workflow file: `.github/workflows/tasks-archive-automation.yml`.
- Triggers:
  - `schedule` (daily) and `workflow_dispatch`.
  - `push` to `main` when `docs/TASKS.md` or the archive policy changes.
- Steps:
  - Checkout full history and install Node 20 deps.
  - Run `node scripts/tasks-archive.mjs` with `MCP_RUNNER_TASK_ID=tasks-archive-automation`.
  - Exit early when `docs/TASKS.md` is already under the threshold.
  - If `docs/TASKS.md` changed, copy archive payload(s) from `out/tasks-archive-automation/` into the `task-archives` branch and push.
  - Open or update a PR with the updated `docs/TASKS.md` snapshot using `peter-evans/create-pull-request`.
- Concurrency: single-run group to prevent overlapping archive attempts.
- Permissions: `contents: write` and `pull-requests: write`.

### Snapshot anchoring safety
- Parse the closest preceding `# Task List Snapshot` header and extract its key from the trailing parentheses.
- Only include the header block in the archive if the header key matches the task key (exact match or id match).
- If the header does not match, archive only the `docs-sync` block and log a warning.

### Manual fallback
- Continue to support `npm run docs:archive-tasks` for local/manual execution.
- Document the automated flow in agent guidance and in the task action plan.

## Testing Strategy
- Run the archive script in dry-run mode to confirm selection logic.
- Validate changes with docs-review and implementation-gate pipelines.

## Documentation & Evidence
- PRD: `docs/PRD-tasks-archive-automation.md`
- Action Plan: `docs/ACTION_PLAN-tasks-archive-automation.md`
- Task checklist: `tasks/tasks-0925-tasks-archive-automation.md`
- Mini-spec: `tasks/specs/0925-tasks-archive-automation.md`

## Assumptions
- GitHub Actions has permissions to push to `task-archives` and open PRs.
- Archive payloads live in docs/TASKS-archive-YYYY.md on the task-archives branch (not on main).

## Open Questions (for review agent)
- None.

## Approvals
- Engineering: Pending
- Reviewer: Pending
