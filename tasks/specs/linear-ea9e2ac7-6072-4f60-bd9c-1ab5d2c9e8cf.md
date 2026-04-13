---
id: 20260412-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf
title: CO workflow: add a truthful non-repro path for forced child-lane validation issues
status: in_progress
owner: Codex
created: 2026-04-12
last_review: 2026-04-12
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md
related_action_plan: docs/ACTION_PLAN-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md
related_tasks:
  - tasks/tasks-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md
review_notes:
  - 2026-04-12: Opened from Linear issue `CO-157` in the provider-worker workspace after rechecking live CO workflow states with the packaged `linear issue-context` helper, moving the issue from `Ready` to `In Progress`, recording the required same-turn `stay_serial` / `overlapping_scope` parallelization decision, creating branch `linear/co-157-forced-child-lane-non-repro`, and bootstrapping the single required `## Codex Workpad` comment as Linear comment `12fc26ab-0bc2-44d3-b487-88936836602e`.
  - 2026-04-12: Source issue `CO-133` final closeout proves the motivating behavior is already known but not yet encoded as standing workflow guidance: once `clean-main-baseline-failures` and `cli-orchestrator-cleanup-fallout` both disappeared as live clusters, no child lanes were truthful, the lane closed as a non-repro, and a follow-up captured the workflow-contract gap that now needs a clearer standing reason-selection rule.
  - 2026-04-12: Baseline contract inspection confirmed `buildParallelizationGuidance(...)` already exposes the generic allowed decision/reason matrix, but it does not explain the forced invalid-split non-repro branch that `CO-157` exists to codify.
  - 2026-04-12: Pre-implementation issue-quality review approves the bounded scope: docs-first registration, audited docs-review, one prompt-guidance update, and focused prompt regression coverage only. Reopening `CO-133` validation fixes or changing the generic matrix is explicitly out of scope.
  - 2026-04-12: Standalone review on the first wording surfaced a truthful-semantics issue: clean non-repro closeout should not record `blocked_by_dependency` when no dependency remains. The final prompt/docs now branch `forbid_parallel` into `parent_only_mutation` for direct clean closeout versus `blocked_by_dependency` only for real remaining dependencies that should move to `Blocked`.
  - 2026-04-12: Final validation is green on the corrected diff: focused `ProviderLinearWorkerRunner` coverage passed, audited docs-review child stream `co-157-docs-review-final` succeeded, the repo validation floor passed, the rerun standalone review telemetry reported `status: succeeded` / `review_outcome: clean-success`, and the explicit elegance pass kept the change to the minimal prompt/test/docs seam.
---

# Technical Specification

## Context
`CO-101` made ordinary same-issue child-lane decisions machine-checkable, but `CO-133` later exposed a narrower workflow gap. That source issue intentionally forced a non-serial validation split and explicitly disallowed silently finishing as `stay_serial` if the split collapsed. Fresh April 12, 2026 evidence showed the named `clean-main-baseline-failures` and `cli-orchestrator-cleanup-fallout` clusters were both clean non-repros, so no child lanes were truthful and a workflow-contract follow-up was needed. The repo-local provider-worker prompt now explains that branch directly, and this lane keeps the standing packet truthful and aligned with that closeout guidance instead of forcing every clean non-repro down `blocked_by_dependency`.

## Requirements
1. Preserve the existing `parallelize_now`, `stay_serial`, and `forbid_parallel` contract from `CO-101`.
2. Add explicit prompt/workflow guidance for forced child-lane validation issues whose intended split disappears because the named clusters are clean non-repros on fresh current-main evidence.
3. Preserve the exact motivating cluster names `clean-main-baseline-failures` and `cli-orchestrator-cleanup-fallout`.
4. Make the closeout rule explicit:
   - do not fabricate child lanes
   - do not silently downgrade to `stay_serial`
   - record `forbid_parallel` with the truthful bounded reason
   - use `parent_only_mutation` and close directly when no live dependent work remains
   - use `blocked_by_dependency` only when a real dependency still exists and the issue should move to `Blocked`
   - use `create-follow-up` when the clean non-repro exposes a separate workflow gap instead of a live dependency
5. Add focused regressions proving first-turn and continuation prompts include this guidance.

## Current Truth
- `buildParallelizationGuidance(...)` currently tells workers to record a decision every active turn and explains the generic reason-code pairs.
- The current prompt now includes the forced invalid-split non-repro guidance: it tells workers not to invent child lanes, to keep `forbid_parallel`, to use `parent_only_mutation` for direct clean closeout, and to reserve `blocked_by_dependency` for real remaining dependencies that should move to `Blocked`.
- `CO-133` proved the truthful behavior and this lane is codifying that behavior as standing repo workflow guidance.

## Issue-Shaping Contract
- User-request translation carried forward:
  - keep this scoped to workflow and packet contracts rather than validation-fix revival
  - preserve `parallelize_now`, `forbid_parallel`, `blocked_by_dependency`, `clean-main-baseline-failures`, and `cli-orchestrator-cleanup-fallout`
  - make close versus `Blocked`/follow-up behavior explicit
- Protected surfaces:
  - `buildProviderWorkerPrompt(...)`
  - `buildParallelizationGuidance(...)`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `provider-linear-worker-proof.json`
  - `child_lanes`
- Nearby wrong interpretations to reject:
  - the generic prompt already makes this case obvious
  - `stay_serial` is acceptable when a forced split disappears
  - the fix should reopen `CO-133` validation work
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

## Readiness Gate
- Pre-implementation issue-quality review evidence:
  - the source closeout already provides the authoritative example, so the smallest correct change is to encode that example in standing workflow guidance and test it

## Technical Requirements
- Functional requirements:
  - add explicit prompt guidance for invalidated forced validation splits
  - preserve the exact example cluster names
  - preserve the close/direct versus `Blocked`/follow-up distinction
- Non-functional requirements:
  - keep the generic reason matrix untouched
  - keep the diff reviewable and bounded
  - rely on docs-review and focused regression coverage for proof
- Interfaces / contracts:
  - `buildParallelizationGuidance(...)`
  - first-turn and continuation prompt assertions in `ProviderLinearWorkerRunner.test.ts`

## Architecture & Data
- Architecture / design adjustments:
  - no new enforcement branch is needed
  - the change belongs in standing prompt guidance plus docs packet truthfulness
- Data model changes / migrations:
  - register the `CO-157` packet in task registries and freshness registry
  - no runtime schema changes are planned
- External dependencies / integrations:
  - audited `linear child-stream --pipeline docs-review`
  - existing provider-worker prompt/test harness

## Validation Plan
- Tests / checks:
  - `MCP_RUNNER_TASK_ID=linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-157-docs-review --format json`
  - focused `ProviderLinearWorkerRunner` regression run
  - repo validation floor if the final diff remains non-trivial
- Rollout verification:
  - refresh the single workpad after docs-first, after implementation, and before any stop point
  - confirm both first-turn and continuation prompts carry the new rule
- Monitoring / alerts:
  - no new automation; proof remains in docs-review, focused tests, and the updated prompt contract

## Approvals
- Reviewer: pending audited docs-review
- Date: 2026-04-12
