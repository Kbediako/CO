# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud-Target Executor Extraction

- Date: 2026-03-13
- Owner: Codex (top-level agent)
- Task: `1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction`
- Status: Draft

## Background

`1156` extracted the shared execution lifecycle shell into `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`. The remaining cloud-only execution body still lives inline in `orchestrator/src/cli/orchestrator.ts`.

## Scope

- Extract the cloud-target execution body from `executeCloudPipeline(...)` into one bounded service/helper
- Move cloud-only prompt/config helpers that exist only to support that body with the extraction
- Rewire `orchestrator.ts` to delegate to the extracted cloud-target executor
- Add focused cloud-target regression coverage

## Out of Scope

- Local execution body extraction
- Runtime selection / cloud preflight / fallback changes
- Start/resume lifecycle orchestration changes
- Control-plane / scheduler / TaskManager orchestration
- Telegram / Linear / ControlServer seams

## Proposed Approach

1. Introduce a cloud-target executor service adjacent to `orchestrator.ts`.
2. Move into that service the cloud-only cluster currently inline in `executeCloudPipeline(...)`:
   - target-stage resolution
   - non-target entry skipping
   - cloud environment-id failure shaping
   - cloud executor/config wiring
   - cloud prompt construction helpers
3. Keep the shared lifecycle shell in `orchestratorExecutionLifecycle.ts` unchanged except for any narrow contract needs required by the cloud executor extraction.
4. Keep `orchestrator.ts` as the authority boundary that selects cloud mode and delegates the bounded body.

## Validation

- Focused `OrchestratorCloudAutoScout` + `CloudPrompt` regressions
- Standard gate bundle before closeout
- Explicit elegance review

## Risks

- Pulling too much into the extracted service could accidentally absorb runtime-selection or broader orchestrator authority
- Pulling too little could produce a prompt-only extraction that leaves the actual cloud mutation surface inline
