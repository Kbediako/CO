---
id: 20260309-1085-coordinator-symphony-aligned-control-server-request-shell-extraction
title: Coordinator Symphony-Aligned Control Server Request Shell Extraction
status: completed
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
- 2026-03-09: Completed. `ControlServer.start()` now delegates HTTP server creation, pre-instance `503` handling, live request-context assembly, and top-level request error mapping through `orchestrator/src/cli/control/controlServerRequestShell.ts`; focused request-shell regressions passed `2/2` files and `6/6` tests, the full local suite passed `178/178` files and `1205/1205` tests, the manifest-backed `1085-...-scout` diagnostics sub-run succeeded, pack-smoke passed on the final tree, and the only explicit non-green item is the standalone review wrapper override after it re-inspected incomplete closeout mirrors instead of returning a bounded code verdict. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/20260309T110955Z-closeout/00-summary.md`, `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/20260309T110955Z-closeout/05b-targeted-tests.log`, `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/20260309T110955Z-closeout/11-manual-request-shell-check.json`, `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/20260309T110955Z-closeout/12-elegance-review.md`, `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/20260309T110955Z-closeout/13-override-notes.md`, `.runs/1085-coordinator-symphony-aligned-control-server-request-shell-extraction-scout/cli/2026-03-09T11-13-15-122Z-5932cd9d/manifest.json`.
