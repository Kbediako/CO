---
id: 20251231-docs-freshness-date-validation
title: Docs Freshness Date Validation
relates_to: docs/PRD-docs-freshness-date-validation.md
risk: low
owners:
  - Codex (top-level agent)
  - Review agent
last_review: 2025-12-31
---

## Added by Bootstrap 2025-10-16

## Summary
- Objective: Reject malformed `last_review` dates in docs freshness registry validation.
- Constraints:
  - No external date parsing dependencies.
  - No schema changes to the registry format.

## Proposed Changes
- Architecture / design adjustments:
  - Tighten `parseReviewDate` to verify UTC components match the parsed year/month/day.
- Data model updates:
  - None.
- External dependencies:
  - None.

## Impact Assessment
- User impact: invalid dates are flagged early, avoiding false passes.
- Operational risk: low; valid entries remain unchanged.
- Security / privacy: no new data flows.

## Rollout Plan
- Prerequisites:
  - Registry entries reviewed for malformed dates.
- Testing strategy:
  - Run `npm run docs:freshness` and implementation-gate guardrails.
- Launch steps:
  - Merge after review-agent approval.

## Open Questions
- None.

## Approvals
- Reviewer:
- Date:
