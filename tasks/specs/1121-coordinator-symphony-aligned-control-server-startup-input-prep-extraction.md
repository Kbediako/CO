---
id: 20260312-1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction
title: Coordinator Symphony-Aligned Control Server Startup Input Prep Extraction
status: completed
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md
related_tasks:
  - tasks/tasks-1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Server Startup Input Prep Extraction

## Summary

Extract the remaining startup-input preparation from `ControlServer.start()` so the method becomes a thin orchestration entrypoint over already-extracted collaborators.

## Scope

- Touch only the residual startup-input prep in `orchestrator/src/cli/control/controlServer.ts`.
- Keep control-token generation, seed-loading delegation, seeded-runtime assembly delegation, and `startPendingReadyInstance(...)` handoff behavior identical.
- Add focused regressions for the extracted seam.

## Out of Scope

- Changes to `readControlServerSeeds(...)`.
- Changes to `createControlServerSeededRuntimeAssembly(...)`.
- Changes to `startPendingReadyInstance(...)`.
- Request-route, bootstrap lifecycle, or shutdown-order changes.
- Review-wrapper work.

## Notes

- 2026-03-12: Registered after `1120` closed and the branch returned to the broader Symphony extraction track. `1106` already removed the last strong mutable host-shell block, so the truthful remaining seam is the weaker startup-input prep still living in `ControlServer.start()`. Evidence: `docs/findings/1121-control-server-startup-input-prep-extraction-deliberation.md`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/20260310T041640Z-closeout/00-summary.md`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/20260310T041640Z-closeout/14-next-slice-note.md`, `out/1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary/manual/20260311T135537Z-closeout/14-next-slice-note.md`.
- 2026-03-12: Completed. `ControlServer.start()` now delegates token generation, seed loading, seeded runtime assembly, and prepared ready-instance inputs into `controlServerStartupInputPreparation.ts` while leaving `startPendingReadyInstance(...)` and the downstream startup lifecycle unchanged. Focused seam coverage passed (`05-targeted-tests.log`), full suite passed (`05-test.log`), docs gates passed, `pack:smoke` passed, and the bounded standalone review rerun returned no concrete `1121` finding. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/00-summary.md`, `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/09-review.log`, `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/13-override-notes.md`.
