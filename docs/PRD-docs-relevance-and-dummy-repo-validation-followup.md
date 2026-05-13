# PRD - Docs Relevance + Dummy Repo Validation Follow-up (0982)

## Summary
- Problem Statement: task 0981 merged successfully, but several task tracking/docs status surfaces still report it as in-progress, and follow-up durable dummy-repo evidence should be refreshed in one place.
- Desired Outcome: bring repository docs/task state into accurate post-merge alignment and produce explicit dummy/simulated downstream validation artifacts proving CO/runtime behavior remains correct.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): execute a follow-up that ensures docs are current/relevant and confirm CO changes in realistic mock/dummy repo simulations.
- Success criteria / acceptance:
  - Docs-first artifacts created for this follow-up task.
  - High-signal stale docs/task state fixed (at minimum 0981/0980 drift items found in audit).
  - Dummy repo simulations executed with durable logs under `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/`.
  - Ordered validation gates pass with evidence.
- Constraints / non-goals:
  - Minimal, targeted changes only; no unrelated refactors.
  - Keep CO control-plane semantics unchanged.
  - Non-destructive git workflow.

## Goals
- Correct post-merge lifecycle state for task 0981 (and adjacent stale index/task status drift where clearly inconsistent).
- Ensure checklist/task mirror consistency across `tasks/`, `.agent/task/`, `docs/TASKS.md`, and `tasks/index.json`.
- Capture at least one explicit appserver->cli fallback simulation and one unsupported combo fail-fast simulation in dummy repos.

## Non-Goals
- Re-implement runtime migration logic from 0981.
- Broad editorial rewrites of all historical docs.
- Changing runtime defaults/rollout decisions.

## Stakeholders
- Product: CO maintainers tracking shipped state and readiness.
- Engineering: operators/agents relying on docs and task registry accuracy.
- Design: n/a.

## Metrics & Guardrails
- Primary Success Metrics:
  - 0 high-severity stale lifecycle statements for active 0981/0980 follow-up surfaces.
  - Dummy simulation scenarios produce expected runtime/fallback/fail-fast signals.
- Guardrails / Error Budgets:
  - No schema or runtime behavior regressions.
  - Required gates pass in order with evidence logs.

## User Experience
- Personas: maintainers, reviewers, downstream users validating packaged CO behavior.
- User Journeys:
  - Read `docs/TASKS.md`/task files and see accurate merged status.
  - Run packaged CLI in dummy repos and observe expected review/runtime behavior.

## Technical Considerations
- Architectural Notes:
  - Docs/task index state alignment only; no architecture redesign.
  - Dummy simulations leverage existing `pack:smoke` and targeted CLI commands.
- Dependencies / Integrations:
  - `npm run pack:smoke`
  - runtime mode routing and fallback already implemented in 0981.

## Open Questions
- Should additional older task index entries (beyond 0980/0981) be normalized in a separate archival cleanup task?

## Approvals
- Product: self-approved (task owner)
- Engineering: self-approved (task owner)
- Design: n/a
