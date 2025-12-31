# PRD — Tasks Archive Automation (0925)

## Summary
- Problem Statement: The tasks archive flow is manual, which risks `docs/TASKS.md` exceeding the line threshold and forces manual branch updates to keep archives accessible.
- Desired Outcome: Automate the archive workflow so a CI job trims `docs/TASKS.md`, pushes archive payloads to the `task-archives` branch, and opens a PR for review without data loss.

## Goals
- Automatically detect when `docs/TASKS.md` exceeds the configured line threshold and generate a PR with the updated snapshot.
- Sync archive payloads to the `task-archives` branch in the same automation run.
- Harden the archive script so it only archives sections anchored to the matching task key.

## Non-Goals
- Auto-merge archive PRs without review.
- Change the archive policy thresholds or branch naming.
- Alter canonical task files under `tasks/` or `.agent/task/` beyond docs-sync updates.

## Stakeholders
- Product: N/A
- Engineering: Codex (top-level agent)
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics: archive PRs open automatically when the threshold is exceeded; `docs/TASKS.md` remains under the limit after merge.
- Guardrails / Error Budgets: no loss of unrelated task snapshots during archiving; archives remain reachable on `task-archives`.

## User Experience
- Personas: Repo maintainers and reviewers.
- User Journeys: CI opens a PR when the task snapshot is too large; reviewers merge it, and archives remain discoverable.

## Technical Considerations
- Architectural Notes: add a GitHub Actions workflow that runs the archive script, pushes archive payloads to `task-archives`, and opens a PR for the main branch update.
- Dependencies / Integrations: GitHub Actions, `peter-evans/create-pull-request` action.

## Open Questions
- None.

## Approvals
- Product: Pending
- Engineering: Pending
- Design: N/A
