---
id: 20260309-1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction
title: Coordinator Symphony-Aligned Telegram Bridge Bootstrap Handoff Extraction
status: completed
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md
related_tasks:
  - tasks/tasks-1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Bridge Bootstrap Handoff Extraction

## Summary

Extract the remaining Telegram bridge bootstrap handoff from `controlServer.ts` into one dedicated control-local helper so the server shell only owns top-level startup while Telegram bridge bootstrap dependency assembly moves behind a narrower helper seam.

## Scope

- Add one helper that assembles the Telegram bridge bootstrap handoff into `createControlServerBootstrapLifecycle(...)`.
- Delegate that handoff assembly in `controlServer.ts` to the extracted helper.
- Preserve bootstrap ordering, bridge startup, and bridge subscription behavior exactly.

## Out of Scope

- Telegram bridge runtime or polling changes.
- Telegram command-routing or mutating control behavior.
- Dispatch/question-read semantic changes.
- Authenticated/API route changes.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1078`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/20260309T051949Z-closeout/14-next-slice-note.md`, `docs/findings/1079-telegram-bridge-bootstrap-handoff-extraction-deliberation.md`.
- 2026-03-09: Completed with `controlTelegramBridgeBootstrapLifecycle.ts` extracting the Telegram bridge bootstrap handoff from `controlServer.ts`, preserving lazy read-adapter binding, bootstrap ordering, bridge startup semantics, and Telegram bridge subscription behavior. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/20260309T054759Z-closeout/00-summary.md`, `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/20260309T054759Z-closeout/11-manual-bootstrap-handoff-check.json`, `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/20260309T054759Z-closeout/12-elegance-review.md`.
