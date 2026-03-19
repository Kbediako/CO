---
id: 20260309-1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction
title: Coordinator Symphony-Aligned Control Server Request Body Helper Extraction
status: completed
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md
related_tasks:
  - tasks/tasks-1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Request Body Helper Extraction

## Summary

Extract the shared request-body helper cluster from `controlServer.ts` into one bounded control-local module so the file keeps request entry/orchestration responsibility while raw-body / JSON-body parsing moves out of the shell.

## Scope

- Add one bounded helper module for raw-body / JSON-body request parsing.
- Delegate the helper cluster from `controlServer.ts`.
- Preserve `invalid_json` and `request_body_too_large` behavior exactly.

## Out of Scope

- UI/public-route helper extraction.
- Route/controller behavior changes.
- Reopening the `1088` audit/error helper surface.
- Broad refactors outside the request-body helper boundary.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1088`. Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/20260309T125736Z-closeout/12-elegance-review.md`, `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/20260309T125736Z-closeout/14-next-slice-note.md`, `docs/findings/1089-control-server-request-body-helper-extraction-deliberation.md`.
- 2026-03-09: Completed. `controlServer.ts` now delegates raw-body / JSON-body parsing through `controlServerRequestBodyHelpers.ts`, focused helper regressions passed `2/2` files with `6/6` selected tests, the full local suite passed `181/181` files with `1217/1217` tests, and the delegated scout also completed a clean full-suite pass. The explicit non-green item is the forced standalone review wrapper drift override captured in `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/20260309T132458Z-closeout/13-override-notes.md`.
