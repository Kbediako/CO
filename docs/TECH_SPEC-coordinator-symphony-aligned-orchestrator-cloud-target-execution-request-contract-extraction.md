# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Cloud-Target Execution Request Contract Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction`
- Status: Draft

## Background

`1157` extracted the cloud-target executor into `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`. `1172` then aligned the adjacent shared cloud-preflight request contract across router and doctor. The remaining dense cloud executor cluster is now the service-local request assembly that directly precedes `CodexCloudTaskExecutor.execute(...)`.

## Scope

- extract the cloud-target execution request contract into one bounded helper inside `orchestratorCloudTargetExecutor.ts`
- preserve caller-owned lifecycle behavior in `executeOrchestratorCloudTarget(...)`
- add focused request-shaping coverage where the extracted contract becomes directly observable

## Out of Scope

- cloud preflight or fallback policy changes
- `resolveCloudEnvironmentId(...)` precedence changes
- `CodexCloudTaskExecutor.execute(...)` behavior or argv changes
- manifest persistence, `onUpdate`, run-event emission, or final result shaping changes
- broader cloud executor lifecycle refactors

## Proposed Approach

1. Introduce one bounded request-contract helper inside `orchestratorCloudTargetExecutor.ts` for the object passed into `CodexCloudTaskExecutor.execute(...)`.
2. Move into that helper only the request-shaping cluster:
   - cloud prompt construction
   - poll/timeout/attempt/status-retry parsing
   - branch and feature-toggle parsing
   - `codexBin` resolution
   - non-interactive cloud env shaping
   - `repoRoot` / `runDir` / `environmentId` wiring
3. Keep `onUpdate`, manifest persistence, run-event emission, target resolution, and final status shaping in `executeOrchestratorCloudTarget(...)`.
4. Extend focused tests around the extracted request contract and existing cloud executor call sites without reopening executor internals.

## Validation

- focused cloud-target request and auto-scout regressions
- standard docs-first guard bundle
- bounded standalone review on the request-contract seam

## Risks

- pulling too much into the new helper could accidentally absorb lifecycle behavior that still belongs to the executor service
- pulling too little could leave the actual request contract inline and turn the lane into a naming-only shuffle
