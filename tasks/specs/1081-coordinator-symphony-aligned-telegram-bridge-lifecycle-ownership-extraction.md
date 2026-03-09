---
id: 20260309-1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction
title: Coordinator Symphony-Aligned Telegram Bridge Lifecycle Ownership Extraction
status: draft
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md
related_tasks:
  - tasks/tasks-1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Bridge Lifecycle Ownership Extraction

## Summary

Extract the remaining Telegram bridge lifecycle ownership from `controlServerBootstrapLifecycle.ts` into one dedicated helper so the lifecycle keeps ordered startup ownership while Telegram-specific bridge state, subscription attachment, and shutdown behavior move behind one bounded seam.

## Scope

- Add one helper that owns Telegram bridge startup, runtime subscription attachment, bridge instance/unsubscribe state, and shutdown behavior.
- Delegate that Telegram bridge lifecycle phase in `controlServerBootstrapLifecycle.ts` to the extracted helper.
- Preserve lazy read-adapter creation, shutdown semantics, and startup ordering exactly.

## Out of Scope

- `persistControlBootstrapMetadata(...)` changes.
- Expiry lifecycle ownership or ordering changes.
- `createControlTelegramReadAdapter(...)` changes.
- `telegramOversightBridge.ts` transport/runtime internals.
- Splitting bridge startup and bridge attachment into separate helpers/files.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1080`. Evidence: `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/20260309T061702Z-closeout/14-next-slice-note.md`, `docs/findings/1081-telegram-bridge-lifecycle-ownership-extraction-deliberation.md`.
