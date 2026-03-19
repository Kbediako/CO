---
id: 20260310-1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction
title: Coordinator Symphony-Aligned Control Request Predispatch Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md
related_tasks:
  - tasks/tasks-1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Request Predispatch Shell Extraction

## Summary

Extract the remaining inline pre-dispatch request assembly from `controlServer.ts` into one dedicated helper while preserving the `1101` route-dispatch contract.

## Scope

- Update `controlServer.ts` to delegate request pre-dispatch assembly.
- Add one helper for missing-request fallthrough, URL parsing, presenter/runtime assembly, and route-dispatch input shaping.
- Add focused coverage for the extracted pre-dispatch seam.
- Keep docs/task mirrors aligned with the new helper contract.

## Out of Scope

- Route sequencing changes.
- Public route helper behavior changes.
- UI session helper behavior changes.
- Linear webhook behavior changes.
- Authenticated route behavior changes.
- Startup/request-shell/bootstrap refactors.
- Review-wrapper work.

## Notes

- 2026-03-10: Approved for docs-first registration based on the `1101` closeout evidence showing the remaining `handleRequest()` work is now only the missing-request, URL parse, presenter/runtime assembly, and dispatcher-input shaping shell. Evidence: `docs/findings/1102-control-request-predispatch-shell-extraction-deliberation.md`, `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/14-next-slice-note.md`.
- 2026-03-10: Completed. `controlServer.ts` now delegates the remaining request pre-dispatch assembly to `controlRequestPredispatch.ts`, focused regressions passed `99/99`, the full suite passed `187/187` files and `1265/1265` tests, the bounded standalone review returned a clean verdict, and pack-smoke passed. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/00-summary.md`, `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/05-targeted-tests.log`, `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/05-test.log`, `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/09-review.log`, `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/10-pack-smoke.log`, `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/11-manual-request-predispatch-check.json`, `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/12-elegance-review.md`, `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/13-override-notes.md`.
