# PRD - CO: automate truthful In Review -> Merging promotion after clean review handoff

## Added by Bootstrap 2026-04-09

## Traceability
- Linear issue: `CO-116` / `a770da1f-7a08-499d-a680-7f1cd8eee4ad`
- Linear URL: https://linear.app/asabeko/issue/CO-116/co-automate-truthful-in-review-merging-promotion-after-clean-review
- Related lanes:
  - `CO-115` / `bf0ba9ec-47f0-45ac-be83-490df0f0b45d`
  - `CO-111` / `ff81e5d8-2760-41ec-bdbb-5509ae2faade`
  - `CO-104` / `8ef95d79-db42-411c-886c-99bdeee6492b`
  - `CO-100`

## Summary
- Problem Statement: the provider-worker lifecycle now gets cleanly to review handoff, but the autonomous flow still stops once the Linear issue reaches `Human Review` / `In Review`. `providerIssueHandoff.ts` retains the handoff-owned claim instead of promoting it, and `providerMergeCloseout.ts` only evaluates attached-PR merge shepherding once the live issue is already in `Merging`, so clean review handoffs can still require a manual operator state move before merge orchestration resumes.
- Desired Outcome: add an explicit, truthful bridge from `In Review` / `Human Review` to `Merging` for provider-owned issues whose attached PR is actually ready for merge shepherding, and record explicit blocker truth when the bridge refuses to promote instead of silently stalling in review handoff.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): close the remaining workflow gap after `CO-115` by teaching the control-plane lifecycle to inspect a provider-owned review handoff, promote it to `Merging` when the attached PR is truly ready for merge shepherding, and persist the exact reason when promotion is refused. This belongs in workflow orchestration rather than launchd or host-uptime code.
- Success criteria / acceptance:
  - a provider-worker lane that reaches `In Review` with a non-draft, mergeable attached PR, green required checks, and no unresolved actionable review threads can be promoted to `Merging` without an operator moving the issue by hand
  - the bridge does not promote draft, `BEHIND`, `DIRTY`, `CONFLICTING`, unresolved-thread, or failing-check shapes
  - when promotion is refused, the claim/workpad/proof surfaces record concrete blocker truth rather than leaving the issue parked in review with no explanation
  - the promotion decision is auditable from persisted control-plane artifacts
  - once an issue is already in `Merging`, existing deterministic merge closeout semantics remain unchanged
- Constraints / non-goals:
  - do not auto-merge PRs that are not already safe for the existing `Merging` closeout path
  - do not weaken review requirements, `pr ready-review` drain semantics, or merge-closeout safety guards
  - do not couple the bridge to launchd/root-host supervision
  - do not reopen historical multi-PR ambiguity or stale-claim recovery except where the existing selector is a direct prerequisite

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `automate truthful In Review -> Merging promotion`
  - `clean review handoff`
  - `merge-shepherd-ready`
  - `record concrete blocker truth`
  - `do not silently stall`
- Protected terms / exact artifact and surface names:
  - `providerIssueHandoff.ts`
  - `providerMergeCloseout.ts`
  - `providerLinearWorkflowStates.ts`
  - `pr-watch-merge.js`
  - `Human Review`
  - `In Review`
  - `Merging`
  - `mergeStateStatus`
  - `review threads`
  - `required checks`
- Nearby wrong interpretations to reject:
  - "fix the host uptime or launchd lane again"
  - "solve this only by more background polling"
  - "we can weaken merge-closeout rules once we auto-promote"
  - "review handoff should always become `Merging` even when the PR is draft, behind, dirty, conflicting, or blocked by review feedback"

## Parity / Alignment Matrix
- Current truth:
  - `providerLinearWorkflowStates.ts` classifies `Human Review` / `In Review` as handoff-only, non-execution states
  - `providerIssueHandoff.ts` preserves existing handoff-owned claims in those states but does not attempt promotion into `Merging`
  - `providerMergeCloseout.ts` only arms deterministic merge shepherding once the live Linear issue is already `Merging`
  - `pr-watch-merge.js` already owns the truthful PR readiness and blocker classifier for review and merge surfaces
