---
id: 20260106-metrics-pending-io-batching
title: Metrics Pending IO Batching
relates_to: docs/PRD-metrics-pending-io-batching.md
risk: low
owners:
  - Codex (top-level agent)
last_review: 2026-01-06
---

## Summary
- Objective: Reduce metrics aggregation I/O by batching pending merges and avoiding redundant aggregate recomputation.
- Constraints: Preserve ordering, formats, and lock semantics.

## Proposed Changes
- Architecture / design adjustments:
  - Batch append pending `.jsonl` entries per merge pass; remove files after successful append.
  - Recompute aggregates once after final pending merge.
- Data model updates:
  - None.
- External dependencies:
  - None.

## Impact Assessment
- User impact: Faster completion for runs with pending metrics.
- Operational risk: Low; scoped to metrics aggregation.
- Security / privacy: No impact.

## Rollout Plan
- Prerequisites: Diagnostics + RLM evidence recorded.
- Testing strategy: Existing metrics aggregator tests should pass; add targeted test if behavior changes.
- Launch steps: Merge after implementation-gate success.

## Open Questions
- Should we enforce a payload size cap for batching?

## Approvals
- Reviewer:
- Date:
