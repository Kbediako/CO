# PRD — Tasks Archive Policy (0924)

## Summary
- Problem Statement: `docs/TASKS.md` keeps growing, increasing noise and merge conflicts. It is still useful for active work, but older completed tasks should not crowd the main branch.
- Desired Outcome: Keep `docs/TASKS.md` under a line-count threshold by archiving completed task snapshots to a dedicated archive branch that remains remotely accessible.

## Goals
- Enforce a line-count threshold for `docs/TASKS.md`.
- Move completed task snapshots to an archive branch when the threshold is exceeded.
- Keep main branch clean while preserving auditability via archived snapshots.

## Non-Goals
- Removing or changing canonical task files under `tasks/` or `.agent/task/`.
- Changing the status or lifecycle of tasks in `tasks/index.json`.
- Introducing external dependencies or networked services.

## Stakeholders
- Product: N/A
- Engineering: Codex (top-level agent)
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics: `docs/TASKS.md` remains below the configured line threshold after archiving.
- Guardrails / Error Budgets: no loss of task snapshot content; archives remain accessible on the archive branch.

## User Experience
- Personas: Repo maintainers and reviewers.
- User Journeys: run the archive script when `docs/TASKS.md` exceeds the threshold and find archived snapshots via the branch link.

## Technical Considerations
- Architectural Notes: add an archive policy config and a script to move completed task sections based on line count.
- Dependencies / Integrations: Git branch for archives (no new services).

## Open Questions
- None.

## Approvals
- Product: Pending
- Engineering: Pending
- Design: N/A
