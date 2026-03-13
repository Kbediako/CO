---
id: 20260227-0982-docs-relevance-and-dummy-repo-validation-followup
title: Docs Relevance + Dummy Repo Validation Follow-up
relates_to: tasks/tasks-0982-docs-relevance-and-dummy-repo-validation-followup.md
risk: medium
owners:
  - Codex
last_review: 2026-02-27
---

## Summary
- Objective: align docs/task state after 0981 merge and collect durable dummy/simulated runtime validation evidence.
- Scope: high-signal state fixes (0981/0980 drift), task mirror sync, dummy repo simulations, ordered validation gates.
- Constraints: minimal doc/state edits only, no runtime redesign.

## Decision and Success Criteria
- Decision:
  - Treat stale post-merge lifecycle statements as high-signal documentation defects.
  - Prioritize targeted correction over broad historical rewrite.
  - Add explicit dummy simulations for fallback and unsupported mode combinations.
- Success criteria:
  - 0981 handoff completion reflected consistently in `tasks/`, `.agent/task/`, `docs/TASKS.md`, and `tasks/index.json`.
  - Dummy simulations pass with logs under `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/`.
  - Required gate sequence passes with evidence.

## Technical Requirements
- Functional requirements:
  - Update stale lifecycle/checklist/index entries identified by delegated docs audit.
  - Execute and log dummy scenarios:
    - pack smoke
    - appserver requested review with forced fallback to CLI
    - unsupported `cloud + appserver` fail-fast
- Non-functional requirements:
  - Evidence-first updates with clear paths.
  - Preserve operational compatibility and control-plane behavior.

## Architecture & Data
- Architecture / design adjustments:
  - None.
- Data model changes / migrations:
  - `tasks/index.json` metadata normalization for accuracy.
- External dependencies / integrations:
  - npm pack/install, CLI commands.

## Validation Plan
- Ordered validation gates 1-10 per repo policy.
- Additional simulation evidence in `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/`.

## Open Questions
- Whether to schedule a separate archive/index normalization sweep beyond 0980/0981.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-27
