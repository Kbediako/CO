---
id: 20260312-1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard
title: Coordinator Symphony-Aligned Control Server Pending Ready-Instance Activation Guard
status: completed
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md
related_tasks:
  - tasks/tasks-1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Server Pending Ready-Instance Activation Guard

## Summary

Extract the mutable activation guard from `controlServer.ts` so the class keeps only top-level orchestration plus public lifecycle ownership.

## Scope

- Touch only the residual activation guard in `orchestrator/src/cli/control/controlServer.ts`.
- Keep request-shell reader dereferencing, bootstrap/expiry lifecycle attachment, close-on-failure wiring, and ready-instance publication behavior identical.
- Add focused regressions for the extracted seam.

## Out of Scope

- Changes to `prepareControlServerStartupInputs(...)`.
- Changes to `createBoundControlServerRequestShell(...)`.
- Changes to `startControlServerReadyInstanceStartup(...)`.
- Request-route, bootstrap internals, or shutdown-order changes.
- Review-wrapper work.

## Notes

- 2026-03-12: Registered after `1121` completed. With startup-input preparation now isolated, the remaining truthful startup seam is the mutable activation guard inside `startPendingReadyInstance(...)`: the live `instance` cell, request-shell reader wiring, bootstrap attachment, close-on-failure routing, and final `baseUrl` publication/return. Evidence: `docs/findings/1122-control-server-pending-ready-instance-activation-guard-deliberation.md`, `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/00-summary.md`, `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/14-next-slice-note.md`.
- 2026-03-12: Completed. `startPendingReadyInstance(...)` now delegates into the same-file private helper `activatePendingReadyInstance(...)`, keeping the `1122` seam bounded to the live `instance` cell, request-shell reader wiring, bootstrap attachment, close-on-failure routing, and final `baseUrl` publication. Focused final-tree regressions passed (`05-targeted-tests.log`), deterministic gates passed through `pack:smoke`, the standalone review returned no concrete `1122` finding, and the full-suite quiet tail was recorded as an explicit override instead of being treated as green. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260311T232621Z-closeout/00-summary.md`, `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260311T232621Z-closeout/09-review.log`, `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260311T232621Z-closeout/13-override-notes.md`.
