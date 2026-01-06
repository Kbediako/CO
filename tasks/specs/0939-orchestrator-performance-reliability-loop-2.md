---
id: 20260106-0939-perf-reliability-loop-2
title: Orchestrator Performance & Reliability Loop 2
relates_to: tasks/tasks-0939-orchestrator-performance-reliability-loop-2.md
risk: medium
owners:
  - Codex
last_review: 2026-01-06
---

## Summary
- Objective: Target the next highest-impact performance hotspot in core orchestrator pipelines (initial focus: metrics aggregation full-file reads).
- Constraints: Keep diffs small, avoid major refactors, and preserve pipeline behavior.

## Proposed Changes
- Architectural design adjustments:
  - Stream `metrics.json` line-by-line to compute aggregates without full-file reads.
  - Use atomic writes for aggregate outputs to avoid partial files on crash.
- Data model updates: None.
- External dependencies: None.

## Impact Assessment
- User impact: Faster diagnostics and more reliable runs for agents and reviewers.
- Operational risk: Medium; targeted changes may affect pipeline timing or ordering.
- Security / privacy: No changes.

## Rollout Plan
- Prerequisites: Diagnostics + RLM discovery evidence captured.
- Testing strategy: Targeted unit tests plus implementation gate validation.
- Launch steps: Merge after implementation gate and checklist updates.

## Open Questions
- Do we need incremental aggregate state or log rotation in a future loop if streaming alone is insufficient?

## Approvals
- Reviewer: TBD
- Date: TBD
