---
id: 20260313-1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction
title: Coordinator Symphony-Aligned Control Telegram Bridge Bootstrap Oversight Factory Extraction
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md
related_tasks:
  - tasks/tasks-1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Telegram Bridge Bootstrap Oversight Factory Extraction

## Summary

Extract the lazy Telegram bootstrap oversight-facade assembly out of `controlTelegramBridgeBootstrapLifecycle.ts` into a tiny adjacent helper/factory after `1150`.

## Scope

- Bootstrap-local lazy oversight-factory ownership
- Rewiring of `controlTelegramBridgeBootstrapLifecycle.ts` to consume the extracted helper
- Focused bootstrap and adjacent lifecycle regression coverage

## Out of Scope

- Telegram polling, runtime lifecycle, or projection-delivery behavior changes
- `ControlTelegramBridgeLifecycle` sequencing changes
- Read-contract or update-contract changes
- Broader `controlServer` or startup-shell refactors

## Notes

- 2026-03-13: Registered after `1150` completed. The next truthful seam is the bootstrap-side lazy oversight-facade assembly in `controlTelegramBridgeBootstrapLifecycle.ts`, which still builds the facade inline from `requestContextShared`, `getExpiryLifecycle()`, and `emitDispatchPilotAuditEvents`. Evidence: `out/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction/manual/20260313T060724Z-closeout/14-next-slice-note.md`, `docs/findings/1151-control-telegram-bridge-bootstrap-oversight-factory-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1151-control-telegram-bridge-bootstrap-oversight-factory-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed with deterministic guards green (`spec-guard`, `docs:check`, `docs:freshness`). The first manifest-backed `docs-review` attempt failed at its own delegation guard, so a prefixed delegated diagnostics sub-run was added and the docs-review rerun then succeeded. Evidence: `out/1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction/manual/20260313T064728Z-docs-first/00-summary.md`, `out/1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction/manual/20260313T064728Z-docs-first/04-docs-review.json`, `.runs/1151-coordinator-symphony-aligned-control-telegram-bridge-bootstrap-oversight-factory-extraction/cli/2026-03-13T06-53-47-957Z-6285e0cb/manifest.json`.
