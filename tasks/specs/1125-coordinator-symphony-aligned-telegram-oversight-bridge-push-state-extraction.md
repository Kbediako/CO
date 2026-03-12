---
id: 20260312-1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction
title: Coordinator Symphony-Aligned Telegram Oversight Bridge Push-State Extraction
status: draft
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md
related_tasks:
  - tasks/tasks-1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Telegram Oversight Bridge Push-State Extraction

## Summary

Extract the Telegram bridge push-state and cooldown persistence surface from `telegramOversightBridge.ts` so the runtime shell keeps transport, presenter/controller invocation, and mutation ownership while projection-state policy moves behind a dedicated helper.

## Scope

- Extract `telegram-oversight-state.json` load/default parsing.
- Extract push-state bookkeeping for last-sent and pending projection hashes plus cooldown timing.
- Delegate those responsibilities from `telegramOversightBridge.ts` into one bounded helper.

## Out of Scope

- Telegram polling/update ingestion or Bot API calls.
- `/pause`, `/resume`, or any mutation-authority path.
- The presenter/controller surface extracted in `1124`.
- `linearDispatchSource.ts`, `controlRuntime.ts`, or broader `controlServer.ts` refactors.

## Notes

- 2026-03-12: Registered after `1124` completed. With the read-side presenter/controller now extracted, the next truthful Telegram seam is the push-state/cooldown persistence cluster still living inline in `telegramOversightBridge.ts`. Evidence: `docs/findings/1125-telegram-oversight-bridge-push-state-extraction-deliberation.md`, `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/20260312T003259Z-closeout/00-summary.md`, `out/1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split/manual/20260312T003259Z-closeout/14-next-slice-note.md`.
- 2026-03-12: Pre-implementation local read-only review approved. The docs-first guard bundle passed, the manifest-backed `1125-...-guard` sub-run succeeded, and the bounded `docs-review` lane reached the correct docs-only review stage before drifting into low-signal comparison against older docs/task patterns. An explicit docs-review override was recorded rather than claiming a clean approval. Evidence: `out/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction/manual/20260312T005124Z-docs-first/00-summary.md`, `out/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction/manual/20260312T005124Z-docs-first/05-docs-review-override.md`, `.runs/1125-coordinator-symphony-aligned-telegram-oversight-bridge-push-state-extraction-guard/cli/2026-03-12T00-55-33-761Z-06fb4cc4/manifest.json`.
