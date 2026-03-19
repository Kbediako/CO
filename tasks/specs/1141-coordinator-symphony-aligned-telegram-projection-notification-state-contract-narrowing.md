---
id: 20260313-1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing
title: Coordinator Symphony-Aligned Telegram Projection Notification State Contract Narrowing
status: completed
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md
related_tasks:
  - tasks/tasks-1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Projection Notification State Contract Narrowing

## Summary

Narrow the state contract of `controlTelegramProjectionNotificationController.ts` so it stops accepting and returning the full `TelegramOversightBridgeState`, while keeping whole-state assembly, persistence, and queue ownership in `telegramOversightBridge.ts`.

## Scope

- Replace full-state controller input/output with a smaller notification-local contract.
- Keep bridge-level state assembly and persistence in `telegramOversightBridge.ts`.
- Preserve existing Telegram dedupe/cooldown/send semantics.

## Out of Scope

- Queue ownership or lifecycle changes.
- Telegram transport changes.
- Ingress handling changes.
- Read presentation changes.

## Notes

- 2026-03-13: Registered after `1140` completed. The next truthful Telegram seam is contract narrowing, not another branch extraction: the outbound controller is already separated, but its state contract is wider than necessary because it still accepts/returns the full bridge state. Evidence: `docs/findings/1141-telegram-projection-notification-state-contract-narrowing-deliberation.md`, `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/15-next-slice-note.md`.
- 2026-03-13: Pre-implementation local read-only review approved. A bounded `gpt-5.4` scout confirmed the next truthful seam is contract narrowing: the bridge stays the owner of `TelegramOversightBridgeState`, while the controller can narrow toward the push-state slice and return shape only. Evidence: `docs/findings/1141-telegram-projection-notification-state-contract-narrowing-deliberation.md`, `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T214301Z-docs-first/00-summary.md`.
- 2026-03-13: Docs-first registration completed. Deterministic docs guards passed; the docs-review pipeline again failed at its own delegation guard before surfacing a concrete docs defect, so the package carries an explicit override rather than a clean docs-review pass. Evidence: `.runs/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/cli/2026-03-12T21-47-16-133Z-d34bab4d/manifest.json`, `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T214301Z-docs-first/00-summary.md`.
- 2026-03-13: Completed. The projection-notification controller now consumes only `pushState` and returns a bridge-applied `statePatch`, while `telegramOversightBridge.ts` remains the only owner of full-state assembly, persistence, `next_update_id`, and queue/runtime lifecycle. Focused regressions passed `3/3` files and `20/20` tests, the final full suite passed `197/197` files and `1432/1432` tests, bounded review returned no findings, and `pack:smoke` passed. Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/00-summary.md`.
