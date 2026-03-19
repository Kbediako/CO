# Findings: 1164 Orchestrator Perform-Run-Lifecycle Execution-and-Run-Error Shell Extraction

## Decision

- Approved as the next bounded Symphony-aligned seam after `1163`.

## Why This Seam

- After `1163`, the only multi-line lifecycle block still inline in `performRunLifecycle(...)` is:
  - `manager.execute(taskContext)`
  - `context.runEvents?.runError(...)`
  - the catch / rethrow boundary
- `1161`, `1162`, and `1163` already isolated completion, TaskManager registration, and guard-and-planning, so this is now the last truthful lifecycle cluster before the method becomes a thin coordinator.
- The seam is marginal, but still worth taking because it removes the final ordered execution / error shell without recombining earlier boundaries.

## Why Not Broader Reassessment Yet

- A broader reassessment becomes the right next move only after this final inline lifecycle block is gone.
- Stopping now would leave the remaining execute / error boundary inline even though it still has a coherent ordered contract and focused regression surface.

## Boundaries

### In scope

- `manager.execute(taskContext)`
- `context.runEvents?.runError(...)`
- rethrow of the original error

### Out of scope

- explicit privacy reset
- TaskManager registration from `1162`
- guard-and-planning from `1163`
- completion handling from `1161`
- public `start()` / `resume()` entrypoints

## Evidence

- `orchestrator/src/cli/orchestrator.ts`
- `out/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction/manual/20260313T181131Z-closeout/14-next-slice-note.md`
- delegated scout result recorded in the parent run
