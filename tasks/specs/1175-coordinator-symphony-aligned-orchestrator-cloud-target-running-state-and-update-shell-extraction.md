---
id: 20260314-1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Cloud-Target Running-State And Update Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md
related_tasks:
  - tasks/tasks-1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Cloud-Target Running-State And Update Shell Extraction

## Summary

Extract the running-state transition and in-progress update shell still shaped inline in `orchestratorCloudTargetExecutor.ts`.

## Scope

- bounded activation and `onUpdate` persistence shell
- preservation of caller-owned final completion behavior
- focused activation/update regressions

## Out of Scope

- target-stage resolution or sibling skip behavior
- missing-environment failure contract
- request-contract shaping
- final success/failure result application
- broader cloud-target lifecycle refactors

## Notes

- 2026-03-14: Registered immediately after `1174` closed. The next truthful risk is the running-state and in-progress update shell in `orchestratorCloudTargetExecutor.ts`, not a broader cloud-target lifecycle refactor. Evidence: `docs/findings/1175-orchestrator-cloud-target-running-state-and-update-shell-extraction-deliberation.md`.
- 2026-03-14: `docs-review` did not reach a diff-local review step for the registration packet; the pipeline failed at `Run delegation guard`, so the docs-first lane records an explicit override backed by direct local `spec-guard`, `docs:check`, and `docs:freshness` passes plus the run manifest `.runs/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/cli/2026-03-14T04-34-36-015Z-bd8097ad/manifest.json`.
- 2026-03-14: Closed repo-side after extracting the same-module running-state and `onUpdate` shell helper in `orchestratorCloudTargetExecutor.ts`, adding focused executor regressions, and validating the lane with delegation guard, spec guard, build, lint, full test (`218/218` files, `1506/1506` tests), targeted regressions, docs gates, pack-smoke, and an explicit standalone-review drift override. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/00-summary.md`.
