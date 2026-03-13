---
id: 20260313-1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction
title: Coordinator Symphony-Aligned Telegram Oversight Runtime Lifecycle Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md
related_tasks:
  - tasks/tasks-1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Oversight Runtime Lifecycle Shell Extraction

## Summary

Extract the remaining Telegram runtime lifecycle choreography from `telegramOversightBridge.ts` after `1144`.

## Scope

- Startup bootstrap ordering for persisted state load plus bot identity fetch.
- Polling-controller start/abort lifecycle wiring.
- Shutdown ordering against the projection notification queue.

## Out of Scope

- Config/env parsing changes.
- Polling-controller behavior changes.
- Read, command, or push policy changes.
- Linear/runtime/provider feature work.

## Notes

- 2026-03-13: Registered after `1144` completed. The next truthful Telegram seam is the remaining runtime lifecycle choreography still embedded in `telegramOversightBridge.ts`: persisted-state bootstrap, bot identity fetch, polling-controller start/abort wiring, and shutdown ordering against the projection notification queue. Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T002129Z-closeout/15-next-slice-note.md`, `docs/findings/1145-telegram-oversight-runtime-lifecycle-shell-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1145-telegram-oversight-runtime-lifecycle-shell-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed with deterministic gates green. The initial docs-review stopped at its own delegation guard, a task-scoped delegated scout then completed successfully through `delegation-guard`, `build`, `lint`, `test`, and `spec-guard`, the first successful rerun surfaced one valid wording bug around bot-identity ownership, and a final rerun passed with no findings after that fix. Evidence: `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T003943Z-docs-first/00-summary.md`, `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T003943Z-docs-first/05-docs-review.json`, `out/1145-coordinator-symphony-aligned-telegram-oversight-runtime-lifecycle-shell-extraction/manual/20260313T003943Z-docs-first/06-docs-review-rerun.json`.
