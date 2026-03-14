---
id: 20260314-1177-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Cloud-Target Preflight Resolution And Sibling-Skip Shell Extraction
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction.md
related_tasks:
  - tasks/tasks-1177-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Cloud-Target Preflight Resolution And Sibling-Skip Shell Extraction

## Summary

Extract the remaining cloud-target pre-execution resolution and sibling-skip shell still shaped inline in `orchestratorCloudTargetExecutor.ts`.

## Scope

- bounded preflight resolution / sibling-skip shell
- preservation of caller-owned executor and return control flow
- focused unresolved-target and sibling-skip regressions

## Out of Scope

- missing-environment failure contract
- request-contract shaping
- the already-extracted running-state and `onUpdate` shell
- the already-extracted completion shell
- broader cloud-target lifecycle refactors

## Notes

- 2026-03-14: Registered immediately after `1176` closed. The next truthful risk is the pre-execution control-wait, target-resolution, and sibling-skip cluster in `orchestratorCloudTargetExecutor.ts`, not a broader cloud-target lifecycle refactor. Evidence: `docs/findings/1177-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction-deliberation.md`.
- 2026-03-14: Local read-only review approval for the docs-first packet is captured in the deliberation note and mirrored checklist. Evidence: `docs/findings/1177-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction-deliberation.md`, `tasks/tasks-1177-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction.md`.
- 2026-03-14: `docs-review` did not reach a diff-local review step for the registration packet; the pipeline failed at `Run delegation guard`, so the docs-first lane records an explicit override backed by direct local `spec-guard`, `docs:check`, and `docs:freshness` passes plus the run manifest `.runs/1177-coordinator-symphony-aligned-orchestrator-cloud-target-preflight-resolution-and-sibling-skip-shell-extraction/cli/2026-03-14T05-33-01-689Z-91f56617/manifest.json`.
