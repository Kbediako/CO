---
id: 20260313-1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction
title: Coordinator Symphony-Aligned Telegram Oversight Command Controller Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md
related_tasks:
  - tasks/tasks-1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Oversight Command Controller Extraction

## Summary

Extract the remaining Telegram operator command cluster from `telegramOversightBridge.ts` into one dedicated controller while keeping polling/runtime lifecycle and `/control/action` transport ownership unchanged.

## Scope

- Add one control-local Telegram command controller/helper.
- Move command admission, routing, and reply generation into the helper.
- Keep `/pause` and `/resume` delegating through the existing `/control/action` client.
- Add focused Telegram bridge coverage for the preserved command contract.

## Out of Scope

- Polling/update lifecycle or `next_update_id` persistence.
- Telegram Bot API transport redesign.
- `/control/action` transport redesign.
- Push-state or Linear refactors.
- Further standalone-review heuristic work absent a new live defect.

## Notes

- 2026-03-13: Registered after `1137` closed the boundary-driven partial-output hint contract. The next higher-value Symphony-aligned seam is the Telegram operator command cluster because the bridge still mixes command admission/routing/reply generation with runtime lifecycle after the earlier transport extractions. Evidence: `docs/findings/1138-telegram-oversight-command-controller-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved. Further standalone-review micro-lanes should pause unless a new reproducible live wrapper defect appears; the next truthful move is back on the Telegram runtime/operator seam. Evidence: `docs/findings/1138-telegram-oversight-command-controller-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed. Deterministic docs guards passed; the docs-review pipeline again failed at its own delegation guard before surfacing a concrete docs defect, so the package carries an explicit override rather than a clean docs-review pass. Evidence: `.runs/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/cli/2026-03-12T20-09-12-276Z-2ca21868/manifest.json`, `out/1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction/manual/20260312T200518Z-docs-first/00-summary.md`.
