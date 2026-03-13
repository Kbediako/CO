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
- 2026-03-13: Deterministic docs-first guards are green on the fixed registration tree. A follow-up `docs:check` rerun initially exposed that removing the historical `0962` / `0966` snapshots without an archive pointer pushed `docs/TASKS.md` out of its canonical-mirror contract; the docs packet was corrected with a live archive pointer plus a manual archive fallback payload because `npm run docs:archive-tasks` could not auto-select those legacy entries. The subsequent task-scoped `docs-review` rerun completed, but its review body still repeated the stale `0962` removal complaint even with the archive pointer already present, so the lane keeps an explicit docs-review override after the concrete docs defect was fixed. Evidence: `out/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/manual/20260313T160315Z-docs-first/00-summary.md`, `out/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/manual/20260313T160315Z-docs-first/05-docs-review-override.md`, `out/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/manual/20260313T160315Z-docs-first/04-manual-tasks-archive-0962.md`, `.runs/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/cli/2026-03-13T16-11-30-143Z-ed2b11de/manifest.json`.
