---
id: 20260310-1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction
title: Coordinator Symphony-Aligned Control Server Ready-Instance Startup Composition Extraction
status: active
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md
related_tasks:
  - tasks/tasks-1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Ready-Instance Startup Composition Extraction

## Summary

Extract the remaining ready-instance startup composition from `ControlServer.start()` into one dedicated helper while preserving the extracted request-shell binding, bootstrap assembly, and startup-sequence contracts.

## Scope

- Update `controlServer.ts` to delegate ready-instance startup composition.
- Add one helper for ready-instance construction, lifecycle attachment, and final startup sequencing.
- Add focused coverage for the extracted startup composition seam.
- Keep docs/task mirrors aligned with the new helper contract.

## Out of Scope

- Seed loading changes.
- Seeded runtime assembly changes.
- Request-shell binding behavior changes.
- Bootstrap assembly helper behavior changes.
- Startup-sequence helper behavior changes.
- `close()` shutdown ordering changes.
- Review-wrapper work.

## Notes

- 2026-03-10: Approved for docs-first registration based on the `1104` closeout evidence showing the remaining `ControlServer.start()` work is now only the ready-instance startup composition over the extracted collaborators. Evidence: `docs/findings/1105-control-server-ready-instance-startup-composition-extraction-deliberation.md`, `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/14-next-slice-note.md`.
