---
id: 20260409-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d
title: CO: Add run memory controller with role-specific retrieval profiles
status: completed
owner: Codex
created: 2026-04-09
last_review: 2026-05-14
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md
related_action_plan: docs/ACTION_PLAN-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md
related_tasks:
  - tasks/tasks-linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d.md
review_notes:
  - 2026-04-09: Opened from Linear issue `CO-94` in the provider-worker workspace after rechecking live CO team states with the packaged `linear issue-context` helper, moving the issue from `Ready` to `In Progress`, recording the required same-turn `stay_serial` / `single_bounded_change` parallelization decision, and switching the detached workspace at `d47f219ef` onto branch `linear/co-94-run-memory-controller`.
  - 2026-04-09: Current repo truth after `CO-91` is a controller gap, not an anchor gap. `orchestrator/src/cli/run/source0.ts` already owns the shared source-anchor contract, while `scripts/lib/review-prompt-context.ts`, `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/providerLinearChildLaneRunner.ts`, and `orchestrator/src/cli/rlmRunner.ts` still assemble run-memory inputs through separate local seams.
  - 2026-04-09: `planner` for this lane maps to the symbolic RLM planner prompt rather than the deterministic `CommandPlanner`, which still does not consume task memory or manifest state.
  - 2026-04-09: Pre-implementation issue-quality review approves a controller-only slice that reuses `memory.source_0` plus existing prompt-pack metadata, leaving block-memory lifecycle, retrieval indexing/performance, generalized reuse, telemetry, runtime continuity, and distributed-host parity out of scope.
  - 2026-04-09: Audited `docs-review` child stream finished `clean-success` at `.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d-co-94-docs-review/cli/2026-04-09T08-52-01-943Z-a900f3f5/manifest.json`; its output log surfaced one late P2 packet issue where the task checklist `TECH_SPEC` header still pointed at the mirror doc, and that checklist header was corrected to the canonical `tasks/specs/...` path in this packet.
  - 2026-04-09: Implementation now lands one shared `run memory controller` in `orchestrator/src/cli/run/runMemoryController.ts`, migrates reviewer/cloud/provider-worker/child-lane/symbolic planner consumption to that shared selector, and pins role-specific differences with focused controller and consumer tests.
  - 2026-04-09: Manifest-backed standalone review against `/Users/kbediako/Code/CO/.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-09T08-36-05-967Z-014680f3/manifest.json` recorded `review_outcome: failed-boundary` with `termination_boundary.kind: command-intent` / `provenance: validation-runner` at `/Users/kbediako/Code/CO/.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-09T08-36-05-967Z-014680f3/review/telemetry.json`; manual fallback review then found no correctness or regression findings, kept the shared controller seam as the minimal design, and landed one small fail-soft planner manifest-read refinement plus focused reruns. `npm run pack:smoke` also passed; the only remaining handoff blocker is the unrelated broad `npm run test` timeout lane.
  - 2026-04-09: The unrelated repo-wide test-lane blocker is now tracked separately as `CO-132` / `87d23327-3ee6-429c-a25f-8bd9c84cde58`, and `CO-94` moved from `In Progress` to `Blocked` pending that follow-up or an explicit validation waiver.
  - 2026-04-13 UTC: Resumed after the team moved `CO-94` back to `Ready`; rechecked live workflow states, moved the issue to `In Progress`, recorded the required `stay_serial` / `overlapping_scope` parallelization decision, committed the existing controller patch as `6d21d49de`, and merged current `origin/main` so validation can run against the current base instead of the older repo-wide blocker snapshot.
  - 2026-04-13 UTC: Manifest-backed standalone review executed with `FORCE_CODEX_REVIEW=1` against `.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-13T21-16-33-613Z-65c7afb2/manifest.json` and truthfully stopped at `review_outcome: failed-boundary` / `termination_boundary.kind: command-intent` from a validation-suite command attempt. Manual fallback review then found and fixed one provenance bug: prompt-pack `experience_index` now preserves the original manifest `prompt_packs[].experiences` index instead of the filtered candidate index. Focused controller/consumer tests reran green (`7` files / `198` tests), the full validation floor reran green (`npm run test`: `337` files / `3757` tests), and the elegance pass kept the additive controller seam with no extra abstraction.
  - 2026-05-14: CO-530 current-head root-cause reclassification verified live Linear CO-94 remains Done/completed and archived this historical packet out of active docs freshness lifecycle debt; no implementation scope reopened.
