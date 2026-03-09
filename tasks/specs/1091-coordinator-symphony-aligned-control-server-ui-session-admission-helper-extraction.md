---
id: 20260309-1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction
title: Coordinator Symphony-Aligned Control Server UI Session Admission Helper Extraction
status: completed
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md
related_tasks:
  - tasks/tasks-1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server UI Session Admission Helper Extraction

## Summary

Extract the UI session admission assembly cluster from `controlServer.ts` into the existing UI-session controller boundary so the file keeps request-entry orchestration responsibility while `/auth/session` wiring, loopback helper ownership, and allowed-host normalization move out of the shell.

## Scope

- Add one bounded controller-owned admission seam for UI session assembly.
- Delegate the `/auth/session` branch from `controlServer.ts`.
- Preserve loopback, Host, and Origin admission behavior exactly.

## Out of Scope

- Broader `uiSessionController.ts` behavior changes beyond controller-owned admission assembly.
- Question-child resolution host normalization changes.
- Public-route changes.
- Authenticated-route or Linear webhook changes.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1090` based on the `1090` next-slice note, current-file inspection of `controlServer.ts`, `uiSessionController.ts`, and existing session-route tests, plus a bounded `gpt-5.4` scout that confirmed this should remain controller-owned rather than expand into shared host-policy unification. Evidence: `docs/findings/1091-control-server-ui-session-admission-helper-extraction-deliberation.md`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T141055Z-docs-first/04-scout-summary.md`.
- 2026-03-09: Completed. `controlServer.ts` now delegates `/auth/session` through `handleControlUiSessionAdmission(...)` in `uiSessionController.ts`; the final-tree targeted regressions passed `2/2` files with `102/102` tests; the delegated scout completed a clean full-suite pass with `183/183` files and `1228/1228` tests; and the closeout records explicit docs-review, full-suite quiet-tail, stacked-branch diff-budget, and standalone-review overrides rather than overstating wrapper results. Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/00-summary.md`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/05b-targeted-tests.log`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/11-manual-ui-session-admission-check.json`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/13-override-notes.md`, `.runs/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction-scout/cli/2026-03-09T14-24-20-607Z-328e9b37/manifest.json`.
