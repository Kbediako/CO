---
id: 20260313-1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction
title: Coordinator Symphony-Aligned Control Oversight Read Service Boundary Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md
related_tasks:
  - tasks/tasks-1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Oversight Read Service Boundary Extraction

## Summary

Replace the Telegram-named read adapter beneath the coordinator-owned oversight facade with a coordinator-owned oversight read service after `1147`.

## Scope

- Coordinator-owned oversight read-service boundary beneath the facade
- Selected-run read assembly
- Dispatch read assembly
- Question read assembly
- `controlOversightFacade.ts` rewiring to consume the new read service

## Out of Scope

- Telegram polling/update-handler/state-store/queue internals
- Env/config parsing
- `telegramOversightBridge.ts` runtime lifecycle
- Dispatch/question behavior changes
- Broader `controlServer` rewrites

## Notes

- 2026-03-13: Registered after `1147` completed. The next truthful seam is to replace the Telegram-named read adapter beneath the new coordinator-owned oversight facade with a coordinator-owned read service, so the facade becomes structurally coordinator-owned all the way down. Evidence: `out/1147-coordinator-symphony-aligned-control-oversight-service-boundary-extraction/manual/20260313T030819Z-closeout/14-next-slice-note.md`, `docs/findings/1148-control-oversight-read-service-boundary-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1148-control-oversight-read-service-boundary-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed with deterministic guards green after folding the just-closed `1147` snapshot onto the top `docs/TASKS.md` line to stay within the archive threshold. The initial `docs-review` run stopped at its own delegation guard, a manifest-backed delegated scout then satisfied delegation evidence and progressed through `delegation-guard`, `build`, and `lint` before the recurring test quiet-tail, and the rerun of `docs-review` passed delegation/spec/docs/docs-freshness before drifting into unrelated skill/schema/history inspection without surfacing a concrete `1148` docs defect. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T041000Z-docs-first/00-summary.md`, `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T041000Z-docs-first/05-docs-review-override.md`, `.runs/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction-scout/cli/2026-03-13T03-37-26-053Z-78fcb1b5/manifest.json`, `.runs/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/cli/2026-03-13T03-39-45-410Z-5ea75c4e/manifest.json`.
