# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Execution-Registration Shell Extraction

- Date: 2026-03-13
- Owner: Codex (top-level agent)
- Task: `1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction`
- Status: Draft

## Background

`1156` extracted the shared execution lifecycle shell, `1157` extracted the cloud-target executor, `1158` extracted the local pipeline executor, and `1159` extracted the execution-routing shell into `orchestratorExecutionRouter.ts`. The next dense inline cluster in `orchestrator/src/cli/orchestrator.ts` is the execution-registration logic inside `performRunLifecycle(...)`: dedupe bookkeeping, routed executor closure assembly, and TaskManager result wiring.

## Scope

- Extract the execution-registration shell from `performRunLifecycle(...)` into one bounded helper/service
- Move with that extraction:
  - `executingByKey` dedupe-map ownership
  - the `executePipeline` closure that adapts `PipelineExecutor` inputs into `this.executePipeline(...)`
  - `latestPipelineResult` / `getResult` wiring into `TaskManager`
- Rewire `performRunLifecycle(...)` to delegate that shell without changing lifecycle authority
- Add focused regression coverage for the extracted seam

## Out of Scope

- Execution-routing policy changes
- Control-plane guard execution
- Scheduler planning/finalization
- Run-summary projection/writeback
- Public `start()` / `resume()` entrypoints
- Telegram / Linear / ControlServer seams

## Proposed Approach

1. Introduce a bounded execution-registration helper adjacent to `orchestrator.ts`, likely under `orchestrator/src/cli/services/`.
2. Move the `performRunLifecycle(...)` execution-registration cluster into that helper:
   - dedupe map
   - routed `executePipeline` closure
   - `latestPipelineResult` / `getResult`
   - `TaskManager` construction inputs that belong to that cluster
3. Keep `performRunLifecycle(...)` as the owner of control-plane, scheduler, run-summary persistence, and final lifecycle authority.
4. Add focused regressions that pin dedupe behavior, callback forwarding into the router, and stable result/manager wiring.

## Validation

- Focused orchestrator lifecycle/registration regressions
- Standard deterministic gate bundle before closeout
- Explicit elegance review

## Risks

- Pulling too much could reopen control-plane or scheduler authority seams that are not part of this extraction.
- Pulling too little could leave the real execution-registration shell inline and produce a cosmetic helper split.
