---
id: 20260314-1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Local Route Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md
related_tasks:
  - tasks/tasks-1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Local Route Shell Extraction

## Summary

Extract the bounded local-route shell still shaped inline in `runLocalExecutionLifecycleShell(...)` in `orchestratorExecutionRouter.ts`.

## Scope

- bounded local-route shell around `runLocalExecutionLifecycleShell(...)`
- preservation of runtime-fallback summary append, local auto-scout env forwarding, local execution dispatch, and guardrail recommendation append
- focused regressions for runtime-fallback summary behavior, auto-scout env propagation, local execution dispatch, and guardrail recommendation append

## Out of Scope

- route-state resolution
- cloud-route shell
- execution-mode policy helpers
- shared `failExecutionRoute(...)` contract
- lifecycle runner or local executor internals
- broader router refactors beyond the bounded local-route shell

## Notes

- 2026-03-14: Registered immediately after `1181` closed. The next truthful route-local risk is the remaining `runLocalExecutionLifecycleShell(...)` wrapper in `orchestratorExecutionRouter.ts`, not another route-state, cloud-route, or execution-mode policy extraction. Evidence: `docs/findings/1182-orchestrator-local-route-shell-extraction-deliberation.md`, `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/20260314T071433Z-closeout/14-next-slice-note.md`.
- 2026-03-14: Local read-only review approval for the docs-first packet is captured in the deliberation note and mirrored checklist. Evidence: `docs/findings/1182-orchestrator-local-route-shell-extraction-deliberation.md`, `tasks/tasks-1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md`.
- 2026-03-14: `docs-review` did not reach a diff-local review step for the registration packet; the pipeline failed at `Run delegation guard`, so the docs-first lane records an explicit override backed by direct local `spec-guard`, `docs:check`, and `docs:freshness` passes plus the run manifest `.runs/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/cli/2026-03-14T07-36-58-890Z-f85e0f94/manifest.json`.
