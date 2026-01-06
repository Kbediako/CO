---
id: 20260106-metrics-pending-streaming-merge
title: Metrics Pending Streaming Merge
relates_to: docs/PRD-metrics-pending-streaming-merge.md
risk: low
owners:
  - Codex (top-level agent)
last_review: 2026-01-06
---

## Summary
- Objective: Stream pending merges line-by-line to bound memory even for oversized files and reduce parse hazards.
- Constraints: Preserve ordering, formats, and lock semantics; keep changes minimal.

## Proposed Changes
- Architecture / design adjustments:
  - Stream pending files line-by-line with mid-file batch caps.
  - Skip whitespace-only lines during pending merges.
  - Ignore whitespace-only lines when loading `metrics.json` for aggregates.
  - Ensure baseline creation precedes dependent aggregate writes.
  - Keep aggregate recomputation once after the final merge.
- Data model updates:
  - None.
- External dependencies:
  - None.

## Impact Assessment
- User impact: Lower risk of OOM or parse failures on backlog-heavy runs.
- Operational risk: Low; scoped to metrics aggregation.
- Security / privacy: No impact.

## Rollout Plan
- Prerequisites: Diagnostics + RLM evidence recorded.
- Testing strategy: Extend MetricsAggregator tests to cover mid-file flushing and whitespace filtering.
- Launch steps: Merge after implementation-gate success.

## Open Questions
- None.

## Approvals
- Reviewer:
- Date:
