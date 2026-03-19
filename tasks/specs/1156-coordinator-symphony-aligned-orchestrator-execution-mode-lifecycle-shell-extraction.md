---
id: 20260313-1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Execution-Mode Lifecycle Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md
related_tasks:
  - tasks/tasks-1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Execution-Mode Lifecycle Shell Extraction

## Summary

Extract the duplicated local/cloud execution lifecycle shell from `orchestrator.ts` after `1155` completed the shared run-entry control-plane lifecycle extraction.

## Scope

- Shared execution lifecycle shell around the local and cloud execution bodies in `orchestrator.ts`
- Rewiring `orchestrator.ts` to delegate that shared lifecycle shell
- Focused execution lifecycle regression coverage

## Out of Scope

- Merging local and cloud execution bodies
- Runtime selection or cloud preflight/fallback policy changes
- `ControlServer`, Telegram internals, and observability/controller seams
- Provider-specific cloud executor refactors
- Manifest schema or run-event payload changes

## Notes

- 2026-03-13: Registered after `1155` completed. The next truthful seam is the shared execution lifecycle shell around the local/cloud execution paths in `orchestrator.ts`, not more startup-shell thinning. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/14-next-slice-note.md`, `docs/findings/1156-orchestrator-execution-mode-lifecycle-shell-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1156-orchestrator-execution-mode-lifecycle-shell-extraction-deliberation.md`.
- 2026-03-13: After task-scoped delegation evidence existed, the manifest-backed `docs-review` rerun succeeded with no docs findings for the registered package. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T113036Z-docs-first/04-docs-review.json`.
- 2026-03-13: Closed with the shared execution lifecycle shell extracted into `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`, focused cloud-ordering regression coverage added, deterministic gates green, full suite green (`208/208` files, `1465/1465` tests), pack-smoke green, and an explicit standalone-review drift override after the reviewer failed to converge on a terminal bounded verdict. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/00-summary.md`.
