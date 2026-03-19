---
id: 20260309-1083-coordinator-symphony-aligned-control-server-startup-shell-extraction
title: Coordinator Symphony-Aligned Control Server Startup Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-startup-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-startup-shell-extraction.md
related_tasks:
  - tasks/tasks-1083-coordinator-symphony-aligned-control-server-startup-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Startup Shell Extraction

## Summary

Extract the remaining startup shell from `ControlServer.start()` into one helper so the server method keeps top-level composition and ready-instance return while bind/listen, base URL derivation, final bootstrap start, and close-on-failure behavior move behind one bounded seam.

## Scope

- Add one helper that owns bind/listen, base URL derivation, and final bootstrap startup handling.
- Delegate that startup shell from `ControlServer.start()`.
- Preserve startup sequencing and failure cleanup exactly.

## Out of Scope

- Request-context/store seeding changes.
- Changes to `controlBootstrapAssembly.ts`.
- Route handling/controller changes.
- `close()` shutdown ordering changes.
- Splitting bind/listen and bootstrap start into separate helpers/files.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1082`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/14-next-slice-note.md`, `docs/findings/1083-control-server-startup-shell-extraction-deliberation.md`.
- 2026-03-09: Completed. `ControlServer.start()` now delegates bind/listen, base URL derivation, steady-state server error registration, final bootstrap startup, and post-bind failure cleanup through `orchestrator/src/cli/control/controlServerStartupSequence.ts`; focused regressions passed `2/2` files and `9/9` tests, the full local suite passed `176/176` files and `1196/1196` tests, the manifest-backed `1083-...-scout` diagnostics sub-run succeeded, and the only explicit non-green item is the standalone review wrapper override after it drifted into low-signal meta reinspection instead of returning a bounded verdict. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/00-summary.md`, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/11-manual-startup-shell-check.json`, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/13-override-notes.md`, `.runs/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction-scout/cli/2026-03-09T09-48-38-634Z-66ca07d4/manifest.json`.
