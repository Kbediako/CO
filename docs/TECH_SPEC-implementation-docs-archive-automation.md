# Technical Spec — Implementation Docs Archive Automation (Task 0926)

Source of truth for requirements: `tasks/0926-prd-implementation-docs-archive-automation.md`.

## Objective
Automate archiving of implementation documentation so completed task artifacts move off main (with lightweight stubs preserved), while keeping audits possible via an archive branch.

## Scope
### In scope
- A policy file defining archive thresholds, doc categories, and archive branch details.
- A script that:
  - Selects completed-task docs and stray implementation docs.
  - Applies retention + line-count rules.
  - Writes archive payloads and replaces main-branch files with stubs.
  - Updates the docs freshness registry for archived entries.
- A GitHub Actions workflow that runs on schedule and opens a PR when archive updates are needed.
- Reduce `docs/TASKS.md` line threshold to ~450 and archive completed snapshots accordingly.

### Out of scope
- Auto-merging archive PRs.
- Changing Status UI data schemas or data generation.
- Deleting archives or removing remote access to archived docs.

## Design

### Archive policy
- Policy file: `docs/implementation-docs-archive-policy.json`.
- Fields:
  - `archive_branch`: branch holding archived docs (e.g., `doc-archives`).
  - `repo_url`: canonical repo URL for stub links.
  - `retain_days`: minimum age (based on task completion) before archiving.
  - `stray_retain_days`: minimum age (based on docs freshness `last_review`) for stray docs.
  - `max_lines`: line-count threshold for forced archiving.
  - `archived_cadence_days`: cadence for archived docs in the registry.
  - `doc_patterns`: glob-like patterns for implementation docs (PRD/TECH_SPEC/ACTION_PLAN, task checklists, mini-specs, mirrors).
  - `exclude_paths`: explicit paths that should never be archived (e.g., `docs/PRD.md`).
  - `allowlist_task_keys`: task keys whose linked docs should never be archived.
  - `allowlist_paths`: glob-style path patterns that should never be archived.

### Archiver script
- Script: `scripts/implementation-docs-archive.mjs`.
- Inputs:
  - `docs/implementation-docs-archive-policy.json`.
  - `tasks/index.json`.
  - `docs/docs-freshness-registry.json`.
- Selection logic:
  - Task-linked docs: resolve doc references from task PRDs plus standard mirrors (`tasks/tasks-*`, `tasks/specs/*`, `.agent/task/*`). Skip allowlisted task keys or paths; otherwise archive only when task status is `succeeded` and retention or line thresholds are met (or the registry marks the doc as archived).
  - Stray docs: match policy doc patterns not referenced by tasks. Skip allowlisted paths; otherwise archive when `last_review` age exceeds `stray_retain_days` or line threshold is exceeded (or the registry marks them archived).
- Outputs:
  - Archive payloads written to `out/<task-id>/docs-archive/**` (full content at original paths).
  - Report written to `out/<task-id>/docs-archive-report.json` listing archived, skipped, and stray candidates.
- Stub format:
  - Preserve the top-level title, add an archive notice, and include a link to the archive branch.
  - Include a `<!-- docs-archive:stub -->` marker to prevent repeated archiving.
- Registry updates:
  - Mark archived docs as `status: archived` and refresh `last_review`.
  - No-op runs leave the registry unchanged to avoid stub-only diffs when no archives are produced.

### Workflow automation
- Workflow file: `.github/workflows/implementation-docs-archive-automation.yml`.
- Triggers:
  - `schedule` and `workflow_dispatch`.
  - `push` on main for policy/script/task index changes.
- Steps:
  - Run the archiver script with `MCP_RUNNER_TASK_ID=implementation-docs-archive-automation`.
  - If files changed, copy archive payloads to the `doc-archives` branch and push.
  - Open a PR for the main branch updates.

### Tasks archive threshold update
- Update `docs/tasks-archive-policy.json` `max_lines` to ~450.
- Refresh the tasks archive payload and `docs/TASKS.md` snapshot.

### Status UI impact
- None: Status UI reads `tasks/index.json` and run artifacts, not the implementation doc contents.

## Testing Strategy
- Run the archiver script in dry-run mode to confirm candidate selection.
- Validate changes with docs-review and implementation-gate pipelines.

## Documentation & Evidence
- PRD: `docs/PRD-implementation-docs-archive-automation.md`
- Action Plan: `docs/ACTION_PLAN-implementation-docs-archive-automation.md`
- Task checklist: `tasks/tasks-0926-implementation-docs-archive-automation.md`
- Mini-spec: `tasks/specs/0926-implementation-docs-archive-automation.md`

## Assumptions
- GitHub Actions has permission to push to `doc-archives` and open PRs.
- Archive payloads live on the archive branch, not on main.

## Open Questions (for review agent)
- None.

## Approvals
- Engineering: Pending
- Reviewer: Pending
