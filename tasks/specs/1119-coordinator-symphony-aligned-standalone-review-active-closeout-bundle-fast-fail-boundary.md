---
id: 20260311-1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary
title: Coordinator Symphony-Aligned Standalone Review Active Closeout Bundle Fast-Fail Boundary
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md
related_tasks:
  - tasks/tasks-1119-coordinator-symphony-aligned-standalone-review-active-closeout-bundle-fast-fail-boundary.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Active Closeout Bundle Fast-Fail Boundary

## Summary

Tighten standalone review so post-anchor active closeout-bundle rereads fail promptly instead of spending the full timeout budget inside the task's own closeout artifacts.

## Scope

- Add a fast-fail boundary for post-anchor `review-closeout-bundle` rereads.
- Preserve current telemetry/reasoning around `review-closeout-bundle`.
- Add focused regression coverage for the `1118`-style drift path.

## Out of Scope

- Whole-file probe or harness-env work.
- Audit-mode allowance changes.
- Native review replacement or broad wrapper redesign.
- Historical closeout rewrites beyond bounded superseding notes.

## Notes

- 2026-03-11: Registered after `1118` closed. Current evidence shows the remaining residual review issue is post-anchor active closeout-bundle reread drift, not `tests/run-review.spec.ts` determinism. Evidence: `docs/findings/1119-standalone-review-active-closeout-bundle-fast-fail-boundary-deliberation.md`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/09-review.log`, `out/1118-coordinator-symphony-aligned-standalone-review-run-review-spec-whole-file-probe-truthfulness/manual/20260311T113742Z-closeout/13-override-notes.md`.
