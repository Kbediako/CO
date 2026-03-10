---
id: 20260310-1103-coordinator-symphony-aligned-control-request-controller-shell-extraction
title: Coordinator Symphony-Aligned Control Request Controller Shell Extraction
status: active
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-request-controller-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-controller-shell-extraction.md
related_tasks:
  - tasks/tasks-1103-coordinator-symphony-aligned-control-request-controller-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Request Controller Shell Extraction

## Summary

Extract the remaining inline request-controller shell from `controlServer.ts` into one dedicated helper while preserving the `1102` pre-dispatch and `1101` route-dispatch contracts.

## Scope

- Update `controlServer.ts` to delegate request-controller handling.
- Add one helper for null fallthrough and dispatch handoff.
- Add focused coverage for the extracted request-controller seam.
- Keep docs/task mirrors aligned with the new helper contract.

## Out of Scope

- Pre-dispatch helper behavior changes.
- Route sequencing changes.
- Public route helper behavior changes.
- UI session helper behavior changes.
- Linear webhook behavior changes.
- Authenticated route behavior changes.
- Startup/request-shell/bootstrap refactors.
- Review-wrapper work.

## Notes

- 2026-03-10: Approved for docs-first registration based on the `1102` closeout evidence showing the remaining `handleRequest()` work is now only the null-fallthrough plus route-dispatch handoff shell. Evidence: `docs/findings/1103-control-request-controller-shell-extraction-deliberation.md`, `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/14-next-slice-note.md`.
