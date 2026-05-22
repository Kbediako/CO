---
id: 20260314-1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Start-Resume Control-Plane Launch Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md
related_tasks:
  - tasks/tasks-1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Start-Resume Control-Plane Launch Shell Extraction

## Summary

Validate and close the extracted control-plane launch wrapper shared by `CodexOrchestrator.start()` and `CodexOrchestrator.resume()` through the adjacent `withControlPlaneLifecycle(...)` helper, with a resume-only pre-start failure hook.

## Scope

- shared `start()` / `resume()` control-plane launch shell
- emitter selection and lifecycle ownership
- lifecycle-scoped `runEvents` creation and `performRunLifecycle(...)` delegation
- resume-only pre-start failure persistence hook (`onStartFailure`)
- focused CLI and cleanup-order coverage

## Out of Scope

- start/resume preparation logic
- execution routing or execution lifecycle internals
- control-plane startup implementation changes
- manifest persistence abstractions outside the current resume failure path

## Notes

- 2026-03-14: Registered after `1167` completed. The next truthful seam is the duplicated `start()` / `resume()` control-plane launch wrapper, not another routing or public-entry reassessment. Evidence: `docs/findings/1168-orchestrator-start-resume-control-plane-launch-shell-extraction-deliberation.md`.
- 2026-03-14: Pre-implementation local read-only review approved this bounded seam. The shared steps are emitter selection, `startOrchestratorControlPlaneLifecycle(...)`, `createRunEventPublisher(...)`, `performRunLifecycle(...)`, and guaranteed lifecycle close; the only meaningful divergence is resume's pre-start failure persistence. Evidence: `docs/findings/1168-orchestrator-start-resume-control-plane-launch-shell-extraction-deliberation.md`.
- 2026-03-14: Completed. `CodexOrchestrator.start()` and `resume()` now share `withControlPlaneLifecycle(...)`, resume keeps the explicit `onStartFailure` manifest-persistence hook, focused regressions passed `9/9`, full suite passed `216/216` files and `1491/1491` tests, bounded review returned no findings, and pack-smoke passed. Evidence: `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/00-summary.md`.
