---
id: 20260312-1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction
title: Coordinator Symphony-Aligned Telegram Control Action API Client Extraction
status: completed
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md
related_tasks:
  - tasks/tasks-1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Control Action API Client Extraction

## Summary

Extract the `/control/action` transport client from `telegramOversightBridge.ts` so the runtime shell keeps command orchestration and mutation ownership while control request/response handling moves behind a dedicated helper.

## Scope

- Extract control auth header construction.
- Extract `POST /control/action` request/response handling.
- Delegate control transport error translation out of `telegramOversightBridge.ts`.

## Out of Scope

- Poll-loop/update sequencing or `next_update_id` persistence.
- Telegram Bot API transport extracted in `1126`.
- The presenter/controller seam extracted in `1124`.
- The push-state/cooldown seam extracted in `1125`.

## Notes

- 2026-03-12: Registered after `1126` completed. With the Telegram Bot API transport now extracted, the next truthful Telegram/control seam is the remaining inline `/control/action` write client still living in `telegramOversightBridge.ts`. Evidence: `docs/findings/1127-telegram-control-action-api-client-extraction-deliberation.md`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/00-summary.md`, `out/1126-coordinator-symphony-aligned-telegram-bot-api-client-extraction/manual/20260312T024700Z-closeout/14-next-slice-note.md`.
- 2026-03-12: Pre-implementation local read-only review approved. The scout converged on the remaining inline control transport seam, and the docs-first guard bundle passed on the registered package. Evidence: `docs/findings/1127-telegram-control-action-api-client-extraction-deliberation.md`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T033500Z-docs-first/00-summary.md`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T033500Z-docs-first/01-spec-guard.log`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T033500Z-docs-first/02-docs-check.log`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T033500Z-docs-first/03-docs-freshness.log`.
- 2026-03-12: Manifest-backed `docs-review` succeeded for the registered `1127` package after delegation/spec/docs checks all passed. A parallel diagnostics guard run hit the known unrelated `UnifiedExec` timeout flake and is not the approval artifact for this lane. Evidence: `.runs/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/cli/2026-03-12T02-31-38-548Z-c62056d4/manifest.json`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T033500Z-docs-first/00-summary.md`.
- 2026-03-12: Implemented and validated. `telegramOversightBridge.ts` now delegates the `/control/action` auth-header, POST, and non-2xx error-translation seam into `telegramOversightControlActionApiClient.ts` while preserving Telegram payload shaping, mutation gating, and reply text in the bridge. Focused Telegram regressions passed `13/13`, the full suite passed `194/194` files and `1399/1399` tests, forced bounded review returned no findings, and `pack:smoke` passed. Evidence: `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/00-summary.md`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/05-targeted-tests.log`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/08-test.log`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/10-review.log`, `out/1127-coordinator-symphony-aligned-telegram-control-action-api-client-extraction/manual/20260312T024917Z-closeout/11-pack-smoke.log`.
