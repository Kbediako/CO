# PRD - CO: Add run memory controller with role-specific retrieval profiles

## Added by Bootstrap 2026-04-09

## Traceability
- Linear issue: `CO-94` / `ce6f26d0-029a-40d9-8ffe-289cd40cde8d`
- Linear URL: https://linear.app/asabeko/issue/CO-94/add-run-memory-controller-with-role-specific-retrieval-profiles
- Source issue: `CO-89` / `70e83230-4f52-4850-b494-41fd0ec32f13`
- Adjacent prerequisite slice: `CO-91` / `5f850884-855f-41ed-b593-6c2dee5815d2`

## Summary
- Problem Statement: `CO-91` already landed the additive `memory.source_0` run contract plus a shared source-anchor helper, but the repo still has no shared `run memory controller`. Review, cloud, provider-worker, and child-lane prompts still assemble memory locally, cloud still chooses prompt-pack experiences through its own heuristic, `rlmRunner.ts` still resolves `memory.source_0` directly, and the symbolic RLM planner still has no role-aware memory-selection seam. The current tree therefore has one shared anchor but not one shared controller that chooses candidate memory per role.
- Desired Outcome: add one shared `run memory controller` with literal `role-specific retrieval` profiles so planner, reviewer, and at least one executor or delegate path consume the same selection contract, emitting structured refs plus provenance instead of each surface assembling flattened memory selections independently.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): land the bounded sibling memory slice that sits above `memory.source_0` and below any future block-memory or reuse work. The controller should become the central selection point, preserve literal `run memory controller` and `role-specific retrieval` wording, and choose memory differently by role without broadening into telemetry, runtime continuity, or generalized retrieval-policy work.
- Success criteria / acceptance:
  - one shared `run memory controller` exists for selecting candidate memory per role
  - at least planner, reviewer, and one executor or delegate path consume it
  - controller output emits structured refs and provenance instead of flattened text-only selections
  - tests cover role-specific differences
- Constraints / non-goals:
  - reuse the existing `memory.source_0` contract instead of re-adding source-anchor work
  - do not duplicate block-memory lifecycle work, retrieval indexing/performance work, or generalized experience-reuse work
  - do not broaden into `CO-82`, `CO-83`, `CO-89`, or `CO-90`
  - keep the deterministic `CommandPlanner` out of scope; the `planner` role for this lane is the symbolic RLM planner surface

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `run memory controller`
  - `role-specific retrieval`
  - `planner`
  - `reviewer`
  - `executor`
  - `delegate`
  - `structured refs`
  - `provenance`
- Protected terms / exact artifact and surface names:
  - `memory.source_0`
  - `orchestrator/src/cli/run/source0.ts`
  - `scripts/lib/review-prompt-context.ts`
  - `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `orchestrator/src/cli/rlm/symbolic.ts`
- Nearby wrong interpretations to reject:
  - `memory.source_0` alone already gives us the controller
  - prompt-pack section names already equal role-specific retrieval
  - this lane should reopen block-memory storage, retrieval indexing, or experience reuse
  - this lane should widen into provider telemetry, runtime continuity, or distributed-host parity
  - `planner` here means the deterministic `CommandPlanner` stage planner

## Parity / Alignment Matrix
- Current truth:
  - `CO-91` already provides a shared `memory.source_0` descriptor and helper-backed anchor reads
  - review, provider-worker, and child-lane surfaces still append source-0 prompt lines locally
  - cloud still owns prompt-pack experience selection separately from source-0 selection
  - `rlmRunner.ts` still reads `memory.source_0` directly and the symbolic planner prompt still lacks a role-aware run-memory selection seam
- Reference truth:
  - `orchestrator/src/cli/run/source0.ts` already exposes bounded pointer/provenance metadata
  - the manifest already carries prompt-pack metadata that can be selected without inventing new storage
- Target truth / intended delta:
  - one shared controller selects candidate run memory refs by profile (`planner`, `reviewer`, `executor`, `delegate`)
  - planner, reviewer, and at least one executor/delegate surface call that controller instead of assembling memory ad hoc
  - controller selections stay structured and provenance-rich, while prompt rendering remains a thin derived step
- Explicitly out-of-scope differences:
  - new block-memory persistence or lifecycle management
  - retrieval indexing/performance tuning
  - generalized experience reuse beyond existing prompt-pack metadata
  - telemetry, control-host continuity, or distributed worker-host parity work

## Not Done If
- each role still assembles memory ad hoc in its own surface
- `role-specific retrieval` exists only in docs instead of one controller surface
- controller output is still just flattened text with no structured refs or provenance
- the lane broadens into telemetry, continuity, block-memory storage, or reuse-policy work

## Goals
- Add one repo-owned `run memory controller` above the existing source-anchor seam.
- Encode role-specific retrieval profiles for at least `planner`, `reviewer`, `executor`, and `delegate`.
- Keep the selected memory refs structured and provenance-rich.
- Wire the smallest set of consumers that proves the shared contract is real.

## Non-Goals
- Rebuilding `memory.source_0`.
- Adding block-memory storage or lifecycle seams.
- Expanding retrieval indexing or scoring optimization.
- Reopening provider telemetry, resident app-server continuity, or distributed host parity work.

## Stakeholders
- Product: autonomy-stream owners and operators who need one truthful run-memory selection seam
- Engineering: run-contract, review-wrapper, cloud, provider-worker, child-lane, and RLM maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - the controller returns structured candidate refs with provenance for each supported role
  - role profiles differ in a tested, intentional way
  - planner, reviewer, and one executor/delegate consumer share the same controller entrypoint
- Guardrails / Error Budgets:
  - keep the controller additive and thin over existing `source_0` plus prompt-pack metadata
  - preserve backward compatibility when `memory.source_0` or prompt-pack experiences are absent
  - do not broaden the contract into new storage or unrelated worker orchestration

## User Experience
- Personas:
  - symbolic planner selecting bounded run memory for an iterative planning prompt
  - reviewer receiving the same shared run-memory contract without executor-only hint noise
  - executor or delegate surface reusing the same selection seam instead of bespoke assembly
- User Journeys:
  - a symbolic planner prompt includes a controller-selected memory set for the `planner` profile
  - a review prompt reads the `reviewer` profile from the same controller entrypoint
  - an executor or delegate path reads the same controller output and preserves traceable refs/provenance

## Technical Considerations
- Architectural Notes:
  - add the controller as a new helper above `source0.ts`, not as a rewrite of `source0.ts`
  - reuse manifest-carried `prompt_packs` as the only non-`source_0` candidate source in this slice
  - keep consumer formatting thin and derived from the shared selection output
- Dependencies / Integrations:
  - `orchestrator/src/cli/run/source0.ts`
  - `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
  - `scripts/lib/review-prompt-context.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `orchestrator/src/cli/rlm/symbolic.ts`

## Open Questions
- None at bootstrap. The smallest truthful candidate set is `source_0` plus existing prompt-pack experiences; future block-memory candidates stay outside this lane.

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: Pre-implementation local read-only review approved; audited `docs-review` child stream pending
- Design: N/A
