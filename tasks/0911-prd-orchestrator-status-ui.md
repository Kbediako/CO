# PRD - Orchestrator Status UI (0911-orchestrator-status-ui)

## Summary
- Problem Statement: Operators and contributors lack a visual, unified view of orchestrator runs and codebase activity; they rely on scattered manifests, logs, and git commands to understand what is happening.
- Desired Outcome: A lightweight, dark-themed, read-only dashboard that summarizes task and run status (active, ongoing, complete, pending) plus codebase health signals using existing local artifacts.

## Goals
- Provide a monitoring-style overview that buckets tasks into active, ongoing, complete, and pending.
- Provide run detail views that explain why a task is in a given bucket.
- Surface codebase status (branch, last commit, dirty/untracked, diff stats) alongside orchestrator data for human operators.
- Use only local artifacts and read-only access; no new backend or schema changes.
- Keep the UI dark themed and readable for long sessions.

## Non-Goals
- No run control actions (stop, retry, resume) in the UI.
- No new persistence format or database.
- No remote hosting, authentication, or multi-user permissions.
- No changes to orchestrator pipeline behavior or manifests.

## Stakeholders
- Product: Platform Enablement (TBD)
- Engineering: Orchestrator Foundations (TBD)
- Design: Monitoring UI (TBD)

## Metrics & Guardrails
- Primary Success Metrics:
  - Overview renders in under 1 second from local artifacts.
  - Status refresh cadence between 2 and 5 seconds without UI stalls.
  - Task bucket counts match the latest run artifacts with zero false positives.
- Guardrails / Error Budgets:
  - Read-only access to `.runs/`, `out/`, and git data.
  - No network access required at runtime.
  - Log tail capped to prevent memory spikes.

## User Experience
- Personas:
  - Platform engineer monitoring multiple runs.
  - Reviewer verifying whether a task is blocked or complete.
  - Contributor checking if local changes align with orchestrator runs.
- User Journeys:
  - Open the overview and see task buckets, recent activity, and codebase health at a glance.
  - Filter to a task and open run detail to see stage progress and approval state.
  - Cross-check the codebase panel to confirm local changes that may explain run status.

## Technical Considerations
- Data Sources: `.runs/<task-id>/cli/<run-id>/manifest.json`, `.runs/<task-id>/metrics.json`, `out/<task-id>/state.json`, `out/<task-id>/runs.json`, `tasks/index.json`, `tasks/tasks-*.md`, and local git metadata.
- Status Classification: Use run status plus heartbeat and timestamps to bucket tasks into active, ongoing, complete, or pending.
- Visual Direction: Dark theme with strong status accents and compact panel framing.
- Spec Link: `tasks/specs/0911-orchestrator-status-ui.md`.

## Research Summary
- Grafana dashboards emphasize a panel grid with global filters and strong visual hierarchy. Source: https://grafana.com/docs/grafana/latest/dashboards/
- Grafana variables show how global filters are surfaced as top-level dropdowns. Source: https://grafana.com/docs/grafana/latest/dashboards/variables/
- Elastic dashboards highlight interactive panels, filters, and time range controls. Source: https://www.elastic.co/docs/explore-analyze/dashboards
- New Relic dashboards treat the dashboard index as a first-class surface with search and metadata. Source: https://docs.newrelic.com/docs/query-your-data/explore-query-data/dashboards/introduction-dashboards/

## Open Questions
- Should blocked or stalled tasks be shown as a separate badge within the active bucket, or as their own bucket?
- Which git signals are most valuable for non-engineering stakeholders (ahead/behind, dirty files, or diff stat)?
- Is a local-only static server acceptable, or should the UI be viewable via file:// with a bundled data file?

## Approvals
- Product: Pending
- Engineering: Pending
- Design: Pending
