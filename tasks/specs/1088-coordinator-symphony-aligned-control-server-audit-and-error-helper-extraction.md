---
id: 20260309-1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction
title: Coordinator Symphony-Aligned Control Server Audit and Error Helper Extraction
status: completed
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md
related_tasks:
  - tasks/tasks-1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Audit and Error Helper Extraction

## Summary

Extract the remaining control-server audit payload shaping and shared JSON error helper cluster into one bounded helper module so `controlServer.ts` keeps request entry/orchestration responsibility while the Linear webhook, dispatch-pilot, and control-action audit/error shaping moves out of the file.

## Scope

- Add one bounded helper module for audit-event payload shaping and shared JSON control error writes.
- Delegate the helper cluster from `controlServer.ts`.
- Preserve current event names, payload fields, and HTTP error response behavior exactly.

## Out of Scope

- Startup/runtime bundle work from `1087`.
- Route/controller behavior changes.
- Telegram bridge behavior changes.
- Broad refactors outside the control-server audit/error helper boundary.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1087`. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/12-elegance-review.md`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/14-next-slice-note.md`, `docs/findings/1088-control-server-audit-and-error-helper-extraction-deliberation.md`.
- 2026-03-09: Completed. `controlServer.ts` now delegates the bounded audit/error helper cluster through `controlServerAuditAndErrorHelpers.ts`, the post-implementation elegance pass kept `resolveTaskIdFromManifestPath(...)` local to `controlServer.ts`, focused final-tree regressions passed `9/99` selected tests, and the manifest-backed delegated scout recorded a clean full-suite pass (`180/180` files, `1213/1213` tests). Evidence: `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/20260309T125736Z-closeout/00-summary.md`, `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/20260309T125736Z-closeout/05b-targeted-tests.log`, `out/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction/manual/20260309T125736Z-closeout/12-elegance-review.md`, `.runs/1088-coordinator-symphony-aligned-control-server-audit-and-error-helper-extraction-scout/cli/2026-03-09T12-56-05-825Z-961b27ec/manifest.json`.
