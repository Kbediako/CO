---
id: 20260313-1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Task-Manager Registration Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md
related_tasks:
  - tasks/tasks-1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Task-Manager Registration Shell Extraction

## Summary

Extract the TaskManager-registration harness from `performRunLifecycle(...)` after `1161` completed the post-execution completion shell extraction.

## Scope

- One bounded TaskManager-registration helper adjacent to `performRunLifecycle(...)`
- Execution-registration composition, `TaskManager` creation, and plan-target tracker attachment
- Preserve mode-policy wiring and `plan_target_id` persistence behavior
- Focused manager-wiring / plan-target tracking regression coverage

## Out of Scope

- Privacy reset
- Control-plane guard execution
- Scheduler plan creation
- `manager.execute(...)` ownership or error-path emission
- Completion handling extracted in `1161`
- Public `start()` / `resume()` lifecycle entrypoints

## Notes

- 2026-03-13: Registered after `1161` completed. The next truthful seam is the TaskManager-registration harness still inline in `performRunLifecycle(...)`, not the following guard/planning sequence. Evidence: `out/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/manual/20260313T163957Z-closeout/14-next-slice-note.md`, `docs/findings/1162-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1162-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction-deliberation.md`.
- 2026-03-13: Deterministic docs-first guards are green. The initial task-scoped `docs-review` attempt failed immediately at `delegation-guard` because the new task id did not yet have a manifest-backed subagent run; after adding a bounded `1162-...-guard` diagnostics sub-run, the rerun passed `delegation-guard`, `spec-guard`, `docs:check`, and `docs:freshness`, then stalled inside the final review wrapper after diff inspection without surfacing a concrete docs defect, so the lane keeps an explicit docs-review override. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T165501Z-docs-first/00-summary.md`, `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T165501Z-docs-first/05-docs-review-override.md`, `.runs/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction-guard/cli/2026-03-13T17-00-19-428Z-8852dbd4/manifest.json`, `.runs/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/cli/2026-03-13T17-01-13-246Z-176a7716/manifest.json`.
- 2026-03-13: Completed. The final tree keeps the seam as a class-local helper in `orchestrator.ts`, not a new external service wrapper, after the delegated elegance pass showed the first free-function cut was broader than the truthful ownership boundary. Deterministic guards/build/lint/docs/full test/review/pack-smoke are green; the only explicit closeout override is the stacked-branch diff-budget waiver. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/00-summary.md`, `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/05-targeted-tests.log`, `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/05b-test.log`, `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/09-review.log`, `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/10-pack-smoke.log`, `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/12-elegance-review.md`, `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/13-override-notes.md`.