---
## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| docs freshness | Completed Linear task spec remained active in freshness/spec guard metadata after issue closeout | remove fallback | CO-530 | May 14 current-head reclassification of recurring historical packet freshness debt for CO-94 | 2026-04-09 | N/A after removal | N/A after removal | Spec frontmatter is terminal and registry row is archived as historical metadata | `node scripts/spec-guard.mjs`; `npm run docs:freshness -- --warn`; `node scripts/docs-freshness-maintain.mjs --check --format json --warn` |


# Technical Specification

## Context
`CO-91` already gave the repo a shared source-anchor substrate: runs materialize `memory.source_0`, consumers can resolve that anchor through `source0.ts`, and child runs can inherit the same anchor semantically. What is still missing is the next layer up. Review, cloud, provider-worker, child-lane, and RLM surfaces still decide memory locally, so there is no one shared `run memory controller` encoding literal `role-specific retrieval`. This issue therefore sits above the source-anchor layer and below any future block-memory or reuse work.

## Requirements
1. One shared controller must select candidate run memory by role instead of per-surface ad hoc assembly.
2. The supported profiles for this slice must include at least `planner`, `reviewer`, `executor`, and `delegate`.
3. The controller must reuse existing manifest-backed sources only: `memory.source_0` and existing prompt-pack experiences.
4. Planner, reviewer, and at least one executor or delegate consumer path must call the controller.
5. The controller output must expose structured refs and provenance rather than only flattened prompt text.
6. The controller must stay backward-compatible when `memory.source_0` or prompt-pack experiences are absent.
7. Tests must cover role-specific profile differences plus consumer adoption.
8. The slice must not broaden into block-memory lifecycle, retrieval indexing/performance, generalized reuse, telemetry, or runtime continuity work.

## Design
- Controller contract:
  - role-aware selector helper in a new `runMemoryController.ts` module under `orchestrator/src/cli/run/`
  - structured `refs[]` output carrying role/profile metadata plus provenance
  - thin prompt-line renderer layered on top of `refs[]` for text surfaces
- Candidate kinds:
  - `source_0` ref sourced from `memory.source_0`
  - prompt-pack experience refs sourced from `prompt_packs[].experiences`
- Initial profiles:
  - `planner`: `source_0` plus bounded prompt-pack experiences selected from the goal/hint text
  - `reviewer`: `source_0` only
  - `executor`: `source_0` plus bounded prompt-pack experiences
  - `delegate`: `source_0` only unless implementation evidence proves a missing delegate candidate
- Consumer scope:
  - planner: symbolic planner prompt in `orchestrator/src/cli/rlm/symbolic.ts`
  - reviewer: `scripts/lib/review-prompt-context.ts`
  - executor/delegate: at minimum `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`; migrate provider-worker and child-lane as long as the controller keeps those diffs thin

## Implementation Surface
- Expected codepaths:
  - new `runMemoryController.ts` module under `orchestrator/src/cli/run/`
  - `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
  - `scripts/lib/review-prompt-context.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `orchestrator/src/cli/rlm/symbolic.ts`
- Expected tests:
  - new controller profile/ref tests
  - updated consumer prompt tests for planner/reviewer/executor or delegate adoption

