---
id: 20251231-tasks-archive-automation
title: Tasks Archive Automation
relates_to: docs/PRD-tasks-archive-automation.md
risk: low
owners:
  - Codex (top-level agent)
  - Review agent
last_review: 2025-12-31
---

## Added by Bootstrap 2025-10-16

## Summary
- Objective: Automate tasks archiving and add safety checks so task snapshots are archived without losing unrelated sections.
- Constraints:
  - Keep archive payloads off the main branch.
  - Avoid auto-merging archive PRs.

## Proposed Changes
- Architecture / design adjustments:
  - Add a GitHub Actions workflow to run the archive script and open a PR.
  - Harden section anchoring in `scripts/tasks-archive.mjs`.
- Data model updates:
  - None.
- External dependencies:
  - `peter-evans/create-pull-request` GitHub Action.

## Impact Assessment
- User impact: reduced manual effort to keep `docs/TASKS.md` under the threshold.
- Operational risk: low; workflow runs on a schedule and only opens a PR when changes occur.
- Security / privacy: no new external data flows beyond GitHub Actions.

## Rollout Plan
- Prerequisites:
  - Confirm workflow permissions for pushing to `task-archives`.
- Testing strategy:
  - Run docs-review and implementation-gate; verify a dry-run archive locally.
- Launch steps:
  - Merge the workflow and monitor the first scheduled run.

## Open Questions
- None.

## Approvals
- Reviewer:
- Date:
