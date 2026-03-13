---
id: 20260313-1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Execution-Routing Shell Extraction
status: active
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md
related_tasks:
  - tasks/tasks-1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Execution-Routing Shell Extraction

## Summary

Extract the remaining execution-routing shell from `orchestrator.ts` after `1156` completed the shared execution lifecycle shell extraction, `1157` extracted the cloud-target executor, and `1158` extracted the local pipeline executor.

## Scope

- One bounded execution-routing shell service adjacent to `orchestrator.ts`
- Mode-policy helpers that belong to that routing seam
- Runtime-selection/env merge, cloud preflight/fallback shaping, and local/cloud executor dispatch
- Focused routing regression coverage

## Out of Scope

- Local or cloud executor body changes
- Runtime-selection semantic changes
- Start/resume lifecycle orchestration changes
- `performRunLifecycle(...)` control-plane / scheduler / TaskManager orchestration
- Manifest schema or run-event payload changes

## Notes

- 2026-03-13: Registered after `1158` completed. The next truthful seam is the remaining execution-routing shell in `orchestrator.ts`, not another executor-body split or a broader lifecycle refactor. Evidence: `out/1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction/manual/20260313T134357Z-closeout/14-next-slice-note.md`, `docs/findings/1159-orchestrator-execution-routing-shell-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1159-orchestrator-execution-routing-shell-extraction-deliberation.md`.
- 2026-03-13: Deterministic docs-first guards are green. The manifest-backed `docs-review` reached the live diff but then drifted into prior-task checklist comparison instead of finishing a bounded docs-only pass, so the lane is registered with an explicit docs-review override. Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-docs-first/00-summary.md`, `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-docs-first/05-docs-review-override.md`.
