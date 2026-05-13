# ACTION_PLAN - CO: Add source 0 to the run contract and shared memory-consumer read path

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: land a bounded, additive `source 0` run-contract slice that gives the targeted memory consumers one shared pointer-based anchor.
- Scope:
  - register the CO-91 docs packet, task mirrors, and workpad mirror
  - run audited docs-review before implementation
  - add the manifest-backed `memory.source_0` contract plus shared helper
  - wire the helper into reviewer, cloud, provider-worker, child-lane, and RLM reads
  - add focused tests, then run the normal validation and review gates
- Assumptions:
  - the current deterministic planner does not consume task memory, so the immediate consumer scope is the post-bootstrap review/cloud/worker/RLM surfaces named in the issue acceptance

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `source 0`, `memory.source_0`, sibling autonomy-stream slice, pointer-based, traceable, reviewer, cloud, provider-worker, child-lane, RLM, not a `0303` extension, not a new umbrella
- Not done if:
  - the contract lands in only one surface
  - the payload is only a file path or prose blob
  - targeted consumers still derive incompatible anchors
  - the lane broadens into telemetry, continuity, or retrieval-policy work
- Pre-implementation issue-quality review:
  - Current repo truth is narrower than the issue title alone suggests. The immediate missing seam is not a full memory controller; it is the absence of a shared manifest-backed anchor even though the repo already has a pointer-based RLM context-object substrate and multiple adjacent consumer prompt builders.

## Milestones & Sequencing
1) Register the `linear-5f850884-855f-41ed-b593-6c2dee5815d2` docs packet, task mirrors, registry entries, and workpad mirror, then run the audited `docs-review` child stream and fold back any packet-only fixes.
2) Add the additive manifest contract and shared `source 0` helper so runs can materialize or inherit the same pointer-based context object with traceable origin metadata.
3) Wire the shared reader into review, cloud, provider-worker, child-lane, and RLM consumers using the smallest prompt or read-surface deltas possible.
4) Add focused regressions, run the validation floor, complete standalone review plus an explicit elegance pass, and refresh the workpad with the final shared-anchor evidence.

## Dependencies
- `schemas/manifest.json`
- `packages/shared/manifest/types.ts`
- `orchestrator/src/cli/run/manifest.ts`
- `scripts/lib/review-prompt-context.ts`
- `scripts/run-review.ts`
- `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
- `orchestrator/src/cli/rlm/context.ts`
- `orchestrator/src/cli/rlmRunner.ts`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused source-0 contract and consumer read tests
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
  - keep the change additive and helper-centered so the slice can be reverted by removing the new contract/helper wiring without touching unrelated telemetry or worker orchestration

## Risks & Mitigations
- Child-run inheritance could silently fork the anchor into incompatible local shapes.
  - Mitigation: preserve a stable `object_id` and record explicit inheritance metadata while only rewriting local file paths.
- Consumers could drift by formatting or resolving `source 0` independently again.
  - Mitigation: centralize resolve and prompt-line helpers in one shared module and update all targeted consumers to use it.
- `docs/TASKS.md` is already at the line cap before this snapshot is added.
  - Mitigation: apply the repo-supported archive fallback immediately after registration if the new snapshot pushes it over budget.

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream failed only on the repo-wide `docs:freshness` stale-doc baseline after `spec-guard` and `docs:check` passed; manual fallback accepted
- Date: 2026-04-09
