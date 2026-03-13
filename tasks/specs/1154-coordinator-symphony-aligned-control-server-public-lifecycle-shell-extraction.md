---
id: 20260313-1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction
title: Coordinator Symphony-Aligned Control Server Public Lifecycle Shell Extraction
status: active
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md
related_tasks:
  - tasks/tasks-1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Public Lifecycle Shell Extraction

## Summary

Extract the remaining public `ControlServer` lifecycle shell after `1153` moved the ready-instance lifecycle internals into an adjacent helper.

## Scope

- Public startup/close orchestration ownership around `ControlServer`
- Rewiring of `controlServer.ts` to delegate the public lifecycle shell
- Focused public lifecycle regression coverage

## Out of Scope

- Ready-instance lifecycle internals already extracted in `1153`
- Telegram bridge/runtime internals
- Startup-input schema or bootstrap-sequence changes
- Route/controller decomposition
- One-line helper-only churn

## Notes

- 2026-03-13: Registered after `1153` completed. The next truthful seam is the remaining public `ControlServer.start()/close()` lifecycle shell, while adjacent startup helpers are already cohesive and should not be split further just for churn. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/14-next-slice-note.md`, `docs/findings/1154-control-server-public-lifecycle-shell-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1154-control-server-public-lifecycle-shell-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed with deterministic guards green (`spec-guard`, `docs:check`, `docs:freshness`). The manifest-backed `docs-review` failed immediately at the pipeline's own delegation guard, so docs-review is recorded as an explicit override instead of approval. Evidence: `out/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/manual/20260313T090827Z-docs-first/00-summary.md`, `out/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/manual/20260313T090827Z-docs-first/05-docs-review-override.md`, `.runs/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/cli/2026-03-13T09-10-51-239Z-a91ae425/manifest.json`.
