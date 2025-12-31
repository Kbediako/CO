---
id: 20251231-tasks-archive-policy
title: Tasks Archive Policy
relates_to: docs/PRD-tasks-archive-policy.md
risk: low
owners:
  - Codex (top-level agent)
  - Review agent
last_review: 2025-12-31
---

## Added by Bootstrap 2025-10-16

## Summary
- Objective: Keep `docs/TASKS.md` under a line-count threshold by archiving completed task snapshots to a dedicated branch.
- Constraints:
  - No changes to canonical task files under `tasks/` or `.agent/task/`.
  - No external dependencies.

## Proposed Changes
- Architecture / design adjustments:
  - Add a policy config and archive script to split completed task sections into archive payloads.
- Data model updates:
  - `docs/tasks-archive-policy.json`.
- External dependencies:
  - None.

## Impact Assessment
- User impact: cleaner main branch task snapshot while retaining audits via archive branch.
- Operational risk: low; archive step is deterministic and guarded.
- Security / privacy: no new data flows.

## Rollout Plan
- Prerequisites:
  - Confirm archive branch name and line threshold.
- Testing strategy:
  - Run docs-review and implementation-gate; run archive script in dry-run mode first.
- Launch steps:
  - Apply initial archive pass and commit archive payload to the archive branch.

## Open Questions
- None.

## Approvals
- Reviewer:
- Date:
