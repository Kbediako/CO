---
id: 20260313-1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction
title: Coordinator Symphony-Aligned Telegram Oversight Polling Controller Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md
related_tasks:
  - tasks/tasks-1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Oversight Polling Controller Extraction

## Summary

Extract the remaining inbound Telegram polling/update-offset orchestration from `telegramOversightBridge.ts` after `1143`.

## Scope

- Extract the polling loop plus `getUpdates` offset/timeout orchestration.
- Extract per-update error isolation around update handling.
- Extract the `next_update_id` advancement and persistence flow.

## Out of Scope

- Config/env parsing changes.
- Read, command, or push policy changes.
- Bot API/control-action client changes.
- Linear/runtime feature work.

## Notes

- 2026-03-13: Registered after `1143` completed. The next truthful Telegram seam is the inbound polling/update-offset orchestration still embedded in `telegramOversightBridge.ts`; adjacent responsibilities already live behind explicit controllers/helpers. Evidence: `out/1143-coordinator-symphony-aligned-telegram-oversight-state-store-extraction/manual/20260312T232532Z-closeout/15-next-slice-note.md`, `docs/findings/1144-telegram-oversight-polling-controller-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1144-telegram-oversight-polling-controller-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed with deterministic gates green. The initial docs-review stopped at its own delegation guard, a task-scoped delegated scout supplied real sub-run evidence, and a fresh docs-review rerun cleared deterministic docs gates before drifting into unrelated historical standalone-review task history; record that as a docs-review override rather than a `1144` docs defect. Evidence: `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T000149Z-docs-first/00-summary.md`, `out/1144-coordinator-symphony-aligned-telegram-oversight-polling-controller-extraction/manual/20260313T000149Z-docs-first/05-docs-review-override.md`.
