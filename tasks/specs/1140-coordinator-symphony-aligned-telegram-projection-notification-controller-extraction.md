---
id: 20260313-1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction
title: Coordinator Symphony-Aligned Telegram Projection Notification Controller Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md
related_tasks:
  - tasks/tasks-1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Projection Notification Controller Extraction

## Summary

Extract the remaining outbound Telegram projection-notification orchestration from `telegramOversightBridge.ts` into one dedicated helper/controller while keeping queue ownership, poll-loop/runtime lifecycle, bridge-state ownership, and upstream helper ownership unchanged.

## Scope

- Add one control-local Telegram projection-notification controller/helper.
- Move projection rendering, transition evaluation, skip/pending/send branching, multi-chat send fan-out, and next-state return for one push attempt into the helper.
- Keep notification queue ownership, `next_update_id` persistence, bot identity startup, and bridge lifecycle ownership in `telegramOversightBridge.ts`.
- Add focused Telegram bridge coverage for the preserved outbound projection-notification contract.

## Out of Scope

- Notification queue ownership or `next_update_id` persistence.
- Telegram Bot API transport redesign.
- `ControlTelegramReadController` redesign.
- `controlTelegramPushState.ts` redesign.
- Inbound Telegram update handling or Linear runtime work.

## Notes

- 2026-03-13: Registered after `1139` completed. With update-local ingress now extracted, the next truthful Symphony-aligned Telegram seam is the outbound projection-notification branch still centered around `notifyProjectionDelta(...)` / `maybeSendProjectionDelta(...)`, because it remains mixed into the bridge runtime after transport, push-state policy, mutating command, and ingress extractions. Evidence: `docs/findings/1140-telegram-projection-notification-controller-extraction-deliberation.md`, `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-closeout/15-next-slice-note.md`.
- 2026-03-13: Pre-implementation local read-only review approved. A bounded `gpt-5.4` scout confirmed the next truthful seam is the outbound projection-notification branch, with queue ownership, persisted bridge state, startup/shutdown, and poll/update lifecycle staying in `telegramOversightBridge.ts`. Evidence: `docs/findings/1140-telegram-projection-notification-controller-extraction-deliberation.md`, `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-docs-first/00-summary.md`.
- 2026-03-13: Docs-first registration completed. Deterministic docs guards passed; the docs-review pipeline again failed at its own delegation guard before surfacing a concrete docs defect, so the package carries an explicit override rather than a clean docs-review pass. Evidence: `.runs/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/cli/2026-03-12T21-19-36-700Z-e8efbd12/manifest.json`, `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-docs-first/00-summary.md`.
