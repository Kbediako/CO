---
id: 20260309-1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening
title: Coordinator Symphony-Aligned Control Server Seeded Runtime Bundle Boundary Tightening
status: active
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md
related_tasks:
  - tasks/tasks-1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Seeded Runtime Bundle Boundary Tightening

## Summary

Tighten the seeded-runtime assembly and `ControlServer` startup contract around one shared runtime bundle so the server no longer stores duplicated runtime pieces that already live inside `requestContextShared`, and move the linear advisory state filename constant to a neutral owner used by both the seed loader and the seeded-runtime assembly.

## Scope

- Tighten the seeded-runtime assembly return contract around one shared runtime bundle.
- Update `ControlServer` to consume that tighter bundle without changing startup behavior.
- Move the linear advisory state filename constant to a neutral owner used by both the read and write paths.

## Out of Scope

- Changes to control runtime behavior.
- Changes to request-shell, bootstrap-lifecycle, or startup-sequence behavior.
- Changes to route/controller logic.
- Broad runtime refactors outside the seeded-runtime/startup boundary.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1086`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/12-elegance-review.md`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/14-next-slice-note.md`, `docs/findings/1087-control-server-seeded-runtime-bundle-boundary-tightening-deliberation.md`.
