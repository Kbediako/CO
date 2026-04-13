# ACTION_PLAN - CO: Add run memory controller with role-specific retrieval profiles

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: land a bounded `run memory controller` layer that centralizes role-specific retrieval above the already-landed `source_0` anchor.
- Scope:
  - register the `CO-94` docs packet, mirrors, and workpad source
  - run audited `docs-review` before implementation
  - add the shared controller and role profiles
  - wire planner, reviewer, and one executor/delegate surface to the controller with the smallest truthful diff
  - add focused tests, then run the normal validation/review gates
- Assumptions:
  - `CO-91` already supplies the shared source-anchor substrate
  - the deterministic `CommandPlanner` remains out of scope for this lane
  - existing prompt-pack experiences are the only non-`source_0` candidate source needed in this slice

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `run memory controller`, `role-specific retrieval`, `planner`, `reviewer`, `executor`, `delegate`, `structured refs`, `provenance`, `memory.source_0`
- Not done if:
  - roles still assemble memory ad hoc
  - the controller exists only as doc language
  - output remains flattened text-only
  - the lane broadens into block-memory storage, retrieval indexing, reuse, telemetry, or continuity work
- Pre-implementation issue-quality review:
  - Current repo truth is narrower than a fresh memory-system rewrite. `source0.ts` already owns the shared anchor, while cloud/review/provider/RLM still own separate selection seams. The smallest truthful gap is a role-aware selection controller above those seams, not new storage or runtime work.

## Milestones & Sequencing
1) Register the `linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d` packet, task mirrors, registry entries, and initial workpad mirror.
2) Run the audited `docs-review` child stream, then fold back any packet-only fixes or record a truthful fallback if only the standing repo baseline fails.
3) Add the shared controller plus role profiles over `memory.source_0` and prompt-pack experiences.
4) Wire planner, reviewer, and at least one executor/delegate path to the controller using thin render adapters.
5) Add focused regressions, run validation, complete standalone review plus an elegance pass, and refresh the workpad before handoff.

## Dependencies
- `orchestrator/src/cli/run/source0.ts`
- `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
- `scripts/lib/review-prompt-context.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
- `orchestrator/src/cli/rlmRunner.ts`
- `orchestrator/src/cli/rlm/symbolic.ts`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused controller/consumer tests
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - keep the controller additive so reverting this lane means removing the new selector/helper and consumer wiring while leaving `CO-91`’s `source_0` contract intact

## Risks & Mitigations
- A controller could silently become a second storage system.
  - Mitigation: reuse only `memory.source_0` plus existing prompt-pack metadata in this slice.
- Consumer prompts could drift if formatting remains duplicated.
  - Mitigation: return structured refs from the controller and keep consumer rendering thin.
- The planner surface could be mis-scoped to `CommandPlanner`.
  - Mitigation: pin the planner consumer to the symbolic RLM planner path in the docs and tests.

## Approvals
- Reviewer: Pre-implementation local self-review approved; audited `docs-review` child stream recorded clean-success on 2026-04-09. Current-base validation completed during the 2026-04-13 UTC run after `CO-94` moved back to `In Progress`; final validation is green, with the manifest-backed review wrapper classified as `failed-boundary` and the manual review/elegance fallback recorded in the task spec.
- Date: 2026-04-13 UTC
