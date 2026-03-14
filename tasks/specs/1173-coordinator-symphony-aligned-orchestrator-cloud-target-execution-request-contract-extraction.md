---
id: 20260314-1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction
title: Coordinator Symphony-Aligned Orchestrator Cloud-Target Execution Request Contract Extraction
status: draft
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md
related_tasks:
  - tasks/tasks-1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Cloud-Target Execution Request Contract Extraction

## Summary

Extract the remaining inline request contract assembled before `CodexCloudTaskExecutor.execute(...)` in `orchestratorCloudTargetExecutor.ts`.

## Scope

- bounded cloud-target execution request shaping
- preservation of caller-owned lifecycle/persistence behavior
- focused cloud-target request regressions

## Out of Scope

- cloud preflight or fallback changes
- `resolveCloudEnvironmentId(...)` precedence changes
- `CodexCloudTaskExecutor.execute(...)` semantic changes
- manifest persistence or run-event lifecycle changes

## Notes

- 2026-03-14: Approved for docs-first registration immediately after `1172`. The next truthful risk is the inline request-contract assembly in `orchestratorCloudTargetExecutor.ts`, not another router/doctor preflight lane. Evidence: `docs/findings/1173-orchestrator-cloud-target-execution-request-contract-extraction-deliberation.md`.
- 2026-03-14: The initial docs-first `docs:check` hit a real `docs/TASKS.md` line-cap breach (`451/450`). `npm run docs:archive-tasks` found no eligible archive target, so the fix was to fold the `1173` registration note into the current top snapshot line and rerun the deterministic docs guards successfully. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T033431Z-docs-first/00-summary.md`.
- 2026-03-14: docs-review was started manifest-backed, then terminated as an explicit override after it drifted into unrelated helper/review-wrapper files instead of staying on the bounded `1173` docs surface. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T033431Z-docs-first/05-docs-review-override.md`.
