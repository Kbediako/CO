---
id: 20260309-1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction
title: Coordinator Symphony-Aligned Telegram Oversight Read Adapter Factory Extraction
status: completed
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md
related_tasks:
  - tasks/tasks-1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Oversight Read Adapter Factory Extraction

## Summary

Extract the remaining Telegram oversight read-adapter factory from `controlServer.ts` into one dedicated control-local helper so the server shell only wires lifecycle/transport ownership while the Telegram read surface is assembled behind a narrower helper seam.

## Scope

- Add one helper that builds the Telegram oversight `TelegramOversightReadAdapter`.
- Delegate `createTelegramOversightReadAdapter()` in `controlServer.ts` to that helper.
- Preserve selected-run, dispatch, and question read behavior exactly.

## Out of Scope

- Telegram polling, commands, or rendering changes.
- Dispatch or question-read semantic changes.
- Authenticated/API route changes.
- Broader Telegram runtime/controller refactors.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1077`. Evidence: `out/1077-coordinator-symphony-aligned-telegram-dispatch-read-adapter-extraction/manual/20260309T045844Z-closeout/14-next-slice-note.md`, `docs/findings/1078-telegram-oversight-read-adapter-factory-extraction-deliberation.md`.
- 2026-03-09: Completed with the Telegram oversight read-adapter factory extracting from `controlServer.ts`, preserving selected-run, dispatch, and question reads while also tightening `controlTelegramDispatchRead.ts` to shape Telegram success payloads explicitly and cover the fail-closed fallback path. The helper later remained in current tree as the coordinator-owned `controlOversightReadService.ts` seam after `1148`. Evidence: `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/20260309T051949Z-closeout/00-summary.md`, `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/20260309T051949Z-closeout/11-manual-telegram-read-adapter-check.json`, `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/20260309T051949Z-closeout/12-elegance-review.md`.
