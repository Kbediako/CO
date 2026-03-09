---
id: 20260309-1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction
title: Coordinator Symphony-Aligned Control Server Public Route and UI Asset Helper Extraction
status: active
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md
related_tasks:
  - tasks/tasks-1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Public Route and UI Asset Helper Extraction

## Summary

Extract the public-route/UI-asset helper cluster from `controlServer.ts` into one bounded control-local module so the file keeps request-entry orchestration responsibility while `/health`, root redirect, and static UI asset handling move out of the shell.

## Scope

- Add one bounded helper module for public-route/UI-asset handling.
- Delegate the public-route/UI-asset branch from `controlServer.ts`.
- Preserve `/health`, `/`, and UI asset behavior exactly.

## Out of Scope

- UI session admission / loopback authorization wiring.
- Authenticated-route changes.
- Linear webhook changes.
- Request-shell changes.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1089` based on current-file inspection and the `1089` next-slice note. Evidence: `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/20260309T132458Z-closeout/12-elegance-review.md`, `out/1089-coordinator-symphony-aligned-control-server-request-body-helper-extraction/manual/20260309T132458Z-closeout/14-next-slice-note.md`, `docs/findings/1090-control-server-public-route-and-ui-asset-helper-extraction-deliberation.md`.
