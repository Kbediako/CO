---
id: 20260309-1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction
title: Coordinator Symphony-Aligned Control Server Seeded Runtime Assembly Extraction
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md
related_tasks:
  - tasks/tasks-1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Seeded Runtime Assembly Extraction

## Summary

Extract the seeded runtime assembly block from `ControlServer.start()` into one helper so the server method keeps seed loading plus server/startup-shell composition while seeded store/runtime creation, persist helpers, and `requestContextShared` assembly move behind one bounded seam.

## Scope

- Add one helper that owns seeded store/runtime/persist/request-context assembly after the JSON seeds are loaded.
- Delegate that seeded runtime assembly from `ControlServer.start()`.
- Preserve runtime identity wiring, live persist closures, and `rlm` default-toggle behavior exactly.

## Out of Scope

- JSON seed loading changes before the helper call.
- Changes to `controlServerStartupSequence.ts`.
- Changes to `createControlBootstrapAssembly(...)`.
- Route handling/controller changes.
- `close()` shutdown ordering changes.
- Splitting the seeded runtime assembly into multiple helpers/files.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1083`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/14-next-slice-note.md`, `docs/findings/1084-control-server-seeded-runtime-assembly-extraction-deliberation.md`.
