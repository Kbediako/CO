---
id: 20260309-1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction
title: Coordinator Symphony-Aligned Authenticated Route Handoff Assembly Extraction
status: completed
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
- 2026-03-10: Completed. `controlServer.ts` now delegates the authenticated-route context bag through `createControlAuthenticatedRouteContext(...)` in `controlAuthenticatedRouteHandoff.ts`; focused final-tree regressions passed `3/3` files with `98/98` tests; both the local full suite and delegated scout completed cleanly with `183/183` files and `1228/1228` tests; and the only explicit non-green item is the standalone review-wrapper drift/process override. Evidence: `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T150731Z-closeout/00-summary.md`, `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T150731Z-closeout/05-test.log`, `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T150731Z-closeout/05b-targeted-tests.log`, `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T150731Z-closeout/11-manual-authenticated-route-handoff-check.json`, `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T150731Z-closeout/13-override-notes.md`, `.runs/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction-scout/cli/2026-03-09T15-06-41-086Z-e3264e35/manifest.json`.
