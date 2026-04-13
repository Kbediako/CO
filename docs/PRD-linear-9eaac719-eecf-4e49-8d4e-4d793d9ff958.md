# PRD - CO: Make planner memory selection real instead of leaving TaskContext as dead input

## Added by Bootstrap 2026-04-09

## Traceability
- Linear issue: `CO-92` / `9eaac719-eecf-4e49-8d4e-4d793d9ff958`
- Linear URL: https://linear.app/asabeko/issue/CO-92/make-planner-memory-selection-real-instead-of-leaving-taskcontext-as
- Source issue: `CO-89` / `70e83230-4f52-4850-b494-41fd0ec32f13`
- Adjacent prerequisite slice: `CO-91` / `5f850884-855f-41ed-b593-6c2dee5815d2`

## Summary
- Problem Statement: the repo now has a shared `source 0` contract plus downstream prompt surfaces that can read memory-like context, but the earliest orchestration seam is still dead. `createTaskContext(...)` only carries task identity, `TaskContext` exposes no planner-meaningful memory shape, and `CommandPlanner.plan(...)` still does `void task`, so the planner cannot make a real fixed-model memory choice before later prompt builders run. `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts` therefore still has to select prompt-pack experience context independently after planning instead of consuming a planner-owned memory decision.
- Desired Outcome: make `TaskContext` materially memory-bearing for the planner, let `CommandPlanner` emit selected memory refs as part of the plan, and have the downstream cloud prompt path consume that selection while remaining backward-compatible when no planner memory is present.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): land the bounded planner-consumption seam for fixed-model memory. The planner should receive a truthful memory-bearing input, select from literal `source 0` plus bounded memory refs before prompt building, and stay additive rather than turning into a broad planner or controller rewrite.
- Success criteria / acceptance:
  - planner receives a meaningful memory-bearing input rather than a dead `TaskContext`
  - the new seam can consume `source 0` and selected memory refs before downstream prompt builders run
  - tests prove planner behavior differs when memory input is present vs absent
  - the change stays additive and bounded
- Constraints / non-goals:
  - this is the planner-consumption seam for fixed-model memory, not a broad planner rewrite
  - do not introduce the final run-memory controller or scoring logic here
  - do not absorb telemetry, resident-session continuity, or distributed worker-host parity work from `CO-82`, `CO-83`, `CO-89`, or `CO-90`
  - do not reopen `0303` as the umbrella owner

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `TaskContext`
  - dead input
  - planner memory selection
  - fixed-model memory
  - `source 0`
  - selected memory refs
  - additive and bounded
- Protected terms / exact artifact and surface names:
  - `orchestrator/src/types.ts`
  - `orchestrator/src/cli/services/runPreparation.ts`
  - `orchestrator/src/cli/adapters/CommandPlanner.ts`
  - `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
  - `TaskContext`
  - `CommandPlanner`
  - `source 0`
  - `CO-91`
- Nearby wrong interpretations to reject:
  - `TaskContext` already makes planner memory real because the type exists
  - later controller or prompt-builder work can compensate for a dead planner seam
  - this issue should broaden into telemetry or runtime continuity work
  - this issue should rewrite the planner wholesale
  - the planner seam is done if it only adds comments or dead metadata

## Parity / Alignment Matrix
- Current truth:
  - `TaskContext` only carries task identity plus loose metadata and has no explicit planner-memory contract
  - `createTaskContext(...)` only loads `id`, `slug`, and `title` into the task object
  - `CommandPlanner.plan(...)` ignores the task input entirely
  - the cloud prompt builder still performs its own prompt-pack experience selection after planning
- Reference truth:
  - `CO-91` already established the shared `source 0` contract and helper-backed read path
  - the cloud prompt builder already has a bounded fixed-model selection problem it solves heuristically today
- Target truth / intended delta:
  - task preparation builds a bounded planner-memory view that advertises available memory refs, including literal `source 0`
  - `CommandPlanner` consumes that view and emits selected memory refs in plan metadata before prompt building
  - the cloud prompt path prefers planner-selected refs and only falls back to local heuristics when the planner selection is absent
- Explicitly out-of-scope differences:
  - run-memory controller design
  - retrieval or scoring policy
  - non-cloud consumer rewrites beyond the smallest proof of downstream consumption
  - telemetry, continuity, or worker-host parity work

## Not Done If
- `TaskContext` is still effectively ignored by the planner path.
- planner memory selection exists only as comments, dead wiring, or doc claims.
- the seam cannot consume `source 0` and selected memory refs before planning.
- the issue broadens into unrelated telemetry or runtime continuity work.

## Goals
- Add a bounded planner-memory shape to `TaskContext`.
- Build that planner-memory input during run preparation before `planner.plan(...)`.
- Make `CommandPlanner` emit real selected memory refs into plan metadata.
- Thread the selected refs into at least one downstream prompt builder so the selection is actually consumed.

## Non-Goals
- Final run-memory controller or scoring logic.
- Broad planner redesign.
- Telemetry or status projection work.
- Resident-session continuity work.
- Distributed worker-host parity work.
- Reopening `0303`.

## Stakeholders
- Product: operators and autonomy-lane owners who need the earliest planner seam to reflect bounded memory truthfully
- Engineering: orchestrator runtime, planner, and prompt-builder maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - `TaskContext` exposes planner-memory data for fixed-model selection
  - `CommandPlanner` output changes measurably when planner memory is present
  - downstream cloud prompt building consumes planner-selected refs when available
- Guardrails / Error Budgets:
  - keep the change additive and backward-compatible when planner memory is absent
  - do not move prompt content or controller logic wholesale into the planner
  - preserve the existing `source 0` contract from `CO-91`

## User Experience
- Personas:
  - operator or lane owner who needs early orchestration to make a bounded memory choice
  - downstream cloud execution flow that should consume a planner-owned memory choice rather than re-deriving it
- User Journeys:
  - run preparation derives planner-available memory refs from the repo's bounded instruction and `source 0` surfaces
  - the planner emits selected refs alongside the chosen stage
  - cloud prompt construction uses the selected refs when present and degrades safely otherwise

## Technical Considerations
- Architectural Notes:
  - keep planner memory small and reference-oriented rather than embedding prompt content into `TaskContext`
  - use stable ref ids such as `source_0` and prompt-pack refs so prompt builders can resolve them later against the manifest
  - reuse or generalize existing cloud prompt-pack selection heuristics instead of inventing a second competing selector
- Dependencies / Integrations:
  - `orchestrator/src/types.ts`
  - `orchestrator/src/cli/services/runPreparation.ts`
  - `orchestrator/src/cli/adapters/CommandPlanner.ts`
  - `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
  - `packages/orchestrator/src/instructions/loader.ts`
  - `packages/orchestrator/src/instructions/promptPacks.ts`

## Open Questions
- Should the first bounded downstream consumer remain just the cloud prompt path, or is there a second same-shape consumer worth adopting in a follow-up slice after the planner contract is proven?
- Is the smallest truthful planner-memory ref contract `source_0` plus prompt-pack ids, or do later slices need richer per-ref provenance metadata?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: Pending audited docs-review child-stream after packet creation
- Design: N/A
