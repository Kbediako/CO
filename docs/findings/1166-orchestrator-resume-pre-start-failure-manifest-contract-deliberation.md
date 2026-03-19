# Findings: 1166 Orchestrator Resume Pre-Start Failure Manifest Contract

## Decision

- Approved as the next implementation lane after `1165`.

## Why This Lane

- `1165` already established that no truthful shared `start()` / `resume()` helper remains.
- Cleanup ownership for startup failure already belongs to `startOrchestratorControlPlaneLifecycle(...)`.
- The remaining exposed bug is the persisted manifest state if `resume()` fails before the lifecycle becomes ready.

## Why This Is Narrow Enough

- The contract is limited to `resume()` after `resetForResume(...)` / forced persist and before successful control-plane readiness.
- It does not reopen shared lifecycle structure, execution routing, or `performRunLifecycle(...)`.
- It can be proven with one public resume regression plus a small manifest-state fix.

## Contract Direction

- The persisted manifest should not remain `in_progress` if pre-start resume fails.
- The manifest should end in `status: failed` with an explicit pre-start failure marker.
- The startup error should still be rethrown.

## Evidence

- `orchestrator/src/cli/orchestrator.ts`
- `orchestrator/src/cli/run/manifest.ts`
- `tests/cli-orchestrator.spec.ts`
- `out/1165-coordinator-symphony-aligned-orchestrator-public-run-entry-bootstrap-and-handoff-reassessment/manual/20260313T223851Z-closeout/14-next-slice-note.md`
