---
id: 20260313-1142-coordinator-symphony-aligned-telegram-projection-notification-interleaving-backstop
title: Coordinator Symphony-Aligned Telegram Projection Notification Interleaving Backstop
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-projection-notification-interleaving-backstop.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-projection-notification-interleaving-backstop.md
related_tasks:
  - tasks/tasks-1142-coordinator-symphony-aligned-telegram-projection-notification-interleaving-backstop.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Projection Notification Interleaving Backstop

## Summary

Add a direct regression backstop for the Telegram bridge interleaving semantics around projection-notification patch application and update-offset persistence after `1141`.

## Scope

- Add one direct bridge-level regression proof for preserved `next_update_id`.
- Add one direct bridge-level regression proof for monotonic top-level `updated_at`.
- Keep the slice tests-first unless a minimal production fix is required.

## Out of Scope

- Further Telegram controller extraction.
- Transport or lifecycle redesign.
- Read-side or mutating-command behavior changes.
- Linear/runtime feature work.

## Notes

- 2026-03-13: Registered after `1141` completed. The next truthful move is a regression-proof lane, not another Telegram production refactor: the remaining unpinned surface is the bridge-owned interleaving between `handleUpdates(...)` and `maybeSendProjectionDelta(...)`. Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/15-next-slice-note.md`, `docs/findings/1142-telegram-projection-notification-interleaving-backstop-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1142-telegram-projection-notification-interleaving-backstop-deliberation.md`.
- 2026-03-13: Deterministic docs-first guards passed for the registered package (`spec-guard`, `docs:check`, `docs:freshness`). Evidence: `out/1142-coordinator-symphony-aligned-telegram-projection-notification-interleaving-backstop/manual/20260312T222403Z-docs-first/01-spec-guard.log`, `out/1142-coordinator-symphony-aligned-telegram-projection-notification-interleaving-backstop/manual/20260312T222403Z-docs-first/02-docs-check.log`, `out/1142-coordinator-symphony-aligned-telegram-projection-notification-interleaving-backstop/manual/20260312T222403Z-docs-first/03-docs-freshness.log`.
- 2026-03-13: `docs-review` was attempted at `.runs/1142-coordinator-symphony-aligned-telegram-projection-notification-interleaving-backstop/cli/2026-03-12T22-24-58-836Z-3cca91cf/manifest.json` and failed at its own delegation guard before surfacing a concrete docs defect, so this lane carries an explicit docs-review override rather than a clean docs-review pass. Evidence: `out/1142-coordinator-symphony-aligned-telegram-projection-notification-interleaving-backstop/manual/20260312T222403Z-docs-first/04-docs-review.json`.
