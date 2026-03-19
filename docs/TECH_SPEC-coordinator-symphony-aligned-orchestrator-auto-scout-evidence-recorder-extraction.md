# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Auto-Scout Evidence Recorder Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction`
- Status: Draft

## Background

The remaining truthful extraction seam after `1166` is the class-local `runAutoScout(...)` helper in `orchestrator/src/cli/orchestrator.ts`. It is cohesive, class-state-free, and already bounded by the existing router contract that consumes a normalized auto-scout outcome. That makes it a real service/helper extraction candidate rather than another synthetic controller split.

## Scope

- Extract the `runAutoScout(...)` cluster into one adjacent helper/service
- Keep merged env resolution, timeout handling, evidence payload write, and normalized outcome shaping together
- Preserve the existing callback/contract consumed by `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`
- Add focused helper tests plus one retained orchestration integration

## Out of Scope

- `start()` / `resume()` lifecycle behavior
- Public orchestrator entrypoints
- Execution-mode routing or runtime selection changes
- Auto-scout policy changes
- Artifact schema changes for `auto-scout.json`

## Proposed Approach

1. Move the current `runAutoScout(...)` body into one adjacent helper/service, tentatively `recordOrchestratorAutoScoutEvidence`, keeping it stateless and parameter-driven.
2. Preserve the current router-facing return contract: normalized `recorded`, `timeout`, and `error` results.
3. Keep `CodexOrchestrator` responsible only for passing the current inputs into the extracted helper.
4. Add focused tests for the extracted seam and retain one orchestration integration proving `auto-scout.json` still records on the cloud/non-trivial path.

## Validation

- Focused helper test for `recorded`, `timeout`, and `error`
- `orchestrator/tests/OrchestratorCloudAutoScout.test.ts`
- `orchestrator/tests/OrchestratorExecutionRouteDecisionShell.test.ts` if the router callback contract surface changes
- Standard deterministic gate bundle on the final tree

## Risks

- Pulling routing or manifest ownership into the helper would over-expand the seam.
- Changing the normalized outcome shape would create a router contract regression.
- Splitting timeout handling away from evidence writing would make the seam less coherent, not more.
