# PRD: Coordinator Symphony-Aligned Orchestrator Resume Pre-Start Failure Manifest Contract

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract`

## Background

`1165` closed the broader public run-entry reassessment and established that the next truthful implementation seam is not another shared `start()` / `resume()` helper. The highest-risk uncovered lifecycle contract is narrower:

- `resume()` records acceptance and mutates the manifest into an `in_progress` / `resuming` shape
- it force-persists that manifest state
- only then does it try to start the control plane

If control-plane startup fails before the resumed run becomes ready, the persisted manifest can be left falsely looking live even though no resumed execution is actually running.

## Goal

Make the `resume()` pre-start failure contract explicit so a failed restart is persisted as a hard failure instead of a misleading live / in-progress state.

## Non-Goals

- Reopening the broader `start()` / `resume()` reassessment from `1165`
- Moving startup cleanup ownership away from `startOrchestratorControlPlaneLifecycle(...)`
- Shared helper extraction across `start()` and `resume()`
- Changes to execution routing, runtime selection, or `performRunLifecycle(...)`
- New retry/recovery behavior for failed resumes

## Success Criteria

- If `resume()` fails after `resetForResume(...)` / forced persist and before the control plane becomes ready, the persisted manifest ends in a hard failed state.
- The failure contract uses an explicit, stable `status_detail` marker for this pre-start failure boundary.
- The original startup error is still rethrown to the caller.
- A public CLI resume regression proves the persisted manifest no longer remains falsely `in_progress`.
