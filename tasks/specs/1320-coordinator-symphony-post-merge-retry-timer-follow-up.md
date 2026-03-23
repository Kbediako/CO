---
id: 20260323-1320-coordinator-symphony-post-merge-retry-timer-follow-up
title: Coordinator Symphony Post-Merge Retry-Timer Follow-Up
status: in_progress
owner: Codex
created: 2026-03-23
last_review: 2026-03-23
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-post-merge-retry-timer-follow-up.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-post-merge-retry-timer-follow-up.md
related_tasks:
  - tasks/tasks-1320-coordinator-symphony-post-merge-retry-timer-follow-up.md
review_notes:
  - 2026-03-23: Opened after post-merge `main` run `23425656167` failed in `Core Lane` `Test` on a single `ProviderIssueHandoff` retry-timer case.
  - 2026-03-23: The merge-triggering diff did not touch `ProviderIssueHandoff` runtime files, and local repeated targeted runs pass, so the leading diagnosis is CI-only test brittleness rather than a fresh runtime parity gap.
  - 2026-03-23: No additional live Linear workflow status is required for this follow-up; the issue, if created, should use the existing CO team workflow.
---

# Technical Specification

## Context

`1319` closed the real end-to-end Symphony operational parity gaps. A later post-merge `main` run failed on one `ProviderIssueHandoff` retry-timer test. The failure is narrow, reproducibility is weak locally, and the touched merge diff did not alter the provider handoff runtime. `1320` is therefore a bounded post-merge stability lane, not another broad parity claim.

## Requirements

1. Register the lane across PRD, TECH_SPEC, ACTION_PLAN, checklist, `.agent` mirror, task registry, task snapshot, and docs freshness registry.
2. Capture exact GitHub evidence for run `23425656167` / job `68139836805`.
3. Determine whether the failure is runtime behavior or test brittleness.
4. Create a follow-up Linear issue if safely possible from current credentials.
5. Prefer a test-only stabilization unless a runtime bug is reproduced.
6. Run the required validation floor and deliver the follow-up through PR/merge.

## Current Truth

- Failing test: `createProviderIssueHandoffService > cancels and replaces queued retry ownership when a newer persisted due_at supersedes an older timer`
- File: `orchestrator/tests/ProviderIssueHandoff.test.ts`
- Failure mode: `Condition not met after 256 timer turns.`
- Local targeted runs pass, including repeated stress.
- No new live Linear status creation is required.

## Validation Plan

- docs-review before code edits proceed
- focused repeated `ProviderIssueHandoff` retry-timer validation
- full repo validation floor
- PR checks to terminal green before merge
