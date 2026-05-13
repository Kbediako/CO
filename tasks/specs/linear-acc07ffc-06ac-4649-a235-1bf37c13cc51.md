---
id: 20260411-linear-acc07ffc-06ac-4649-a235-1bf37c13cc51
title: CO: prevent archived or trashed Linear issues from being claimed or mutated as active provider lanes
status: done
owner: Codex
created: 2026-04-11
last_review: 2026-05-12
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-acc07ffc-06ac-4649-a235-1bf37c13cc51.md
related_action_plan: docs/ACTION_PLAN-linear-acc07ffc-06ac-4649-a235-1bf37c13cc51.md
related_tasks:
  - tasks/tasks-linear-acc07ffc-06ac-4649-a235-1bf37c13cc51.md
review_notes:
  - 2026-04-11: Opened from Linear issue `CO-153` in the provider-worker workspace after rechecking live CO team states with the packaged `linear issue-context` helper, moving the issue from `Ready` to `In Progress`, recording the required same-turn `parallelize_now` / `independent_scope_available` decision, creating the single persistent `## Codex Workpad`, and switching the detached workspace onto branch `linear/co-153-archived-issue-admission`.
  - 2026-04-11: Preserved patch audit confirms the re-home direction and the missing final scope. `co-32-linear-issue-not-mutable.patch` already carries issue-context/cache truth, restored-cache revalidation, `linear_issue_not_mutable` fail-closed mutation behavior, and prompt/selected-run suppression work, but it does not cover the missing admission boundary and it would regress `docs/TASKS.md` by dropping the `CO-68` snapshot if applied blindly.
  - 2026-04-11: Baseline audit confirms the live admission gap. `linearDispatchSource.ts` currently normalizes tracked issues without `archivedAt` / `trashed`, fresh-dispatch eligibility only checks workflow state/ownership, `providerIssueHandoff.ts` claim/start eligibility only checks workflow state/blockers/assignee, and `providerLinearWorkerTruth.ts` does not yet treat `linear_issue_not_mutable` as a same-attempt deterministic suppression.
  - 2026-04-11: Pre-implementation issue-quality review approves this as broader than CO-32 mutation classification alone but still bounded to archived/trashed mutability truth and provider admission. The lane must cover admission, persisted claim truth, restored rereads, and suppression surfaces while explicitly excluding auto-unarchive or broad provider-worker redesign.
  - 2026-05-12: CO-523 live Linear audit verified CO-153 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: .runs/linear-8573da42-d9f9-44ce-a24e-224984539044/cli/2026-05-12T18-47-35-293Z-376d8842/provider-linear-issue-context-cache-acc07ffc-06ac-4649-a235-1bf37c13cc51.json.
---

# Technical Specification

## Context
`CO-32` showed a specific failure mode rather than a generic Linear outage: the provider worker could still read issue context and even transition the issue, but workpad writes failed because the live issue was archived/trashed and GraphQL refused comment mutation against it. That partial-success behavior is already dangerous. The missing part is worse: the control host can still claim or continue archived issues as active provider lanes because tracked issue discovery and provider handoff do not carry explicit mutability truth.

## Requirements
1. Live tracked issues must normalize `archived_at` and `trashed` truth from Linear reads.
2. Fresh dispatch recommendation and provider handoff/start eligibility must fail closed for archived or trashed issues before claim/start.
3. Provider intake claims must persist mutability truth so snapshot-backed retry/rehydration decisions stay truthful when live reads are unavailable.
4. `ProviderLinearIssueContext`, summary reads, and cached issue-context records must expose `archived_at` and `trashed`.
5. `transition` and `upsert-workpad` must return `linear_issue_not_mutable` before any real write when the issue is archived or trashed.
6. Cached archived summaries/contexts must revalidate live so restored issues can resume normal mutation paths.
7. `linear_issue_not_mutable` must be treated as a deterministic same-attempt suppression in worker prompts, selected-run summaries, and provider proof summaries.

## Design
- Extend `LiveLinearTrackedIssue` plus `LinearIssueNode` parsing in `linearDispatchSource.ts` with `archived_at` and `trashed`, request those fields in both full and fresh-discovery issue queries, and normalize missing historical values to `null` / `false`.
- Introduce a small tracked-issue mutability helper and use it in:
  - `isLiveLinearTrackedIssueEligibleForFreshDispatch(...)`
  - `assessProviderTrackedIssueEligibility(...)`
  - provider worker lifecycle execution eligibility via the shared tracked issue shape
- Persist `issue_archived_at` and `issue_trashed` in `ProviderIntakeClaimRecord`, `buildTrackedIssueClaimFields(...)`, and `buildTrackedIssueSnapshotFromClaim(...)`.
- Re-home the preserved CO-32 mutability checks into `providerLinearWorkflowFacade.ts`:
  - add mutability fields to issue-context/summary queries and cached-context normalization
  - add `failureIfIssueNotMutable(...)`
  - revalidate cached archived contexts/summaries live before failing a restored issue
  - keep existing `noop` fast paths when the target already matches
- Extend deterministic suppression derivation in `providerLinearWorkerTruth.ts`; existing worker prompt and selected-run summary plumbing can then reuse the new suppression reason without new summary-specific infrastructure.

## Implementation Surface
- Expected codepaths:
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
- Expected tests:
  - `orchestrator/tests/LinearDispatchSource.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/SelectedRunProjection.test.ts`

## Protected Expectations
- Do not auto-restore archived or trashed issues.
- Do not regress active mutable issue transition/workpad behavior.
- Do not remove idempotent `noop` behavior when the desired state/workpad already matches.
- Do not leave intake able to claim archived issues just because mutation helpers now fail closed later.
- Do not drop existing task snapshots from `docs/TASKS.md`, especially the referenced `CO-68` snapshot.

## Reject These Wrong Interpretations
- "Only add `archivedAt` / `trashed` to issue-context output."
- "Treat archived/trashed issues as generic inactive state without explicit mutability classification."
- "Fix the issue by broadening GraphQL filters without proving the schema path or by adding auto-unarchive behavior."
- "Copy the CO-32 docs packet verbatim and call the re-home done."

## Parity / Alignment Matrix
- Not applicable as a formal parity lane.
- Current truth: intake ignores mutability, facade cache lacks mutability truth, and deterministic suppression lacks `linear_issue_not_mutable`.
- Reference truth: archived/trashed issues are non-mutable and should be blocked before claim/start and before writes; restored issues should resume after a live reread.
- Target truth / intended delta: tracked issues, claims, cache, and mutation helpers all carry explicit mutability truth, and archived issues stop being active provider lanes.
- Explicitly out-of-scope differences: auto-recovery automation, generic workpad redesign, unrelated provider lifecycle changes.

## Not Done If
- An archived or trashed issue can still reach `start` or `resume` through fresh discovery, webhook handling, or retry rehydration.
- A restored issue still fails from stale cached `archived_at` / `trashed`.
- Worker/selected-run/proof summaries still encourage same-attempt retries after `linear_issue_not_mutable`.
- The fix only covers the facade and leaves intake/claim logic unchanged.

## Validation Plan
- Audited `linear child-stream --pipeline docs-review` before implementation.
- Focused tests for:
  - tracked issue normalization and dispatch exclusion
  - handoff claim/start blocking for archived/trashed issues
  - live archived mutation failure
  - cached archived revalidation for restored success
  - idempotent archived workpad/state noops
  - worker prompt suppression
  - selected-run summary suppression
- Required repo validation floor plus standalone/elegance review before handoff.

## Approvals
- Reviewer: pending audited docs-review
- Date: 2026-04-11
