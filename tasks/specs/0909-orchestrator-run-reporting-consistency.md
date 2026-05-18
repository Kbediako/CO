---
id: 20251221-orchestrator-run-reporting-consistency
title: Orchestrator Run Reporting Consistency
status: done
relates_to: Task 0909 / docs/PRD-orchestrator-run-reporting-consistency.md
risk: medium
owners:
  - Codex (top-level agent)
  - Review agent
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (16 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
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
- Reviewer: Codex review agent
- Date: 2025-12-21
