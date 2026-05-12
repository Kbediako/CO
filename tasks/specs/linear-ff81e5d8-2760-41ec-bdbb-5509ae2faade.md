---
id: 20260409-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade
title: CO: release rehydrated Merging claims after merged PR when live Linear reads are cooldown-suppressed
status: done
owner: Codex
created: 2026-04-09
last_review: 2026-05-12
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md
related_action_plan: docs/ACTION_PLAN-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md
related_tasks:
  - tasks/tasks-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md
review_notes:
  - 2026-04-09: Opened from Linear issue `CO-111` in the provider-worker workspace after rechecking live CO team states with the packaged `linear issue-context` helper, moving the issue from `Ready` to `In Progress`, recording the required same-turn `stay_serial` parallelization decision, creating the required single `## Codex Workpad` comment, and switching the detached workspace at `HEAD` onto branch `linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade`.
  - 2026-04-09: Current code audit confirms two remaining seams that match the issue scope: `providerMergeCloseout.ts` still hard-fails on a fresh live `issue-context` read before it can use cached attached-PR evidence during cooldown, and `providerIssueHandoff.ts` still preserves a rehydrated active run before merged-closeout recovery can override it when the worker itself remains alive.
  - 2026-04-09: Current artifact audit against `/Users/kbediako/Code/CO/.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470/cli/2026-04-08T13-24-10-989Z-40c38f47/provider-linear-worker-linear-audit.jsonl` and `provider-linear-issue-context-cache.json` confirms the incident shape: an immediate post-merge `issue-context` read failed with `linear_rate_limited`, the run-local cache still preserved the attached PR and later closeout narrative, and the shared control-host intake only released the claim after cooldown expiry enabled a later reread.
  - 2026-05-12: CO-523 live Linear audit verified CO-111 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: .runs/linear-8573da42-d9f9-44ce-a24e-224984539044/cli/2026-05-12T18-47-35-293Z-376d8842/provider-linear-issue-context-cache-ff81e5d8-2760-41ec-bdbb-5509ae2faade.json.
---

# Technical Specification

## Context
`CO-100` already made deterministic merge closeout authoritative for recovered terminal `Merging` runs, but `CO-111` exposes the remaining gap: a rehydrated `provider_issue_rehydrated_active_run` can still stay `running` after the attached PR is already merged and the shared root is already current when the worker survives through a cooldown-suppressed live Linear reread. The current repo already preserves enough local evidence to repair this path: same-run cached issue context beside the worker artifacts, GitHub PR snapshot truth, and deterministic shared-root reconciliation. The missing step is consuming that local evidence before rehydrate blindly preserves the active run again.

## Requirements
1. Deterministic merge closeout must be able to reuse same-run cached issue-context evidence when a live `issue-context` read fails because Linear shared-budget cooldown suppresses it.
2. Refresh or rehydrate must not preserve a stale `provider_issue_rehydrated_active_run` in `Merging` when attached PR snapshot truth already proves the PR is merged.
3. Ordinary open-PR `Merging` lanes must remain active and must not be downgraded just because cached issue context exists.
4. The repaired path must persist explicit `merge_closeout` truth and must leave the claim non-running for the merged recovery case.
5. `CO STATUS` and provider observability must therefore stop projecting the issue as active `Merging` work in the reproduced cooldown-suppressed recovery shape.

## Design
- Reuse the worker-side issue-context cache that `providerLinearWorkflowFacade.ts` already writes beside provider-worker artifacts.
- Add a probe-only merged-closeout precheck for rehydrated active `Merging` runs:
  - read cached attached-PR context
  - inspect GitHub snapshot truth
  - only invoke full deterministic merge closeout when the selected attached PR is already merged
- Keep full deterministic merge closeout authoritative for the actual outcome:
  - it may still end in `merged`, `action_required`, or `transition_failed`
  - regardless of the exact terminal closeout result, the stale merged recovery path must stop preserving the claim as `running`

## Implementation Surface
- Expected codepaths:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
- Expected tests:
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts` only if projected status semantics need adjustment

## Protected Expectations
- Preserve the exact surfaces `provider_issue_rehydrated_active_run`, `merge_closeout`, `Merging`, and `CO STATUS`.
- Keep cached issue-context fallback bounded to the same run's artifact directory.
- Preserve the existing open-PR active-lane behavior for ordinary merge shepherding.
- Prefer the smallest recovery-ordering repair over broader lifecycle redesign.

## Reject These Wrong Interpretations
- `CO STATUS` is stale so the fix is only presentational
- any cached issue context is enough to retire any active `Merging` lane
- cooldown-suppressed live reads mean the merged lane must stay active until cooldown expiry
- fix the lane only by forcing a later manual transition or manual repo sync

## Current Truth
- `providerMergeCloseout.ts` fails closed on live `issue-context` errors before it can recover attached PR truth from the same-run cache.
- `providerIssueHandoff.ts` still preserves live rehydrated `in_progress` runs too early for the `CO-109` merged-during-cooldown incident.
- current local intake has already eventually released `CO-109`, which proves later rereads can clean it up, but the issue remains that cooldown expiry was required.

## Proposed Design
- Teach deterministic merge closeout to consume a provided run-local cache path when live `issue-context` reads are rate-limited.
- Add a side-effect-free probe path so handoff recovery can ask, "does cached attached-PR context plus GitHub snapshot truth already prove merged?" before deciding whether to preserve a rehydrated active run.
- Reuse the resulting closeout record directly in the persisted claim rather than inventing a parallel proof surface.

## Non-Goals
- General Linear cache fallback beyond this deterministic closeout seam.
- Budget-policy or cooldown-policy redesign.
- Reopening old multi-PR ambiguity work.
- Rewriting dashboard formatting.

## Parity / Alignment Matrix
- Current truth:
  - same-run issue-context cache exists but merge closeout ignores it on live-read failure
  - active rehydrated runs can keep a merged lane `running`
  - merged truth only becomes local truth after a later successful reread
- Reference truth:
  - authoritative merge closeout should not need a second successful Linear read when the attached PR is already proven merged
  - open-PR active merge lanes must remain active
- Target truth / intended delta:
  - cached same-run issue context plus GitHub snapshot truth can retire or downgrade stale merged active claims
  - `merge_closeout` becomes explicit on this path
  - active open-PR `Merging` work remains active
- Explicitly out-of-scope differences:
  - general provider lifecycle cleanup
  - generic UI work
  - rate-limit hardening

## Not Done If
- a merged lane can still stay `running` with `merge_closeout: null` after restart or rehydrate
- the only path to local truth is waiting for cooldown expiry and a fresh successful `issue-context` reread
- open-PR `Merging` work is accidentally downgraded by the new recovery logic

## Validation Plan
- `linear child-stream --pipeline docs-review`
- Focused regressions for:
  - deterministic merge closeout with cached issue-context fallback after live `linear_rate_limited`
  - rehydrated active `Merging` recovery when the attached PR is already merged
  - preserved active behavior for ordinary live open-PR `Merging` work
- Full repo validation floor before review handoff

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-09
