# PRD — Implementation Docs Archive Automation (0926)

## Summary
- Problem Statement: Implementation docs (PRDs, specs, action plans, task checklists) accumulate on main, increasing noise and maintenance overhead. `docs/TASKS.md` is still large at ~900 lines, and stray documentation is not systematically archived.
- Desired Outcome: Lower the task snapshot line threshold and add automation + policy to archive completed implementation docs to a dedicated archive branch while keeping lightweight stubs on main and preserving auditability.

## Goals
- Reduce the `docs/TASKS.md` line limit to roughly half the current size and archive completed snapshots to stay within the cap.
- Automate archiving of implementation docs (PRD/TECH_SPEC/ACTION_PLAN, task checklists, mini-specs, mirrors) for completed tasks.
- Identify stray implementation docs not mapped to `tasks/index.json` and archive them based on a documented policy.
- Keep docs-freshness coverage intact while replacing archived docs with lightweight stubs.
- Preserve auditability by storing full documents on an archive branch.

## Non-Goals
- Deleting canonical task records from `tasks/index.json`.
- Auto-merging archive PRs without review.
- Changing the Status UI data model or pipeline outputs.
- Removing archives from remote access.

## Stakeholders
- Product: N/A
- Engineering: Codex (top-level agent), Review agent
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics: `docs/TASKS.md` remains under the new line threshold; archive automation opens PRs when needed; archived docs remain reachable on the archive branch.
- Guardrails / Error Budgets: no data loss (stubs always link to archived content); docs-freshness remains green.

## User Experience
- Personas: Repo maintainers and reviewers.
- User Journeys: automation opens a PR with stub updates; reviewers merge; full docs are discoverable via archive branch links.

## Technical Considerations
- Architectural Notes: add a policy file, a doc-archive script, and a scheduled workflow that pushes archive payloads to a branch and opens a PR for main updates.
- Dependencies / Integrations: GitHub Actions and `peter-evans/create-pull-request`.

## Open Questions
- None.

## Approvals
- Product: Pending
- Engineering: Pending
- Design: N/A
