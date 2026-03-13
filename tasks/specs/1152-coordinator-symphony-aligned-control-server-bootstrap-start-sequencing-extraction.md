---
id: 20260313-1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction
title: Coordinator Symphony-Aligned Control Server Bootstrap Start Sequencing Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md
related_tasks:
  - tasks/tasks-1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Bootstrap Start Sequencing Extraction

## Summary

Extract the generic ordered bootstrap start sequencing out of `ControlServerBootstrapLifecycleRuntime.start()` into a tiny adjacent helper after `1151`.

## Scope

- Generic bootstrap start-sequencing ownership
- Rewiring of `controlServerBootstrapLifecycle.ts` to consume the extracted helper
- Focused bootstrap lifecycle regression coverage

## Out of Scope

- Telegram-local helper churn
- Bootstrap metadata schema or persistence changes
- Expiry lifecycle logic changes
- Telegram runtime lifecycle, polling, or projection-delivery changes
- Broader `controlBootstrapAssembly.ts` or `controlServer.ts` refactors

## Notes

- 2026-03-13: Registered after `1151` completed. The next truthful seam is the generic bootstrap start sequence in `ControlServerBootstrapLifecycleRuntime.start()`, which still owns metadata persistence, expiry startup, and best-effort Telegram bridge startup inline. Evidence: `out/1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction/manual/20260313T070606Z-closeout/14-next-slice-note.md`, `docs/findings/1152-control-server-bootstrap-start-sequencing-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1152-control-server-bootstrap-start-sequencing-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed with deterministic guards green (`spec-guard`, `docs:check`, `docs:freshness`). The first manifest-backed `docs-review` attempt failed at its own delegation guard; after seeding a prefixed delegated diagnostics manifest, the rerun reached the bounded docs diff but drifted into repo-wide docs conventions instead of surfacing a concrete `1152` docs defect, so docs-review is recorded as an explicit override. Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T073453Z-docs-first/00-summary.md`, `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T073453Z-docs-first/05-docs-review-override.md`, `.runs/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/cli/2026-03-13T07-36-46-577Z-c4ba5a50/manifest.json`.
