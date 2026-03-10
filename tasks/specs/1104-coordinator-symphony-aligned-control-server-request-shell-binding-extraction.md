---
id: 20260310-1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction
title: Coordinator Symphony-Aligned Control Server Request-Shell Binding Extraction
status: completed
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md
related_tasks:
  - tasks/tasks-1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Request-Shell Binding Extraction

## Summary

Extract the remaining inline request-shell binding assembly from `ControlServer.start()` into one dedicated helper while preserving the `1103` controller-owned request path.

## Scope

- Update `controlServer.ts` to delegate request-shell binding assembly.
- Add one helper that binds `createControlServerRequestShell(...)` to `handleControlRequest`.
- Add focused coverage for the extracted binding seam.
- Keep docs/task mirrors aligned with the new helper contract.

## Out of Scope

- Request-shell implementation changes.
- Request-controller behavior changes.
- Predispatch or route-dispatch changes.
- Bootstrap/startup/seeded-runtime refactors.
- Review-wrapper work.

## Notes

- 2026-03-10: Approved for docs-first registration based on the `1103` closeout evidence showing the remaining `ControlServer.start()` request-path work is now only the request-shell binding block. Evidence: `docs/findings/1104-control-server-request-shell-binding-extraction-deliberation.md`, `out/1103-coordinator-symphony-aligned-control-request-controller-shell-extraction/manual/20260310T030712Z-closeout/14-next-slice-note.md`.
- 2026-03-10: Completed. `ControlServer.start()` now delegates the remaining request-shell binding assembly to `createBoundControlServerRequestShell`, focused regressions passed `101/101`, the full suite passed `189/189` files and `1270/1270` tests, the bounded standalone review returned a clean diff verdict, and pack-smoke passed. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/00-summary.md`, `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/05-targeted-tests.log`, `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/05-test.log`, `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/09-review.log`, `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/10-pack-smoke.log`, `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/11-manual-request-shell-binding-check.json`, `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/12-elegance-review.md`, `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/13-override-notes.md`.
