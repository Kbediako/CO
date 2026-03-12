---
id: 20260313-1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction
title: Coordinator Symphony-Aligned Telegram Oversight Update Handler Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md
related_tasks:
  - tasks/tasks-1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Oversight Update Handler Extraction

## Summary

Extract the remaining Telegram update-local ingress shell from `telegramOversightBridge.ts` into one dedicated handler/controller while keeping poll-loop/runtime lifecycle, bridge-state ownership, and downstream controller ownership unchanged.

## Scope

- Add one control-local Telegram update handler/controller/helper.
- Move message admission, authorized-chat filtering, plain-text help guidance, slash normalization, read routing, mutating fallback routing, and reply send-path invocation into the helper.
- Keep poll-loop/update lifecycle, `next_update_id` persistence, bot identity startup, and push-state ownership in `telegramOversightBridge.ts`.
- Add focused Telegram bridge coverage for the preserved update-local contract.

## Out of Scope

- Poll-loop/update lifecycle or `next_update_id` persistence.
- Telegram Bot API transport redesign.
- `ControlTelegramReadController` redesign.
- `ControlTelegramCommandController` redesign.
- Push-state or Linear runtime work.

## Notes

- 2026-03-13: Registered after `1138` closed the operator-only mutating command seam. The next truthful Symphony-aligned Telegram seam is the update-local shell still centered around `handleUpdate` / `dispatchCommand`, because it remains mixed into the bridge runtime after the transport, read, mutating-command, and push-state extractions. Evidence: `docs/findings/1139-telegram-oversight-update-handler-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved. The truthful bounded seam is the update-local ingress shell, not another lifecycle or state-owning extraction. Evidence: `docs/findings/1139-telegram-oversight-update-handler-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed. Deterministic docs guards passed; the docs-review pipeline again failed at its own delegation guard before surfacing a concrete docs defect, so the package carries an explicit override rather than a clean docs-review pass. Evidence: `.runs/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/cli/2026-03-12T20-45-52-814Z-c8d39681/manifest.json`, `out/1139-coordinator-symphony-aligned-telegram-oversight-update-handler-extraction/manual/20260312T204022Z-docs-first/00-summary.md`.
