---
id: 20260313-1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Guard-and-Planning Shell Extraction
status: active
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md
related_tasks:
  - tasks/tasks-1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Guard-and-Planning Shell Extraction

## Summary

Extract the post-privacy-reset guard-and-planning shell from `performRunLifecycle(...)` after `1162` completed TaskManager registration extraction.

## Scope

- One bounded guard-and-planning helper adjacent to `performRunLifecycle(...)`
- `this.controlPlane.guard(...)`
- `this.scheduler.createPlanForRun(...)`
- Focused ordering / forwarding / short-circuit regression coverage

## Out of Scope

- The explicit privacy reset
- TaskManager registration extracted in `1162`
- `manager.execute(...)` ownership or `runError(...)` emission
- Completion handling extracted in `1161`
- Public `start()` / `resume()` lifecycle entrypoints

## Notes

- 2026-03-13: Registered after `1162` completed. The next truthful seam is the remaining guard-and-planning cluster still inline in `performRunLifecycle(...)` after the explicit privacy reset. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/14-next-slice-note.md`, `docs/findings/1163-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1163-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration was reconciled after two concrete follow-ups: restoring the dropped `1162` snapshot in `docs/TASKS.md` and trimming `docs/TASKS.md` back under the line cap with a manual archive fallback because `npm run docs:archive-tasks` did not detect an eligible section on the current inline snapshot format. Deterministic docs guards passed afterward. The follow-up `docs-review` rerun then drifted into code-level inspection of `orchestrator.ts`, so the lane keeps an explicit docs-review override after the concrete docs defects were fixed. Evidence: `out/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction/manual/20260313T175000Z-docs-first/00-summary.md`, `out/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction/manual/20260313T175000Z-docs-first/02a-docs-archive-tasks.log`, `out/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction/manual/20260313T175000Z-docs-first/04-manual-tasks-archive-1061.md`, `out/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction/manual/20260313T175000Z-docs-first/05-docs-review-override.md`, `.runs/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction/cli/2026-03-13T17-44-48-672Z-17704d52/manifest.json`.
