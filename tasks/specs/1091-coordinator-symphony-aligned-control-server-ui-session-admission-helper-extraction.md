---
id: 20260309-1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction
title: Coordinator Symphony-Aligned Control Server UI Session Admission Helper Extraction
status: active
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

Extract the UI session admission assembly cluster from `controlServer.ts` into the existing UI-session controller boundary, or a tiny adjacent controller-owned helper, so the file keeps request-entry orchestration responsibility while `/auth/session` wiring, loopback helper ownership, and allowed-host normalization move out of the shell.

## Scope

- Add one bounded helper module for UI session admission assembly.
- Delegate the `/auth/session` branch from `controlServer.ts`.
- Preserve loopback, Host, and Origin admission behavior exactly.

## Out of Scope

- Internal `uiSessionController.ts` behavior changes.
- Question-child resolution host normalization changes.
- Public-route changes.
- Authenticated-route or Linear webhook changes.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1090` based on the `1090` next-slice note, current-file inspection of `controlServer.ts`, `uiSessionController.ts`, and existing session-route tests, plus a bounded `gpt-5.4` scout that confirmed this should remain controller-owned rather than expand into shared host-policy unification. Evidence: `docs/findings/1091-control-server-ui-session-admission-helper-extraction-deliberation.md`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T141055Z-docs-first/04-scout-summary.md`.
