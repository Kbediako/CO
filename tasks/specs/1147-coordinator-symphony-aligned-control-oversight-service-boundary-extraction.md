---
id: 20260313-1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction
title: Coordinator Symphony-Aligned Control Oversight Service Boundary Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md
related_tasks:
  - tasks/tasks-1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Oversight Service Boundary Extraction

## Summary

Extract a coordinator-owned oversight facade for the current Telegram consumer contract after `1146`.

## Scope

- Selected-run read exposure for Telegram
- Dispatch read exposure for Telegram
- Question read exposure for Telegram
- Projection/update subscription exposure for Telegram
- Telegram bootstrap/lifecycle rewiring onto the facade

## Out of Scope

- Telegram polling/update-handler/state-store/queue internals
- Env/config parsing
- `next_update_id` ownership
- Broader `controlServer` rewrites
- New surface semantics or authority changes

## Notes

- 2026-03-13: Registered after `1146` completed. The next truthful seam is a coordinator-owned oversight facade, not another Telegram-only helper. Telegram currently consumes coordinator state through separate runtime subscription, bootstrap read assembly, and dispatch/question read helpers. Evidence: `out/1146-coordinator-symphony-aligned-telegram-projection-delivery-queue-shell-extraction/manual/20260313T021256Z-closeout/14-next-slice-note.md`, `docs/findings/1147-control-oversight-service-boundary-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1147-control-oversight-service-boundary-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed with explicit docs-review override after the rerun fixed the dropped `1061` `docs/TASKS.md` snapshot line, passed delegation/spec/docs checks, then drifted into repetitive registry/index/adjacent-doc hygiene reinspection without surfacing a second concrete `1147` defect. Evidence: `out/1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction/manual/20260313T023133Z-docs-first/00-summary.md`, `out/1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction/manual/20260313T023133Z-docs-first/05-docs-review-override.md`.
