---
id: 20260311-1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary
title: Coordinator Symphony-Aligned Standalone Review Bounded Relevant Reinspection Dwell Boundary
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md
related_tasks:
  - tasks/tasks-1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Bounded Relevant Reinspection Dwell Boundary

## Summary

Tighten standalone review so repetitive bounded relevant reinspection of the same touched files and adjacent relevant helpers/tests fails explicitly instead of ending as a generic timeout.

## Scope

- Add a dedicated dwell boundary for repetitive bounded relevant reinspection after startup-anchor success.
- Keep the boundary distinct from off-task meta-surface drift and closeout-bundle rereads.
- Add focused regression coverage for the new dwell contract.

## Out of Scope

- Native review replacement.
- Broad review-wrapper redesign.
- Reopening prior closeout-bundle or shell-probe slices.
- Automatic no-findings declaration for long relevant reviews.

## Notes

- 2026-03-11: Registered after `1119` closed. Current evidence shows the remaining residual review issue is repetitive bounded reinspection of the same touched files and adjacent relevant helpers/tests after startup-anchor success, not off-task meta-surface drift. Evidence: `docs/findings/1120-standalone-review-bounded-relevant-reinspection-dwell-boundary-deliberation.md`, `out/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary/manual/20260311T122853Z-closeout/09-review.log`, `.runs/1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary-scout/cli/2026-03-11T12-13-09-171Z-7ef52029/review/telemetry.json`.
