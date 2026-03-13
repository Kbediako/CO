---
id: 20260313-1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Completion Shell Extraction
status: active
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md
related_tasks:
  - tasks/tasks-1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Completion Shell Extraction

## Summary

Extract the post-execution completion shell from `performRunLifecycle(...)` after `1160` completed the execution-registration shell extraction.

## Scope

- One bounded completion shell adjacent to `orchestrator.ts`
- Scheduler finalization
- Run-summary apply/projection steps
- Run-summary persistence
- Completion event emission
- Final `{ manifest, runSummary }` return assembly
- Focused completion regression coverage

## Out of Scope

- Execution-routing or execution-registration changes
- Control-plane guard execution
- Scheduler plan creation
- `manager.execute(...)` ownership or error-path emission
- Public `start()` / `resume()` lifecycle entrypoints

## Notes

- 2026-03-13: Registered after `1160` completed. The next truthful seam is the post-execution completion block still inline in `performRunLifecycle(...)`, not a broader lifecycle refactor. Evidence: `out/1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction/manual/20260313T152633Z-closeout/14-next-slice-note.md`, `docs/findings/1161-orchestrator-perform-run-lifecycle-completion-shell-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1161-orchestrator-perform-run-lifecycle-completion-shell-extraction-deliberation.md`.
- 2026-03-13: Deterministic docs-first guards are green. The first task-scoped docs-review run failed at `delegation-guard` because the new task prefix had no subagent manifest yet; after seeding a canonical scout subrun, the rerun passed `delegation-guard`, `spec-guard`, `docs:check`, and `docs:freshness`, then drifted into broader registry/path inspection and tooling speculation without producing a concrete `1161` docs finding, so the lane is registered with an explicit docs-review override. Evidence: `out/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/manual/20260313T155728Z-docs-first/00-summary.md`, `out/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/manual/20260313T155728Z-docs-first/05-docs-review-override.md`, `.runs/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/cli/2026-03-13T16-01-54-623Z-6c1adf2b/manifest.json`.
