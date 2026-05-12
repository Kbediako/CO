---
id: 20260409-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad
title: CO: automate truthful In Review -> Merging promotion after clean review handoff
status: done
owner: Codex
created: 2026-04-09
last_review: 2026-05-12
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md
related_action_plan: docs/ACTION_PLAN-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md
related_tasks:
  - tasks/tasks-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md
review_notes:
  - 2026-04-09: Opened from Linear issue `CO-116` in the provider-worker workspace after rechecking live CO team states with the packaged `linear issue-context` helper, moving the issue from `Ready` to `In Progress`, recording the required same-turn `stay_serial` parallelization decision, and switching the detached workspace at `HEAD` onto branch `linear/co-116-review-to-merging-bridge`.
  - 2026-04-09: The local workpad source is staged at `out/linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad/manual/workpad.md` before the first Linear upsert so the single remote `## Codex Workpad` comment can stay source-controlled and reusable across refreshes.
  - 2026-04-09: Current code audit confirms the exact seam from the issue report: `providerLinearWorkflowStates.ts` still classifies `Human Review` / `In Review` as handoff-only, `providerIssueHandoff.ts` preserves handoff-owned claims but never promotes them into `Merging`, `providerMergeCloseout.ts` only runs when the live state already normalizes to `merging`, and `pr-watch-merge.js` already exposes the blocker classifier for draft, required checks, review state, unresolved threads, and merge-state readiness.
  - 2026-04-09: Pre-implementation review approves the bounded path: add one explicit review-handoff promotion record and control-plane bridge that reuses the existing attached-PR selector and readiness classifier, preserves explicit refusal reasons, and leaves ordinary `Merging` closeout semantics unchanged.
  - 2026-04-09: Audited `docs-review` child stream `co-116-docs-review` succeeded with `review/telemetry.json` status `succeeded` / `review_outcome=clean-success`, but the review itself flagged one P1 ambiguity: whether `review=REVIEW_REQUIRED` should block review-handoff promotion. This spec resolves that ambiguity by requiring full merge-mode readiness for the bridge, so `REVIEW_REQUIRED` remains an explicit refusal reason until the PR is actually merge-shepherd-ready.
  - 2026-05-12: CO-523 live Linear audit verified CO-116 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: .runs/linear-8573da42-d9f9-44ce-a24e-224984539044/cli/2026-05-12T18-47-35-293Z-376d8842/provider-linear-issue-context-cache-a770da1f-7a08-499d-a680-7f1cd8eee4ad.json.
---

# Technical Specification

## Context
`CO-115` proved the host/runtime lane is no longer the blocker: the control-host can keep running, reclaim work, and hand issues to the provider worker. The remaining gap is later in the workflow. Once a provider-owned issue reaches `Human Review` / `In Review`, current control-plane logic treats that as a terminal handoff state. A manual operator move to `Merging` is still required before deterministic merge closeout can take over. `CO-116` is the bounded orchestration follow-up that closes that review-to-merge gap without weakening merge-closeout safety.

## Requirements
1. Provider-owned issues in `Human Review` / `In Review` with an attached same-repo PR must be able to run a bounded promotion check into `Merging`.
2. The promotion check must reuse the existing attached-PR selector and the existing merge-mode PR readiness/blocker classifier rather than inventing a second heuristic.
3. `review=REVIEW_REQUIRED` must block promotion. The bridge only advances review handoffs that are already merge-shepherd-ready, not PRs that merely cleared code-author handoff.
4. Successful promotion must persist the selected PR, readiness snapshot, and Linear transition outcome in auditable control-plane artifacts.
5. Refused promotion must persist concrete blocker truth and leave the issue out of `Merging`.
6. Existing merge-closeout behavior must remain unchanged once the issue is already in `Merging`.
7. The implementation must stay bounded to review-handoff promotion, proof surfacing, and focused regressions.

## Design
- Add a dedicated persisted review-promotion record rather than overloading `merge_closeout`.
- Reuse the existing same-repo attached-PR selection and PR snapshot/blocker mapping in `providerMergeCloseout.ts`.
- Integrate the promotion attempt into `providerIssueHandoff.ts` wherever a provider-owned review-handoff claim is already being retained.
- Treat promotion as a merge-ready gate, not a review-mode quiet-tail gate: the bridge must refuse draft, unresolved-thread, failing-check, `BEHIND`, `DIRTY`, `CONFLICTING`, and `REVIEW_REQUIRED` shapes with explicit persisted blocker truth.
- When promotion succeeds, let the existing `Merging` lifecycle own the next step rather than redesigning merge-closeout behavior.

