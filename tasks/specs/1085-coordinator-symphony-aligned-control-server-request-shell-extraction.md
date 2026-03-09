---
id: 20260309-1085-coordinator-symphony-aligned-control-server-request-shell-extraction
title: Coordinator Symphony-Aligned Control Server Request Shell Extraction
status: active
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-request-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-request-shell-extraction.md
related_tasks:
  - tasks/tasks-1085-coordinator-symphony-aligned-control-server-request-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Request Shell Extraction

## Summary

Extract the inline `http.createServer(...)` request shell from `ControlServer.start()` into one helper so the server method keeps token/seed loading, seeded runtime assembly, instance construction, bootstrap assembly, startup sequencing, and ready-instance return while pre-instance availability handling, request-context assembly, and top-level JSON error mapping move behind one bounded seam.

## Scope

- Add one helper that owns HTTP server creation, pre-instance `503` handling, request-context assembly, and top-level request error mapping.
- Delegate that request shell from `ControlServer.start()`.
- Preserve current request-context identity wiring and JSON error semantics exactly.

## Out of Scope

- Changes to `handleRequest(...)` route logic.
- Changes to authenticated-route/controller behavior.
- Changes to seeded runtime assembly from `1084`.
- Changes to bootstrap assembly or startup sequencing.
- Changes to `close()` shutdown ordering.
- Splitting the request shell into multiple helpers/files.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1084`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/14-next-slice-note.md`, `docs/findings/1085-control-server-request-shell-extraction-deliberation.md`.
