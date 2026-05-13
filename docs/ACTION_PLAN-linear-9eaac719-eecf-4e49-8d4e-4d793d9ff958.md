# ACTION_PLAN - CO: Make planner memory selection real instead of leaving TaskContext as dead input

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: land the bounded planner-memory seam so `TaskContext` becomes a real planner input and the planner emits selected memory refs before downstream prompt building.
- Scope:
  - register the CO-92 docs packet, task mirrors, and workpad mirror
  - run audited docs-review before implementation
  - add a bounded planner-memory contract to `TaskContext`
  - build planner-memory refs during run preparation
  - make `CommandPlanner` emit selected memory refs and wire the cloud prompt path to consume them
  - add focused tests, then run the normal validation and review gates
- Assumptions:
  - `CO-91` already landed the shared `source 0` contract and helper-backed read path
  - the current bounded downstream consumer worth proving is the cloud prompt path because it already selects prompt-pack experiences heuristically after planning

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `TaskContext`, dead input, planner memory selection, fixed-model memory, `source 0`, selected memory refs, additive and bounded
- Not done if:
  - the planner still ignores `TaskContext`
  - selected memory refs exist only in docs or dead metadata
  - the planner cannot carry `source 0` plus selected memory refs before prompt building
  - the lane broadens into controller, telemetry, or continuity work
- Pre-implementation issue-quality review:
  - Current repo truth is narrower than a planner rewrite. The immediate gap is one missing planner-memory contract plus one downstream proof of consumption, because the current cloud prompt path still selects prompt-pack experiences independently while `CommandPlanner` ignores its task input.

## Milestones & Sequencing
1) Register the `linear-9eaac719-eecf-4e49-8d4e-4d793d9ff958` docs packet, task mirrors, registry entries, and workpad mirror, then run the audited `docs-review` child stream and fold back any packet-only fixes.
2) Add a bounded planner-memory contract plus run-preparation builder so `planner.plan(...)` receives planner-available refs including literal `source 0`.
3) Update `CommandPlanner` to emit selected memory refs deterministically without broadening into a general controller.
4) Wire planner-selected refs into the cloud prompt builder, add focused regressions, run the validation floor, complete standalone review plus an explicit elegance pass, and refresh the workpad with the final planner-memory evidence.

## Dependencies
- `orchestrator/src/types.ts`
- `orchestrator/src/cli/services/runPreparation.ts`
- `orchestrator/src/cli/adapters/CommandPlanner.ts`
- `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
- `packages/orchestrator/src/instructions/loader.ts`
- `packages/orchestrator/src/instructions/promptPacks.ts`
- `orchestrator/src/cli/run/source0.ts`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused planner-memory and cloud-prompt tests
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
  - keep the change additive and ref-based so the lane can be reverted by removing the new planner-memory contract and consumer wiring without disturbing the underlying `source 0` contract

## Risks & Mitigations
- Planner-memory input could become a hidden prompt-content dump instead of a bounded ref contract.
  - Mitigation: keep `TaskContext.memory` limited to stable ids plus small labels or counts; resolve actual prompt content only in the downstream consumer.
- Cloud prompt consumption could diverge from planner selection and quietly keep using local heuristics.
  - Mitigation: make explicit selected-ref handling the preferred path and preserve heuristic selection only as the absence fallback.
- The docs packet could push `docs/TASKS.md` over its line budget.
  - Mitigation: apply the repo-supported archive fallback immediately if registration crosses the budget.

## Approvals
- Reviewer: Pending audited docs-review child stream after packet creation
- Date: 2026-04-09
