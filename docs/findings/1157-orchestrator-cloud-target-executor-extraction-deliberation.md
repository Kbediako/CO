# Findings - 1157 Orchestrator Cloud-Target Executor Extraction

## Decision

Proceed with a bounded cloud-target executor extraction next.

## Why This Seam

- `1156` already moved the genuinely shared local/cloud lifecycle shell into `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`.
- The remaining dense cluster in `orchestrator/src/cli/orchestrator.ts` is now specifically cloud-only: target resolution, non-target skipping, cloud environment-id failure shaping, executor/config wiring, and cloud prompt assembly.
- Existing cloud tests already cluster around this surface (`orchestrator/tests/OrchestratorCloudAutoScout.test.ts`, `orchestrator/tests/CloudPrompt.test.ts`).
- Real Symphony keeps prompt building as its own concern in `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/prompt_builder.ex`, which supports moving the cloud prompt helpers with the cloud executor seam rather than leaving them in the top-level orchestrator.

## Out of Scope

- start/resume bootstrap dedupe
- local MCP/subpipeline execution body
- `performRunLifecycle(...)` control-plane / scheduler / TaskManager orchestration
- docs/status mirror refactors beyond the normal docs-first sync

## Risk

If we choose a prompt-builder-only slice, we leave the real cloud mutation surface inline. If we jump to broader lifecycle orchestration, the lane stops being diff-local and crosses runtime-selection, control-plane, and manager boundaries too early.
