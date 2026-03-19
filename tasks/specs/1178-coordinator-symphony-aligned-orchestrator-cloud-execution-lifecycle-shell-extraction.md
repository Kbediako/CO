---
id: 20260314-1178-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Cloud Execution Lifecycle Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md
related_tasks:
  - tasks/tasks-1178-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Cloud Execution Lifecycle Shell Extraction

## Summary

Extract the remaining cloud execution lifecycle shell still shaped inline in `executeCloudPipeline()` in `orchestrator.ts`.

## Scope

- bounded cloud-only lifecycle wrapper around `runOrchestratorExecutionLifecycle(...)`
- preservation of cloud `executeBody` delegation to `executeOrchestratorCloudTarget(...)`
- focused note-propagation and success-shaping regressions

## Out of Scope

- `runOrchestratorExecutionLifecycle(...)` behavior changes
- `executeOrchestratorCloudTarget(...)` internal behavior changes
- router fallback or execution-mode policy changes
- local execution lifecycle extraction
- broader orchestrator refactors

## Notes

- 2026-03-14: Registered immediately after `1177` closed. The next truthful risk is the remaining cloud-only lifecycle wrapper in `executeCloudPipeline()` in `orchestrator.ts`, not another cloud-target-internal extraction or fallback-policy change. Evidence: `docs/findings/1178-orchestrator-cloud-execution-lifecycle-shell-extraction-deliberation.md`, `out/1177-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction/manual/20260314T053902Z-closeout/14-next-slice-note.md`.
- 2026-03-14: Local read-only review approval for the docs-first packet is captured in the deliberation note and mirrored checklist. Evidence: `docs/findings/1178-orchestrator-cloud-execution-lifecycle-shell-extraction-deliberation.md`, `tasks/tasks-1178-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction.md`.
- 2026-03-14: `docs-review` did not reach a diff-local review step for the registration packet; the pipeline failed at `Run delegation guard`, so the docs-first lane records an explicit override backed by direct local `spec-guard`, `docs:check`, and `docs:freshness` passes plus the run manifest `.runs/1178-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction/cli/2026-03-14T05-56-38-798Z-fd3362ba/manifest.json`.
- 2026-03-14: Closed repo-side after extracting `runCloudExecutionLifecycleShell(...)` in `orchestrator/src/cli/orchestrator.ts`, adding focused lifecycle-shell regressions in `orchestrator/tests/OrchestratorCloudExecutionLifecycleShell.test.ts`, and validating with `delegation-guard`, `spec-guard`, `build`, `lint`, focused regressions (`2` files / `8` tests), `docs:check`, `docs:freshness`, diff-budget override, bounded review with no findings, and `pack:smoke`. The only explicit non-green item is the recurring full-suite `npm run test` quiet-tail after the last visible `tests/cli-orchestrator.spec.ts` pass, recorded as an override rather than a false clean full-suite pass. Evidence: `out/1178-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction/manual/20260314T060306Z-closeout/00-summary.md`, `out/1178-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction/manual/20260314T060306Z-closeout/13-override-notes.md`.