- Reference truth:
  - control-plane workflow ownership should not require an operator to manually move a clean provider-owned review handoff into `Merging`
  - the attached PR readiness policy should come from one existing truthful classifier rather than a second ad hoc heuristic
  - merge-closeout safety once already in `Merging` should remain authoritative and unchanged
- Target truth / intended delta:
  - provider-owned review handoffs can be promoted automatically into `Merging` when the attached PR meets the truthful bridge contract
  - refusal reasons are persisted as machine-checkable blocker truth
  - standard `Merging` closeout remains the next authority after promotion succeeds
- Explicitly out-of-scope differences:
  - launchd/root-host supervision
  - generic Linear polling or budget redesign
  - reopening historical attached-PR ambiguity beyond the existing same-repo selector
  - rewriting the `Merging` closeout lifecycle contract

## Not Done If
- Operators still have to manually move clean provider-owned issues from `In Review` / `Human Review` to `Merging`.
- The only observable change is more refresh or poll activity with no explicit promotion decision.
- Draft, `BEHIND`, `DIRTY`, `CONFLICTING`, unresolved-review, or failing-check PR states can still advance silently into `Merging`.
- Refused promotions still leave no auditable blocker truth in persisted control-plane artifacts.

## Goals
- Add a bounded, truthful review-handoff-to-`Merging` bridge for provider-owned issues.
- Reuse the existing attached-PR selection and readiness/blocker classifier where possible.
- Persist promotion and refusal truth in the same control-plane evidence surfaces operators already inspect.
- Preserve the current `Merging` merge-closeout behavior once the issue is already in that state.

## Non-Goals
- Auto-merging unready PRs.
- Reworking launchd/root-host supervision.
- Replacing the current deterministic merge-closeout controller.
- Broad workflow-state redesign outside the review-to-merge seam.

## Stakeholders
- Product: CO operators who expect the autonomous lane to continue after clean review handoff without manual state nudges
- Engineering: control-host, provider-intake, merge-closeout, and observability maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - provider-owned review handoffs with clean attached-PR readiness promote to `Merging` automatically
  - blocked review handoffs surface concrete refusal reasons instead of generic inactivity
  - existing `Merging` closeout regressions do not appear
- Guardrails / Error Budgets:
  - preserve the current same-repo attached-PR selector and merge-closeout safety outcomes
  - keep review-handoff classification truthful for issues with no existing provider ownership
  - prefer one shared PR readiness classifier over duplicate logic

## User Experience
- Personas:
  - operator watching provider-owned issues advance without manual workflow nudges
  - reviewer debugging why a review handoff did or did not promote into `Merging`
- User Journeys:
  - a clean provider-owned `In Review` issue promotes into `Merging` and resumes merge orchestration without manual intervention
  - a blocked provider-owned review handoff stays out of `Merging` and records the exact blocker reason
  - once promoted, the existing `Merging` closeout path remains the source of truth for later merge or safety-blocked outcomes

## Technical Considerations
- Architectural Notes:
  - the promotion seam belongs in control-plane claim routing, not the worker prompt contract itself
  - attached-PR disambiguation and snapshot mapping should reuse the existing merge-closeout selector where practical
  - promotion refusal truth should be persisted in the claim/proof surfaces rather than only in transient logs
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `scripts/lib/pr-watch-merge.js`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts` if observability changes are needed

## Open Questions
- Resolved 2026-04-09 after audited `docs-review`: require full merge-mode readiness for the review-handoff bridge. `review=REVIEW_REQUIRED` is an explicit refusal reason because the issue should only advance into `Merging` once the attached PR is already merge-shepherd-ready.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria
- Engineering: pending audited `docs-review`
- Design: N/A
