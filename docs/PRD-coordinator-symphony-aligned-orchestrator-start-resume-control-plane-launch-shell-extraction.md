# PRD: Coordinator Symphony-Aligned Orchestrator Start-Resume Control-Plane Launch Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction`

## Background

After `1167`, the next truthful public-entry shell in `CodexOrchestrator` was the duplicated control-plane launch lifecycle inside `start()` and `resume()`:

- create or reuse a `RunEventEmitter`
- boot `startOrchestratorControlPlaneLifecycle(...)`
- create `runEvents`
- call `performRunLifecycle(...)`
- close the launched lifecycle in `finally`

That duplication is now extracted in the working tree through `withControlPlaneLifecycle(...)`. The only meaningful divergence remains `resume()`'s pre-start failure handling, which marks the manifest failed with `resume-pre-start-failed`, persists that state, and rethrows if control-plane startup fails before the lifecycle is live.

## Goal

Carry the extracted shared `start()` / `resume()` control-plane launch shell through the lane truthfully: keep the adjacent `withControlPlaneLifecycle(...)` helper, preserve the existing public-entry preparation logic, and retain the resume-only pre-start failure contract through validation and closeout.

## Non-Goals

- Changing start/resume preparation, manifest mutation, or token validation behavior
- Changing `performRunLifecycle(...)` ownership or execution semantics
- Reopening already extracted execution-routing or execution-lifecycle seams
- Altering control-plane startup behavior, cleanup ordering, or public CLI contracts

## Success Criteria

- `start()` and `resume()` both delegate the common launch shell through one shared helper.
- `resume()` still persists `status = failed` and `status_detail = resume-pre-start-failed` when control-plane startup fails before readiness.
- Cleanup ordering remains unchanged on success and failure paths.
- Focused regressions cover start success, resume success, resume pre-start failure persistence, and cleanup ordering.
