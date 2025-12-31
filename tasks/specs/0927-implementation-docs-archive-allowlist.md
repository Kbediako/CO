---
id: 20251231-implementation-docs-archive-allowlist
title: Implementation Docs Archive Allowlist
relates_to: docs/PRD-implementation-docs-archive-allowlist.md
risk: low
owners:
  - Codex (top-level agent)
  - Review agent
last_review: 2025-12-31
---

## Added by Bootstrap 2025-10-16

## Summary
- Objective: Add allowlist controls to the implementation-docs archive policy.
- Constraints:
  - Keep archive workflow behavior unchanged.
  - Avoid altering docs-freshness cadence defaults.

## Proposed Changes
- Architecture / design adjustments:
  - Extend policy with allowlist task keys and path patterns.
  - Skip allowlisted docs during archiving with explicit reporting.
- Data model updates:
  - None.
- External dependencies:
  - None.

## Impact Assessment
- User impact: maintainers can keep critical docs on main.
- Operational risk: low; allowlist only skips archive actions.
- Security / privacy: no new data flows.

## Rollout Plan
- Prerequisites:
  - None.
- Testing strategy:
  - Run docs-review and implementation-gate pipelines.
- Launch steps:
  - Merge policy + script updates and monitor the next archive run.

## Open Questions
- None.

## Approvals
- Reviewer:
- Date:
