---
id: 20260314-1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Local Execution Lifecycle Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md
related_tasks:
  - tasks/tasks-1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Local Execution Lifecycle Shell Extraction

## Summary

Extract the mirrored local execution lifecycle shell still shaped inline in `executeLocalRoute()` in `orchestratorExecutionRouter.ts`.

## Scope

- bounded local `runOrchestratorExecutionLifecycle(...)` wrapper
- preservation of fallback-summary shaping, local `runAutoScout` pass-through, and local executor note propagation
- focused regressions for the extracted router-local lifecycle shell

## Out of Scope

- runtime selection and cloud preflight or fallback policy changes
- `runOrchestratorExecutionLifecycle(...)` behavior changes
- `executeOrchestratorLocalPipeline(...)` internals
- broader router refactors beyond the local lifecycle shell

## Notes

- 2026-03-14: Registered immediately after `1178` closed. The next truthful risk is the mirrored local lifecycle wrapper in `executeLocalRoute()` in `orchestratorExecutionRouter.ts`, not another cloud-side extraction or fallback-policy change. Evidence: `docs/findings/1179-orchestrator-local-execution-lifecycle-shell-extraction-deliberation.md`, `out/1178-coordinator-symphony-aligned-orchestrator-cloud-execution-lifecycle-shell-extraction/manual/20260314T060306Z-closeout/14-next-slice-note.md`.
- 2026-03-14: Local read-only review approval for the docs-first packet is captured in the deliberation note and mirrored checklist. Evidence: `docs/findings/1179-orchestrator-local-execution-lifecycle-shell-extraction-deliberation.md`, `tasks/tasks-1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction.md`.
- 2026-03-14: `docs-review` did not reach a diff-local review step for the registration packet; the pipeline failed at `Run delegation guard`, so the docs-first lane records an explicit override backed by direct local `spec-guard`, `docs:check`, and `docs:freshness` passes plus the run manifest `.runs/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/cli/2026-03-14T06-15-44-724Z-82987838/manifest.json`.
- 2026-03-14: Closed repo-side after extracting `runLocalExecutionLifecycleShell(...)` in `orchestratorExecutionRouter.ts`, with focused router regressions passing `1` file / `10` tests and bounded review returning no findings. The only explicit non-green item is the recurring full-suite quiet-tail after the last visible `tests/cli-orchestrator.spec.ts` pass, recorded as an override rather than a clean full-suite pass. Evidence: `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/20260314T062139Z-closeout/00-summary.md`, `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/20260314T062139Z-closeout/05b-targeted-tests.log`, `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/20260314T062139Z-closeout/09-review.log`, `out/1179-coordinator-symphony-aligned-orchestrator-local-execution-lifecycle-shell-extraction/manual/20260314T062139Z-closeout/13-override-notes.md`.
