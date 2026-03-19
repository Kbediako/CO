---
id: 20260313-1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction
title: Coordinator Symphony-Aligned Control Server Public Lifecycle Shell Extraction
status: completed
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
- 2026-03-13: Completed. `1154` extracted the remaining public `ControlServer.start()/close()` lifecycle shell into `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`, leaving `controlServer.ts` as a thin public handle while keeping the existing ready-instance and startup helpers intact. Focused final-tree regressions passed `2/2` files and `96/96` tests, bounded review returned no findings, `pack:smoke` passed, and the explicit non-green items are the unrelated `UnifiedExec` full-suite flake plus the stacked-branch `diff-budget` override. Evidence: `out/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/manual/20260313T095117Z-closeout/00-summary.md`, `out/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/manual/20260313T095117Z-closeout/05-test.log`, `out/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/manual/20260313T095117Z-closeout/05b-targeted-tests.log`, `out/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/manual/20260313T095117Z-closeout/09-review.log`, `out/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/manual/20260313T095117Z-closeout/10-pack-smoke.log`, `out/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/manual/20260313T095117Z-closeout/13-override-notes.md`.
