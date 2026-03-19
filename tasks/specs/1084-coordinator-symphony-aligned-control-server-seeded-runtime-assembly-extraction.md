---
id: 20260309-1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction
title: Coordinator Symphony-Aligned Control Server Seeded Runtime Assembly Extraction
status: completed
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
- 2026-03-09: Completed. `ControlServer.start()` now delegates seeded store/runtime creation, live persist closure assembly, and `requestContextShared` wiring through `orchestrator/src/cli/control/controlServerSeededRuntimeAssembly.ts`; focused regressions passed `2/2` files and `8/8` tests, the full local suite passed `177/177` files and `1200/1200` tests, the manifest-backed `1084-...-scout` diagnostics sub-run succeeded, pack-smoke passed on the final tree, and the only explicit non-green item is the standalone review wrapper override after it drifted into pre-closeout checklist/evidence reinspection instead of returning a bounded code verdict. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/00-summary.md`, `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/11-manual-seeded-runtime-check.json`, `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/12-elegance-review.md`, `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/13-override-notes.md`, `.runs/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction-scout/cli/2026-03-09T10-23-08-551Z-be0e7df3/manifest.json`.
