---
id: 20260309-1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction
title: Coordinator Symphony-Aligned Authenticated Route Handoff Assembly Extraction
status: active
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md
related_tasks:
  - tasks/tasks-1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Authenticated Route Handoff Assembly Extraction

## Summary

Extract the control-specific authenticated-route handoff assembly from `controlServer.ts` into the authenticated-route controller boundary so the file keeps request-entry orchestration responsibility while the large `handleAuthenticatedRouteRequest(...)` context bag moves out of the shell.

## Scope

- Add one bounded authenticated-route handoff helper for control-server-side context assembly.
- Delegate the authenticated-route handoff from `controlServer.ts`.
- Preserve authenticated-route behavior and response shapes.

## Out of Scope

- Authenticated admission/token validation ownership.
- Public-route, UI-session, or Linear webhook handling.
- Authenticated dispatcher behavior changes.
- Shared utility extraction for `resolveTaskIdFromManifestPath(...)`.
- Snapshot/presenter timing changes.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1091` based on the `1091` next-slice note, current-file inspection of `controlServer.ts`, `authenticatedRouteController.ts`, `authenticatedRouteComposition.ts`, and `controlQuestionChildResolution.ts`, plus a bounded `gpt-5.4` scout that confirmed the next smallest seam is authenticated-route handoff assembly rather than auth admission or dispatcher behavior. Evidence: `docs/findings/1092-authenticated-route-handoff-assembly-extraction-deliberation.md`.