## Protected Expectations
- Keep literal `run memory controller` and `role-specific retrieval` wording in docs and code.
- Reuse `memory.source_0` instead of redoing anchor storage.
- Emit structured refs and provenance as the controller output.
- Keep the planner consumer scoped to the symbolic RLM planner surface.

## Reject These Wrong Interpretations
- `memory.source_0` alone already satisfies this issue.
- prompt-pack labels already count as role-specific retrieval.
- the issue should add block-memory storage or lifecycle seams.
- the issue should expand into retrieval indexing, generalized reuse, telemetry, or continuity work.
- `planner` means `CommandPlanner`.

## Current Truth
- `CO-91` already landed `memory.source_0`.
- Review, cloud, provider-worker, child-lane, and RLM still own separate memory-selection seams.
- Cloud already has prompt-pack selection heuristics, but they are executor-local and not shared.
- The symbolic planner prompt still has no shared run-memory selection surface.

## Proposed Design
- Add one controller that reads manifest-backed run-memory inputs and emits structured refs by role.
- Keep `source0.ts` as the lower-level source-anchor helper and move role selection above it.
- Reuse the current prompt-pack experience metadata as the only additional candidate source for this slice.
- Keep consumer formatting derived and thin so the controller, not each surface, is the selection point.

## Non-Goals
- New manifest schema/storage changes unless implementation proves a missing controller artifact.
- Block-memory lifecycle seams.
- Retrieval indexing/performance tuning.
- Generalized experience reuse.
- Provider-worker telemetry or runtime continuity work.

## Parity / Alignment Matrix
- Current truth:
  - one shared anchor exists, but selection is still local to each consumer
  - cloud owns prompt-pack experience selection separately
  - planner memory selection is still missing as a shared seam
- Reference truth:
  - `source0.ts` already exposes stable provenance for shared anchors
  - manifest prompt packs already expose bounded experience metadata without new persistence work
- Target truth / intended delta:
  - controller profiles select ordered run-memory refs for planner/reviewer/executor/delegate
  - planner, reviewer, and one executor/delegate path consume that controller
  - structured refs/provenance become the shared output contract, with prompt text derived from it
- Explicitly out-of-scope differences:
  - block-memory storage/lifecycle
  - retrieval indexing/performance
  - generalized reuse policy
  - runtime continuity or telemetry

## Not Done If
- each role still assembles memory ad hoc
- role-specific retrieval exists only in docs
- controller outputs only prompt text and no structured refs/provenance
- the lane broadens into adjacent memory or runtime work

## Validation Plan
- `MCP_RUNNER_TASK_ID=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-94-docs-review --format json`
- focused tests for controller selection plus planner/reviewer/executor or delegate wiring
- `MCP_RUNNER_TASK_ID=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d node scripts/delegation-guard.mjs`
- `MCP_RUNNER_TASK_ID=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d node scripts/spec-guard.mjs --dry-run`
- `MCP_RUNNER_TASK_ID=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d npm run build`
- `MCP_RUNNER_TASK_ID=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d npm run lint`
- `MCP_RUNNER_TASK_ID=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d npm run test`
- `MCP_RUNNER_TASK_ID=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d npm run docs:check`
- `MCP_RUNNER_TASK_ID=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d npm run docs:freshness`
- `MCP_RUNNER_TASK_ID=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d node scripts/diff-budget.mjs`
- `MCP_RUNNER_TASK_ID=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d TASK=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d NOTES="Goal: ... | Summary: ... | Risks: ..." FORCE_CODEX_REVIEW=1 npm run review -- --manifest <manifest-path>`
- `MCP_RUNNER_TASK_ID=linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d npm run pack:smoke`

## Approvals
- Reviewer: Pre-implementation local self-review approved; audited `docs-review` child stream recorded at `.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d-co-94-docs-review/cli/2026-04-09T08-52-01-943Z-a900f3f5/manifest.json` (`clean-success` telemetry, plus one late surfaced checklist-header P2 fixed in the current packet)
- Date: 2026-04-09
