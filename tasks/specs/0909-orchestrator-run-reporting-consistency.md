---
id: 20251221-orchestrator-run-reporting-consistency
title: Orchestrator Run Reporting Consistency
relates_to: Task 0909 / docs/PRD-orchestrator-run-reporting-consistency.md
risk: medium
owners:
  - Platform Enablement
last_review: 2025-12-21
---

## Summary
- Objective: Ensure grouped run summaries, scheduler finalization metadata, and metrics rollups reflect actual outcomes.
- Constraints: Minimal code changes, no schema expansion, no external locking dependencies.

## Proposed Changes
- Anchor grouped run summaries to the last processed subtask so top-level status reflects overall outcome.
- Avoid stamping completed timestamps when scheduler assignments are still running.
- Serialize metrics append + aggregation with a lightweight lock and bounded retries.

## Impact Assessment
- User impact: Run status reporting becomes more accurate and less misleading.
- Operational risk: Low to medium; changes are localized with test coverage.
- Security / privacy: No change.

## Rollout Plan
- Prerequisites: Update unit tests and ensure spec-guard freshness.
- Testing strategy: TaskManager group summary tests, SchedulerPlan finalization tests, metrics aggregation serialization checks.
- Launch steps: Ship code changes, run guardrails, update manifests and checklist evidence.

## Open Questions
- None.

## Approvals
- Reviewer:
- Date:
