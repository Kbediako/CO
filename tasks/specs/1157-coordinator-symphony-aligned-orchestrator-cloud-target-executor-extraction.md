---
id: 20260313-1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction
title: Coordinator Symphony-Aligned Orchestrator Cloud-Target Executor Extraction
status: active
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md
related_tasks:
  - tasks/tasks-1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Cloud-Target Executor Extraction

## Summary

Extract the remaining cloud-only target executor body from `orchestrator.ts` after `1156` completed the shared execution lifecycle shell extraction.

## Scope

- One bounded cloud-target executor service adjacent to `orchestrator.ts`
- Cloud-only prompt/config helpers that belong to that executor seam
- Rewiring `executeCloudPipeline(...)` to delegate the cloud-only body
- Focused cloud-target regression coverage

## Out of Scope

- Local execution body extraction
- Runtime selection / cloud preflight / fallback changes
- Start/resume bootstrap dedupe
- `performRunLifecycle(...)` control-plane / scheduler / TaskManager orchestration
- Manifest schema or run-event payload changes

## Notes

- 2026-03-13: Registered after `1156` completed. The next truthful seam is the cloud-only target executor cluster in `orchestrator.ts`, not a prompt-only extraction or another broad lifecycle refactor. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/14-next-slice-note.md`, `docs/findings/1157-orchestrator-cloud-target-executor-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1157-orchestrator-cloud-target-executor-extraction-deliberation.md`.
- 2026-03-13: Deterministic docs-first guards are green. The manifest-backed `docs-review` reached the reviewer with delegation guard satisfied but drifted into nearby code inspection instead of completing a docs-only pass, so the lane is registered with an explicit docs-review override. Evidence: `out/1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction/manual/20260313T122837Z-docs-first/00-summary.md`, `out/1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction/manual/20260313T122837Z-docs-first/04-docs-review-override.md`.
