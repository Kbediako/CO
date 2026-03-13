---
id: 20260313-1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Control Plane Lifecycle Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md
related_tasks:
  - tasks/tasks-1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Control Plane Lifecycle Shell Extraction

## Summary

Extract the duplicated run-entry control-plane lifecycle shell from `orchestrator.ts` after `1154` completed the remaining `ControlServer` public lifecycle thinning.

## Scope

- Shared control-plane setup/teardown across `Orchestrator.start()` and `Orchestrator.resume()`
- Rewiring `orchestrator.ts` to delegate the duplicated run-entry lifecycle shell
- Focused control-plane lifecycle regression coverage

## Out of Scope

- `ControlServer` and its adjacent lifecycle helpers
- Telegram bridge/runtime internals
- Route/controller decomposition
- Planner/runtime execution changes outside the duplicated lifecycle shell
- Auth/session/persistence policy changes

## Notes

- 2026-03-13: Registered after `1154` completed. The next truthful seam is the duplicated control-plane lifecycle shell in `orchestrator.ts`, not further `ControlServer` micro-refactors. Evidence: `out/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/manual/20260313T095117Z-closeout/14-next-slice-note.md`, `docs/findings/1155-orchestrator-control-plane-lifecycle-shell-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1155-orchestrator-control-plane-lifecycle-shell-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed with deterministic guards green (`spec-guard`, `docs:check`, `docs:freshness`). The manifest-backed `docs-review` failed at the pipeline's own delegation guard, so docs-review is recorded as an explicit override instead of approval. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T102900Z-docs-first/00-summary.md`, `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T102900Z-docs-first/05-docs-review-override.md`, `.runs/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/cli/2026-03-13T10-20-43-899Z-17f156c4/manifest.json`.
- 2026-03-13: Completed. `orchestrator.ts` now delegates the shared run-entry control-plane lifecycle shell through `orchestratorControlPlaneLifecycle.ts`, final focused regressions passed `3/3` files and `12/12` tests, the full suite passed `207/207` files and `1461/1461` tests, and the only explicit closeout overrides are stacked-branch `diff-budget` plus final review-wrapper drift after a concrete root-test placement fix. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/00-summary.md`, `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/05b-targeted-tests.log`, `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/05-test.log`, `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/13-override-notes.md`.
