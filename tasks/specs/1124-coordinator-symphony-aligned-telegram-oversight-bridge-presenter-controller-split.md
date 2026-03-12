---
id: 20260312-1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split
title: Coordinator Symphony-Aligned Telegram Oversight Bridge Presenter/Controller Split
status: completed
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md
related_tasks:
  - tasks/tasks-1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Oversight Bridge Presenter/Controller Split

## Summary

Extract the read-side presenter/controller surface from `telegramOversightBridge.ts` so the runtime shell keeps polling transport, persistent state, and mutation authority while read-side rendering moves behind a dedicated seam.

## Scope

- Extract read-side command routing for `/start`, `/help`, `/status`, `/issue`, `/dispatch`, and `/questions`.
- Extract read-side rendering and projection-hash-based push shaping used by Telegram notifications.
- Delegate those responsibilities from `telegramOversightBridge.ts` into one bounded helper.

## Out of Scope

- `applyControlCommand(...)` ownership or control-token-backed mutation writes.
- Telegram polling, `getUpdates`, `sendMessage`, or state persistence behavior.
- `controlRuntime.ts`, `linearDispatchSource.ts`, or `controlActionPreflight.ts`.
- Review-wrapper/path-model follow-on work.

## Notes

- 2026-03-12: Approved for docs-first registration as the next truthful post-`1123` Symphony-aligned seam. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/14-next-slice-note.md`, `docs/findings/1124-telegram-oversight-bridge-presenter-controller-split-deliberation.md`.
- 2026-03-12: Pre-implementation read-only review approved. The docs-first guard bundle passed, and `docs-review` succeeded after a manifest-backed `1124-...-guard` sub-run satisfied the delegation requirement. Evidence: `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/20260312T001520Z-docs-first/00-summary.md`, `.runs/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/cli/2026-03-12T00-17-09-300Z-4df1395d/manifest.json`, `.runs/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split-guard/cli/2026-03-12T00-16-24-029Z-e8ac7020/manifest.json`.
- 2026-03-12: Completed. `telegramOversightBridge.ts` now delegates read-side command routing and projection-delta shaping into `controlTelegramReadController.ts` while keeping polling transport, bridge state persistence, and pause/resume mutation authority in the bridge runtime. Focused final-tree Telegram regressions passed (`05-targeted-tests.log`), deterministic gates passed through `pack:smoke`, the standalone review returned no concrete `1124` finding, and the recurring unrelated full-suite quiet tail was recorded as an explicit override instead of being treated as green. Evidence: `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/20260312T003259Z-closeout/00-summary.md`, `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/20260312T003259Z-closeout/09-review.log`, `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/20260312T003259Z-closeout/13-override-notes.md`.
