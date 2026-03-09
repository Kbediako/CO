---
id: 20260309-1083-coordinator-symphony-aligned-control-server-startup-shell-extraction
title: Coordinator Symphony-Aligned Control Server Startup Shell Extraction
status: draft
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
