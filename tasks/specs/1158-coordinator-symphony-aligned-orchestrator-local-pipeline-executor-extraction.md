---
id: 20260313-1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction
title: Coordinator Symphony-Aligned Orchestrator Local-Pipeline Executor Extraction
status: active
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md
related_tasks:
  - tasks/tasks-1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Local-Pipeline Executor Extraction

## Summary

Extract the remaining local pipeline executor body from `orchestrator.ts` after `1156` completed the shared execution lifecycle shell extraction and `1157` extracted the cloud target executor.

## Scope

- One bounded local-pipeline executor service adjacent to `orchestrator.ts`
- Local-only stage-loop logic that belongs to that executor seam
- Rewiring the non-cloud lifecycle branch to delegate that local-only body
- Focused local orchestration regression coverage

## Out of Scope

- Cloud target execution changes
- Runtime selection / cloud preflight / fallback changes
- Start/resume lifecycle orchestration changes
- Control-plane / scheduler / TaskManager orchestration
- Manifest schema or run-event payload changes

## Notes

- 2026-03-13: Registered after `1157` completed. The next truthful seam is the remaining local pipeline executor cluster in the non-cloud lifecycle branch of `orchestrator.ts`, not another cloud helper split or a broader lifecycle refactor. Evidence: `out/1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction/manual/20260313T124615Z-closeout/14-next-slice-note.md`, `docs/findings/1158-orchestrator-local-pipeline-executor-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1158-orchestrator-local-pipeline-executor-extraction-deliberation.md`.
- 2026-03-13: Deterministic docs-first guards are green. The manifest-backed `docs-review` reached the reviewer with delegation guard satisfied but drifted into legacy `tasks/index.json` status-field investigation and unrelated `status-ui-build.mjs` inspection instead of completing a docs-only pass, so the lane is registered with an explicit docs-review override. Evidence: `out/1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction/manual/20260313T132508Z-docs-first/00-summary.md`, `out/1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction/manual/20260313T132508Z-docs-first/04-docs-review-override.md`.
