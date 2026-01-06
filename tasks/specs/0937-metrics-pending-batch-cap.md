---
id: 20260106-metrics-pending-batch-cap
title: Metrics Pending Batch Cap
relates_to: docs/PRD-metrics-pending-batch-cap.md
risk: low
owners:
  - Codex (top-level agent)
last_review: 2026-01-06
---

## Summary
- Objective: Cap batch size during pending merges to bound memory and duplication blast radius.
- Constraints: Preserve ordering, formats, and lock semantics; keep changes minimal.

## Proposed Changes
- Architecture / design adjustments:
  - Track batch size (bytes/lines) and flush incrementally while preserving filename order.
  - Keep aggregate recomputation once after the final merge.
- Data model updates:
  - None.
- External dependencies:
  - None.

## Impact Assessment
- User impact: Lower risk of OOM or large duplicate merges on backlog-heavy runs.
- Operational risk: Low; scoped to metrics aggregation.
- Security / privacy: No impact.

## Rollout Plan
- Prerequisites: Diagnostics + RLM evidence recorded.
- Testing strategy: Extend MetricsAggregator tests to cover batch cap flushing and ordering.
- Launch steps: Merge after implementation-gate success.

## Open Questions
- What default cap values are safe across typical environments?

## Approvals
- Reviewer:
- Date:
