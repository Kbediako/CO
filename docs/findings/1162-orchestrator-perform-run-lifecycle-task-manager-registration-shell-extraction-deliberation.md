# Findings: 1162 Orchestrator Perform-Run-Lifecycle Task-Manager Registration Shell Extraction

## Decision

- Approved as the next bounded Symphony-aligned seam after `1161`.

## Why This Seam

- After `1161`, the remaining dense inline assembly in `performRunLifecycle(...)` is the TaskManager-registration harness:
  - `createOrchestratorRunLifecycleExecutionRegistration(...)`
  - `createTaskManager(...)`
  - `attachPlanTargetTracker(...)`
- This is the smallest remaining chunk that still owns meaningful assembly logic rather than merely wrapping already-extracted services.

## Why Not Guard/Planning Next

- The following block is mostly straight sequencing of already-extracted services:
  - `this.controlPlane.guard(...)`
  - `this.scheduler.createPlanForRun(...)`
- Extracting that next would be more wrapper churn than real lifecycle thinning.

## Boundaries

### In scope

- execution-registration composition
- `TaskManager` creation
- `plan_target_id` tracker attachment

### Out of scope

- privacy reset
- control-plane guard execution
- scheduler plan creation
- `manager.execute(...)` try/catch and `runError(...)`
- completion handling extracted in `1161`
- public `start()` / `resume()` lifecycle entrypoints

## Evidence

- `orchestrator/src/cli/orchestrator.ts`
- `out/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/manual/20260313T163957Z-closeout/14-next-slice-note.md`
- bounded delegated scout result captured in the parent run notes
