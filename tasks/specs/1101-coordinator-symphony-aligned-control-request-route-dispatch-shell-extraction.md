---
id: 20260310-1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction
title: Coordinator Symphony-Aligned Control Request Route Dispatch Shell Extraction
status: active
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md
related_tasks:
  - tasks/tasks-1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Request Route Dispatch Shell Extraction

## Summary

Extract the remaining inline request-route branch sequencing from `controlServer.ts` into one dedicated dispatcher while preserving helper ownership and route order.

## Scope

- Update `controlServer.ts` to delegate request-route branch sequencing.
- Add one dispatcher/helper for public, UI-session, Linear webhook, and authenticated-route sequencing.
- Add focused coverage for the extracted sequencing seam.
- Keep docs/task mirrors aligned with the new dispatcher contract.

## Out of Scope

- Request-context assembly extraction.
- Public route helper behavior changes.
- UI session helper behavior changes.
- Linear webhook behavior changes.
- Authenticated route behavior changes.
- Review-wrapper work.

## Notes

- 2026-03-10: Approved for docs-first registration based on the `1100` closeout evidence showing the Linear webhook branch shell is now controller-owned and the remaining inline `handleRequest()` work is just branch sequencing. Evidence: `docs/findings/1101-control-request-route-dispatch-shell-extraction-deliberation.md`, `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/14-next-slice-note.md`.
