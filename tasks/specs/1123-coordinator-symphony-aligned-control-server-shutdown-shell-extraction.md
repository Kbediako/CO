---
id: 20260312-1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction
title: Coordinator Symphony-Aligned Control Server Shutdown Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md
related_tasks:
  - tasks/tasks-1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Control Server Shutdown Shell Extraction

## Summary

Extract the inline `ControlServer.close()` shutdown shell so the class keeps only the public close contract plus top-level lifecycle ownership.

## Scope

- Touch only the residual shutdown shell in `orchestrator/src/cli/control/controlServer.ts`.
- Keep expiry teardown/reset, bootstrap teardown/reset, open-client termination, and `server.close()` promise behavior identical.
- Add focused regressions for the extracted seam.

## Out of Scope

- Startup helper changes.
- Request-shell binding or request-route changes.
- Event transport changes.
- Review-wrapper work.

## Notes

- 2026-03-12: Registered after `1122` completed. With startup activation now isolated, the remaining truthful `ControlServer` seam is the inline shutdown shell inside `close()`: expiry teardown/reset, bootstrap teardown/reset, open-client termination, and the final `server.close()` promise wrapper. Evidence: `docs/findings/1123-control-server-shutdown-shell-extraction-deliberation.md`, `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260311T232621Z-closeout/00-summary.md`, `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260311T232621Z-closeout/14-next-slice-note.md`.
- 2026-03-12: Completed. `ControlServer.close()` now delegates into the same-file private helper `shutdownOwnedRuntime()`, keeping the `1123` seam bounded to expiry teardown/reset, bootstrap teardown/reset, open-client termination, and the final `server.close()` promise wrapper. Focused final-tree regressions passed (`05-targeted-tests.log`), deterministic gates passed through `pack:smoke`, the standalone review returned no concrete `1123` finding, and the full-suite quiet tail was recorded as an explicit override instead of being treated as green. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/00-summary.md`, `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/09-review.log`, `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/13-override-notes.md`.
