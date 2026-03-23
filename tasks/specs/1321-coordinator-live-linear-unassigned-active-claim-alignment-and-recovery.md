---
id: 20260323-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery
title: Coordinator Live Linear Unassigned Active-Claim Alignment and Recovery
status: in_progress
owner: Codex
created: 2026-03-23
last_review: 2026-03-23
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md
related_action_plan: docs/ACTION_PLAN-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md
related_tasks:
  - tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md
review_notes:
  - 2026-03-23: Pre-implementation review approved via docs-review manifest `.runs/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/cli/2026-03-23T10-29-46-034Z-08278ec8/manifest.json`; checklist mirrored in `tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`.
  - 2026-03-23: Opened after live `CO-3` remained `Merging` and recommended by `/api/v1/dispatch`, but persisted intake still recorded the claim as `released:assignee_changed`.
  - 2026-03-23: The current mismatch is internal to CO: fresh dispatch already accepts viewer-owned or unassigned issues, while existing-claim eligibility still treats `assignee_id: null` as a reassignment away from Codex.
  - 2026-03-23: The already-stuck live claim also needs a small refresh recovery seam because released claims currently reopen only on newer `updated_at`.
---

# Technical Specification

## Context

`1319` aligned the active workflow-state map and merge lifecycle, but live `CO-3` exposed one remaining internal inconsistency: active unassigned issues can still be recommended for fresh dispatch while existing claims on the same issue are released as `assignee_changed`. Because the current `CO-3` claim is already released, a narrow recovery seam is also required if the operator should not flip the issue again.

## Requirements

1. Register the lane across PRD, TECH_SPEC, ACTION_PLAN, checklist, `.agent` mirror, task registry, task snapshot, and docs freshness registry.
2. Capture the live `CO-3` contradiction across persisted intake, live `issue-context`, and authenticated `/api/v1/dispatch`.
3. Align existing active-claim eligibility with the fresh-dispatch unassigned-ownership rule.
4. Preserve explicit reassignment-away release behavior for non-null foreign assignees.
5. Add the smallest refresh recovery seam required for already-released misclassified claims at equal timestamp.
6. Run the required validation floor and prove the fix live on `CO-3`.

## Current Truth

- Live `CO-3` is still `Merging` / `started` with `assignee_id: null`.
- `/api/v1/dispatch` recommends `CO-3`.
- Persisted intake still says `released` with reason `provider_issue_released:assignee_changed`.
- `linearDispatchSource.ts` already treats unassigned issues as eligible for fresh dispatch.
- `providerIssueHandoff.ts` existing-claim eligibility and released-claim refresh recovery are the blocking seams.

## Validation Plan

- docs-review before code edits proceed
- focused `ProviderIssueHandoff` regressions for active unassigned claims and equal-timestamp released recovery
- full repo validation floor
- live local control-host retest on `CO-3`
