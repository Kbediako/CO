---
id: 20260412-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf
title: CO workflow: add a truthful non-repro path for forced child-lane validation issues
relates_to: docs/PRD-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md
related_prd: docs/PRD-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md
related_action_plan: docs/ACTION_PLAN-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md
risk: high
owners:
  - Codex
last_review: 2026-04-12
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`
- PRD: `docs/PRD-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`
- Task checklist: `tasks/tasks-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`

## Scope
- Keep the lane bounded to provider-worker workflow guidance, docs packet truthfulness, and focused regression coverage.
- Reuse the generic ordinary decision contract from `CO-101` instead of changing the decision matrix or enforcement model.
- Encode the `CO-133` closeout behavior as standing workflow guidance without reopening its already-green validation seams.

## Current Truth
- `buildParallelizationGuidance(...)` already tells workers to record exactly one current-turn decision and respects the existing allowed decision/reason pairs.
- The current prompt now includes the forced invalid-split non-repro guidance: it tells workers not to invent child lanes, to keep `forbid_parallel`, to use `parent_only_mutation` for direct clean closeout, and to reserve `blocked_by_dependency` for real remaining dependencies that should move to `Blocked`.
- `CO-133` proved the truthful answer in practice:
  - no live independent failure owner remained for `clean-main-baseline-failures` or `cli-orchestrator-cleanup-fallout`
  - the parent recorded `forbid_parallel`
  - no child-lane accept/reject/invalidate action was truthful
  - the source lane closed as a stale non-repro and filed a follow-up for the workflow-contract gap

## Requirements
1. Preserve the existing `parallelize_now`, `stay_serial`, and `forbid_parallel` decision matrix and existing reason-code allowlist.
2. Add explicit provider-worker guidance for forced child-lane validation issues whose originally named clusters are now clean non-repros on fresh current-main evidence.
3. The guidance must say:
   - do not invent child lanes
   - do not silently continue as `stay_serial`
   - record `forbid_parallel` with the truthful bounded reason
   - use `parent_only_mutation` and close the issue directly when no live dependent work remains
   - use `blocked_by_dependency` only when a real remaining dependency still exists and the issue should move to `Blocked`
   - use `create-follow-up` when the clean non-repro exposes a separate workflow-contract gap instead of a live dependency
4. Preserve the exact motivating cluster names `clean-main-baseline-failures` and `cli-orchestrator-cleanup-fallout` in the example guidance, so the contract stays auditable.
5. Add focused regressions proving the first-turn and continuation prompts include the invalid-split non-repro guidance.

## Design
- Extend `buildParallelizationGuidance(...)` in `orchestrator/src/cli/providerLinearWorkerRunner.ts` with one bounded bullet describing the invalidated forced-split case.
- Keep the new guidance adjacent to the existing decision/reason-code instructions, so workers see it as part of the same contract.
- Phrase the guidance as a decision-state-closeout rule, not as a new reason code or new enforcement path.
- Update prompt assertions in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts` to require the new guidance in both first-turn and continuation prompts.

## Issue-Shaping Contract
- User-request translation carried forward:
  - preserve `parallelize_now`, `forbid_parallel`, `blocked_by_dependency`, `clean-main-baseline-failures`, and `cli-orchestrator-cleanup-fallout`
  - treat this as workflow-contract clarification, not validation-fix revival
  - make close versus `Blocked`/follow-up behavior explicit
- Nearby wrong interpretations to reject:
  - generic prompt wording is already enough
  - `stay_serial` is an acceptable silent fallback for invalidated forced-split issues
  - the correct fix is to re-run or re-open validation work that is already green
- Non-goals:
  - changing the decision matrix or reason-code allowlist
  - reopening already-green `CO-133` validation seams or rerunning green validation work
  - adding new enforcement outside the existing provider-worker prompt, test, and docs seam
- Not done if:
  - `parallelize_now`, `forbid_parallel`, `blocked_by_dependency`, `clean-main-baseline-failures`, or `cli-orchestrator-cleanup-fallout` stop being preserved in the contract and auditable example
  - close versus `Blocked` or follow-up behavior is still implicit
  - workers can still read the contract as permission to invent child lanes or finish as `stay_serial`
  - `blocked_by_dependency` is allowed without a real remaining dependency
  - the implementation changes anything outside the existing provider-worker prompt, test, and docs seam

## Validation
Validation evidence for this lane belongs in `tasks/tasks-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`,
`.agent/task/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`, and the Linear workpad.
Required checks remain:
- audited `linear child-stream --pipeline docs-review`
- focused `ProviderLinearWorkerRunner` prompt regression coverage
- standard repo validation and review gates before any review handoff if a non-trivial diff remains
