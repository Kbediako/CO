---
id: 20260310-1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary
title: Coordinator Symphony-Aligned Standalone Review Audit Task-Context Boundary
status: active
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md
related_tasks:
  - tasks/tasks-1097-coordinator-symphony-aligned-standalone-review-audit-task-context-boundary.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Audit Task-Context Boundary

## Summary

Narrow audit-mode standalone review task context so the wrapper preserves task identity and canonical path targets without embedding checklist or PRD body content.

## Scope

- Update the audit-only task-context builder in `scripts/run-review.ts`.
- Preserve audit evidence surfaces and meta-surface guard behavior.
- Retarget focused audit prompt-shape tests in `tests/run-review.spec.ts`.
- Keep docs/task mirrors aligned with the new audit prompt contract.

## Out of Scope

- Native review controller replacement.
- Diff-mode prompt changes.
- Changes to `review-execution-state.ts`.
- The next `controlServer.ts` product seam.

## Notes

- 2026-03-10: Approved for docs-first registration based on the live `1095` audit drift evidence, the clean `1096` closeout, and a bounded `gpt-5.4` scout recommending audit task-context slimming before the next product seam. Evidence: `docs/findings/1097-standalone-review-audit-task-context-boundary-deliberation.md`, `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/14-next-slice-note.md`.