## Implementation Surface
- Expected codepaths:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `scripts/lib/pr-watch-merge.js`
- Expected tests:
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts` if the new proof changes projected summaries

## Protected Expectations
- Preserve the current same-repo attached-PR disambiguation behavior from `CO-104`.
- Preserve the current `Merging` merge-closeout safety and completion behavior from `CO-111` / `CO-100`.
- Preserve worker stop-coding semantics at review handoff; the new bridge belongs to the control-plane lifecycle after handoff, not to more worker coding.
- Keep issues with no provider ownership or no promotable attached PR in truthful review handoff rather than force-starting new work.

## Reject These Wrong Interpretations
- "This is another launchd/root-host supervision bug."
- "Promotion should happen for every review-state issue, even when the provider never owned it."
- "The easiest fix is to silently move issues to `Merging` and let merge-closeout explain later."
- "Because `Merging` exists, we can weaken review or merge blockers."

## Current Truth
- `providerLinearWorkflowStates.ts` normalizes `Human Review` / `In Review` into handoff, not active execution.
- Existing provider-owned review claims are preserved with reason `provider_issue_handoff_owned`, but no promotion path exists.
- `providerMergeCloseout.ts` only evaluates attached PRs after the live issue is already `Merging`.
- `pr-watch-merge.js` already exposes the blocker reasons this issue cares about.
- For this lane, `pr-watch-merge.js` merge-mode readiness is the authoritative promotion contract. `review=REVIEW_REQUIRED` remains a blocker until human review is complete.

## Proposed Design
- Introduce a `review_promotion` control-plane record with:
  - selected PR
  - readiness snapshot
  - blocker reasons or transition outcome
- Use that record in `providerIssueHandoff.ts` whenever a provider-owned review-handoff claim is retained on webhook or refresh.
- Keep the chosen readiness mode explicit and tested so the promotion contract is auditable. For `CO-116`, that means full merge-mode readiness, not review-mode readiness.
- Reflect the record through provider observability so review-handoff stalls become concrete instead of generic.

## Non-Goals
- Auto-merging unready PRs.
- Rewriting the `Merging` closeout controller.
- Launchd/root-host changes.
- Broad provider polling or rate-limit policy changes.

## Parity / Alignment Matrix
- Current truth:
  - provider-owned review handoffs stop at `provider_issue_handoff_owned`
  - deterministic merge closeout waits for `Merging`
  - review-handoff blocker truth is not persisted in a dedicated promotion artifact
- Reference truth:
  - one truthful PR readiness/blocker classifier should be reused across handoff and merge orchestration
  - operators should not need a manual state nudge for a clean provider-owned review handoff
- Target truth / intended delta:
  - provider-owned review handoffs can promote into `Merging` automatically when they satisfy the bridge contract
  - refused promotions persist explicit blocker truth
  - ordinary `Merging` closeout remains unchanged
- Explicitly out-of-scope differences:
  - worker prompt changes beyond documenting the new state progression
  - generic launchd or dashboard work
  - new multi-PR ambiguity rules beyond the current selector

## Not Done If
- A clean provider-owned review handoff still needs a manual `In Review` / `Human Review` -> `Merging` move.
- Refused promotions still leave no concrete blocker reason in persisted artifacts.
- Existing `Merging` closeout behavior regresses or changes semantics.

## Validation Plan
- `linear child-stream --pipeline docs-review`
- Focused regressions for:
  - promotion success from provider-owned review handoff into `Merging`
  - refusal for `review=REVIEW_REQUIRED`
  - refusal for draft, unresolved-thread, failing-check, and merge-state-blocked shapes
  - persisted proof/observability output for review-promotion records
- Full repo validation floor before review handoff

## Approvals
- Reviewer: `docs-review` child stream recorded at `.runs/linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad-co-116-docs-review/cli/2026-04-09T02-47-50-041Z-2edb5399/manifest.json`; one P1 spec ambiguity was addressed in this spec before implementation and should be rechecked in the post-change review lane.
- Date: 2026-04-09
