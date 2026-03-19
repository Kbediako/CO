# Findings: 1163 Orchestrator Perform-Run-Lifecycle Guard-and-Planning Shell Extraction

## Decision

- Approved as the next bounded Symphony-aligned seam after `1162`.

## Why This Seam

- After `1162`, the remaining dense inline lifecycle assembly in `performRunLifecycle(...)` is the ordered post-privacy-reset pair:
  - `this.controlPlane.guard(...)`
  - `this.scheduler.createPlanForRun(...)`
- The task-manager registration helper now cleanly bounds the preceding seam, and completion already has its own extracted helper from `1161`.
- This is now the smallest remaining cluster that removes real lifecycle density instead of just hiding one call behind another thin wrapper.

## Why Not Execution/Error Next

- The following `manager.execute(...)` plus `runError(...)` block is thinner and mostly expresses direct lifecycle authority rather than assembly logic.
- Extracting it next would reduce less inline density while obscuring the main run handoff.

## Boundaries

### In scope

- guard execution
- scheduler planning
- return of `{ controlPlaneResult, schedulerPlan }`

### Out of scope

- explicit privacy reset
- task-manager registration from `1162`
- `manager.execute(...)` / `runError(...)`
- completion handling from `1161`
- public `start()` / `resume()` entrypoints

## Evidence

- `orchestrator/src/cli/orchestrator.ts`
- `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/14-next-slice-note.md`
- delegated scout result recorded in the parent run
