# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Local-Pipeline Executor Extraction

- Date: 2026-03-13
- Owner: Codex (top-level agent)
- Task: `1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction`
- Status: Draft

## Background

`1156` extracted the shared execution lifecycle shell into `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`, and `1157` extracted the cloud target executor into `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`. The remaining large inline executor body in `orchestrator/src/cli/orchestrator.ts` is now the local MCP/subpipeline stage loop.

## Scope

- Extract the local pipeline execution body from the non-cloud branch of `executePipeline(...)` into one bounded service/helper
- Move the local-only stage loop behavior with that extraction:
  - already-completed skip handling
  - command-stage execution via `runCommandStage(...)`
  - subpipeline recursion and `child_runs` shaping
- Rewire `orchestrator.ts` to delegate to the extracted local pipeline executor
- Add focused local orchestration regression coverage

## Out of Scope

- Cloud target execution changes
- Runtime selection / cloud preflight / fallback changes
- Start/resume lifecycle orchestration changes
- Control-plane / scheduler / TaskManager orchestration
- Telegram / Linear / ControlServer seams

## Proposed Approach

1. Introduce a local pipeline executor service adjacent to `orchestrator.ts` under `orchestrator/src/cli/services/`, alongside the existing `orchestratorCloudTargetExecutor.ts`.
2. Move into that service the local execution cluster currently inline in `executePipeline(...)`:
   - per-stage loop over `pipeline.stages`
   - already-succeeded / already-skipped entry handling
   - command-stage execution and note shaping
   - subpipeline execution and `child_runs` shaping
   - local stage failure shaping that belongs to the executor body
3. Keep the shared lifecycle shell in `orchestratorExecutionLifecycle.ts` unchanged except for any narrow contract needs required by the local executor extraction.
4. Keep `orchestrator.ts` as the authority boundary that selects runtime/mode, handles cloud preflight/fallback, and delegates the bounded local or cloud executor body.

## Validation

- Focused `OrchestratorSubpipelineFailure` + `cli-orchestrator` regressions
- One new focused regression proving already-succeeded / already-skipped entries are not rerun and still append notes
- Standard gate bundle before closeout
- Explicit elegance review

## Risks

- Pulling too much into the extracted service could accidentally absorb runtime selection, cloud preflight/fallback, or broader lifecycle orchestration authority
- Pulling too little could leave the stage loop split awkwardly across `orchestrator.ts` and the new service, reducing the value of the extraction
