---
id: 20260323-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery
title: Coordinator Live Linear Unassigned Active-Claim Alignment and Recovery
status: in_progress
owner: Codex
created: 2026-03-23
last_review: 2026-06-17
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md
related_action_plan: docs/ACTION_PLAN-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md
related_tasks:
  - tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-03-23: Pre-implementation review approved via docs-review manifest `.runs/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/cli/2026-03-23T10-29-46-034Z-08278ec8/manifest.json`; checklist mirrored in `tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`.
  - 2026-03-23: Opened after live `CO-3` remained `Merging` and recommended by `/api/v1/dispatch`, but persisted intake still recorded the claim as `released:assignee_changed`.
  - 2026-03-23: The current mismatch is internal to CO: fresh dispatch already accepts viewer-owned or unassigned issues, while existing-claim eligibility still treats `assignee_id: null` as a reassignment away from Codex.
  - 2026-03-23: The already-stuck live claim also needs a small refresh recovery seam because released claims currently reopen only on newer `updated_at`.
  - 2026-04-23: CO-321 freshness review retained this as an active historical remediation spec rather than archive/reclassification. The checklist records implementation, focused regressions, validation floor, and live `CO-3` recovery proof as complete; separate delivery closeout checkboxes remain in the task mirror and stay outside this tasks/specs-only refresh.
  - 2026-05-18: CO-522 active-spec audit found 3 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
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

- The original live `CO-3` mismatch is no longer the current blocker. The related checklist records the patched control-host retest reclaiming `CO-3` from `Merging`, running the provider worker to terminal success, updating the workpad, attaching merged PR `#288`, and leaving `/api/v1/dispatch` without stale issue leakage.
- `providerIssueHandoff.ts` active-claim eligibility now treats unassigned active issues consistently with fresh dispatch instead of releasing them as `provider_issue_released:assignee_changed`.
- The equal-timestamp released-claim recovery seam is implemented and covered by focused regressions while preserving explicit release behavior for non-null foreign assignees.
- Separate delivery closeout checkboxes remain in `tasks/tasks-1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`; this CO-321 refresh does not broaden into the already refreshed `tasks/tasks-*` cohort.

## Validation Plan

- docs-review before code edits proceed
- focused `ProviderIssueHandoff` regressions for active unassigned claims and equal-timestamp released recovery
- full repo validation floor
- live local control-host retest on `CO-3`
