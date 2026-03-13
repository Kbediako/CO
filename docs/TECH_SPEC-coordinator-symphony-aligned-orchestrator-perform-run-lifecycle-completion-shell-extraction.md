# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Completion Shell Extraction

- Date: 2026-03-13
- Owner: Codex (top-level agent)
- Task: `1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction`
- Status: Draft

## Background

`1159` extracted the execution-routing shell and `1160` extracted the execution-registration seam from `performRunLifecycle(...)`. The next dense inline cluster in `orchestrator/src/cli/orchestrator.ts` begins immediately after `manager.execute(taskContext)` succeeds: scheduler finalization, run-summary projection/apply steps, persistence, completion event emission, and the final `{ manifest, runSummary }` assembly.

## Scope

- Extract the post-execution completion shell from `performRunLifecycle(...)` into one bounded helper/service
- Move with that extraction:
  - `this.scheduler.finalizePlan(...)`
  - `this.scheduler.applySchedulerToRunSummary(...)`
  - `applyRuntimeToRunSummary(...)`
  - `applyHandlesToRunSummary(...)`
  - `applyPrivacyToRunSummary(...)`
  - `applyCloudExecutionToRunSummary(...)`
  - `applyCloudFallbackToRunSummary(...)`
  - `applyUsageKpiToRunSummary(...)`
  - `this.controlPlane.applyControlPlaneToRunSummary(...)`
  - `persistRunSummary(...)`
  - `context.runEvents?.runCompleted(...)`
  - the final `{ manifest, runSummary }` return assembly
- Rewire `performRunLifecycle(...)` to delegate that shell without changing surrounding lifecycle authority
- Add focused regression coverage for the extracted seam

## Out of Scope

- Execution-routing or execution-registration changes
- Control-plane guard execution
- Scheduler plan creation
- The `manager.execute(...)` error path and `runError(...)` emission
- Public `start()` / `resume()` entrypoints
- Telegram / Linear / ControlServer seams

## Proposed Approach

1. Introduce one bounded completion helper adjacent to `orchestrator.ts`, likely under `orchestrator/src/cli/services/`.
2. Move the post-execution completion block into that helper while keeping the successful execution result as its input.
3. Keep `performRunLifecycle(...)` as the owner of privacy reset, control-plane guard execution, scheduler plan creation, execution registration, and the `manager.execute(...)` try/catch boundary.
4. Add focused regressions that pin scheduler-finalize/apply ordering, run-summary persistence continuity, and completion event payload continuity.

## Validation

- Focused orchestrator completion regressions
- Standard deterministic gate bundle before closeout
- Explicit elegance review

## Risks

- Pulling too much could reopen upstream lifecycle authority seams that are not part of this extraction.
- Pulling too little could leave the actual completion cluster inline and turn the helper into a cosmetic move.
