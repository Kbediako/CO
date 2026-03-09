---
id: 20260310-1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split
title: Coordinator Symphony-Aligned Standalone Review Diff/Audit Surface Split
status: active
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md
related_tasks:
  - tasks/tasks-1093-coordinator-symphony-aligned-standalone-review-diff-audit-surface-split.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Diff/Audit Surface Split

## Summary

Split standalone review into a default diff-only review surface and an explicit audit surface so bounded review stops carrying checklist/docs/evidence context by default.

## Scope

- Add an explicit review surface choice in `scripts/run-review.ts`.
- Make `diff` the default standalone-review surface.
- Move broader checklist/manifest/PRD/evidence verification context behind an explicit audit surface.
- Add targeted prompt-contract and runtime-path coverage.

## Out of Scope

- Native-review controller replacement.
- Removing existing runtime drift guards.
- Broad review CLI redesign outside the surface split.

## Notes

- 2026-03-10: Approved for docs-first registration based on current-file inspection of `scripts/run-review.ts`, `scripts/lib/review-execution-state.ts`, and `tests/run-review.spec.ts`, repeated drift evidence in the `1060`, `1085`, and `1091` closeouts, plus real Symphony reference inspection showing orchestration/control and observability/audit should remain separate surfaces. Evidence: `docs/findings/1093-standalone-review-diff-audit-surface-split-deliberation.md`.
