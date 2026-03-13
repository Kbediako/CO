# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Execution-Routing Shell Extraction

- Date: 2026-03-13
- Owner: Codex (top-level agent)
- Task: `1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction`
- Status: Draft

## Background

`1156` extracted the shared execution lifecycle shell into `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`. `1157` extracted the cloud-only target executor into `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`. `1158` extracted the local stage-loop executor into `orchestrator/src/cli/services/orchestratorLocalPipelineExecutor.ts`. The remaining dense inline seam in `orchestrator/src/cli/orchestrator.ts` is now the routing/policy layer that selects mode, resolves runtime, performs cloud preflight/fallback, and dispatches into those extracted executors.

## Scope

- Extract the remaining execution-routing shell from `orchestrator.ts` into one bounded service/helper
- Move with that extraction:
  - mode-policy helpers (`determineMode(...)`, `requiresCloudExecution(...)`)
  - runtime selection and effective env merge
  - cloud preflight / fallback shaping
  - dispatch into the extracted local/cloud execution services
- Rewire `orchestrator.ts` to delegate to the extracted routing shell
- Add focused routing regression coverage

## Out of Scope

- Reopening the extracted local or cloud executor bodies
- Changing runtime selection semantics or fallback outcomes
- Start/resume lifecycle orchestration changes
- Control-plane / scheduler / TaskManager orchestration
- Telegram / Linear / ControlServer seams

## Proposed Approach

1. Introduce an execution-routing service adjacent to `orchestrator.ts` under `orchestrator/src/cli/services/`, likely `orchestratorExecutionRouter.ts`.
2. Move into that service the routing/policy cluster currently inline in `orchestrator.ts`:
   - `determineMode(...)`
   - `requiresCloudExecution(...)`
   - the main `executePipeline(...)` routing shell above the already-extracted local/cloud execution bodies
3. Keep `orchestrator.ts` as the public class boundary that owns lifecycle entrypoints and passes the required callbacks/dependencies into the routing service.
4. Keep the extracted local/cloud execution services unchanged except for any narrow contract adjustments required to accept the routing-service delegate shape.

## Validation

- Focused `ExecutionModeResolution` + `OrchestratorCloudAutoScout` + `OrchestratorSubpipelineFailure` regressions
- Standard gate bundle before closeout
- Explicit elegance review

## Risks

- Pulling too much into the extracted service could accidentally absorb public lifecycle authority or broader manager orchestration.
- Pulling too little could yield a cosmetic helper split that leaves the actual execution-routing branch inline in `orchestrator.ts`.
