---
id: 20260310-1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction
title: Coordinator Symphony-Aligned Control Server Live-Instance Host Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md
related_tasks:
  - tasks/tasks-1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Live-Instance Host Shell Extraction

## Summary

Extract only the pending ready-instance host shell from `ControlServer.start()` into one same-file private helper that returns the fully started `ControlServer`, while preserving the already-extracted request-shell binding and ready-instance startup sequencing contracts.

## Scope

- Update `controlServer.ts` to delegate pending instance construction, callback bridge assembly, and ready-instance startup handoff through one same-file private helper.
- Keep request-shell binding and ready-instance startup sequencing on their existing extracted seams.
- Add focused coverage for live request-shell reads, bootstrap callback mutation, and fail-closed cleanup over the same instance.
- Keep docs/task mirrors aligned with the extracted helper contract.

## Out of Scope

- Seed loading changes.
- Seeded runtime assembly changes.
- Request-shell binding behavior changes.
- Ready-instance startup helper behavior changes.
- `close()` shutdown ordering changes.
- Review-wrapper work.

## Notes

- 2026-03-10: Approved for docs-first registration based on the `1105` closeout evidence plus bounded scout confirmation that the remaining seam is the pending instance host shell inside `ControlServer.start()`, and that it should stay a same-file `private static` helper rather than a new exported module. Evidence: `docs/findings/1106-control-server-live-instance-host-shell-extraction-deliberation.md`, `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/14-next-slice-note.md`.
