# PRD - Coordinator Live Linear Unassigned Active-Claim Alignment and Recovery

## Added by Bootstrap 2026-03-23

## Summary
- Problem Statement: on March 23, 2026, live Linear issue `CO-3` was moved to `Merging` so CO could autonomously resolve PR `#289` branch conflicts and land the issue. Current live reads agree that `CO-3` is the tracked issue in `Merging` with `assignee_id: null`, and authenticated `/api/v1/dispatch` recommends `CO-3`. But persisted intake still keeps the only `CO-3` claim released as `provider_issue_released:assignee_changed`, and no new child run launched. This is not a new workflow-state gap or provider setup failure; it is a repo-side inconsistency between fresh dispatch ownership and existing-claim ownership/recovery.
- Desired Outcome: open a narrow docs-first remediation lane that aligns existing active claims with the already-landed fresh-dispatch ownership rule for unassigned issues, adds the smallest recovery seam needed for already-released misclassified claims to self-heal on refresh, and proves that live `CO-3` resumes autonomous merge/conflict handling without another operator state flip.
- Current Outcome Target: keep the lane bounded to provider-claim eligibility/recovery plus focused regressions, full validation, live retest, PR, feedback, merge, and clean-main closeout.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): fix the live repo-side bug blocking `CO-3` from resuming in `Merging`, do it docs-first, keep the scope truthful to current Symphony alignment, and drive the lane end to end as the orchestrator with delegated support.
- Success criteria / acceptance:
  - `1321` is registered with PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - the packet records the live contradiction precisely: `CO-3` is `Merging` and recommended by `/api/v1/dispatch`, while persisted intake still says `released:assignee_changed`
  - existing active claims no longer treat `assignee_id: null` as a reassignment away from Codex
  - already-released misclassified claims can recover on refresh without requiring another Linear state change
  - live `CO-3` resumes and autonomously handles the open `#289` merge-conflict path if the rest of the system behaves as designed
  - required validation, review, PR, CI, merge, and clean-main return complete successfully if permissions allow
- Constraints / non-goals:
  - do not widen scope into new provider features, new workflow statuses, or another broad Symphony parity audit
  - do not weaken delegation guard or execution-authority boundaries
  - do not redo Telegram, Tailscale, Funnel, webhook, or secret setup
  - do not change explicit reassignment-away behavior for issues actually assigned to another user

## Goals
- Register a truthful live-fix lane for the `CO-3` reclaim bug.
- Align existing-claim ownership with the already-landed fresh-dispatch contract for active unassigned issues.
- Add the smallest refresh recovery seam needed to reopen already-released misclassified claims at equal timestamp.
- Validate the fix with focused regressions and the full repo floor.
- Prove live `CO-3` resumes from `Merging` without another operator flip.
- Deliver the fix through PR, feedback, merge, and clean-main closeout.

## Non-Goals
- Reworking the broader `1319` workflow-state/status-map contract.
- Changing fresh-dispatch ordering or recommendation policy outside this ownership mismatch.
- Adding new tracker-write features or new provider mutation surfaces.
- Revisiting unrelated review-handoff, Telegram, or observability work.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - active unassigned claims no longer release as `provider_issue_released:assignee_changed`
  - released misclassified claims recover on refresh without needing a newer `updated_at`
  - live `CO-3` launches a fresh worker after the fix and progresses its merge/conflict workflow
  - the lane closes with green required checks and a clean `main`
- Guardrails / Error Budgets:
  - preserve explicit reassignment-away release behavior when `assignee_id` points to someone else
  - preserve current provider-intake and execution-authority boundaries
  - keep the patch limited to provider claim eligibility/recovery and focused tests

## User Experience
- Personas:
  - CO operator expecting a `Merging` issue to resume and shepherd an open PR to merge
  - maintainer auditing whether the bug is a live runtime mismatch or just stale read-model noise
- User Journeys:
  - a `Merging` issue that is still recommended by dispatch but currently stuck as released becomes reclaimable again without manual state churn
  - the operator can move an issue to `Merging` once and rely on CO to continue the merge/conflict flow

## Technical Considerations
- Architectural Notes:
  - live `issue-context` still shows `CO-3` in `Merging` / `started` with `updated_at: 2026-03-23T09:31:02.582Z`
  - live `/api/v1/dispatch` currently recommends `CO-3` and also shows `assignee_id: null`
  - persisted intake still records the `CO-3` claim as `released` with reason `provider_issue_released:assignee_changed`
  - fresh dispatch already accepts viewer-owned or unassigned issues, but existing-claim eligibility still treats `assignee_id: null` as an assignee-change release
  - current released-claim refresh logic only reopens when the live issue has a newer `updated_at`, so the already-stuck live claim needs a narrow recovery seam if the operator should not flip state again
  - current Symphony operational behavior still treats `Merging` as an active merge loop; no new Linear workflow state needs to be added for this lane
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - live local control host via `.runs/local-mcp/cli/control-host/control_endpoint.json`
  - live Linear issue `CO-3` and GitHub PR `#289`

## Open Questions
- Should equal-timestamp released-claim recovery stay refresh-only for this lane, or also be mirrored into the direct accepted-webhook replay path if later evidence shows that seam matters?
- If unassigned review-handoff states now remain owned instead of releasing as `assignee_changed`, do any downstream read surfaces or proofs need follow-up wording updates?

## Approvals
- Product: Self-approved on 2026-03-23 for a narrow live remediation lane.
- Engineering: Self-approved on 2026-03-23 based on live `CO-3` issue-context, authenticated `/api/v1/dispatch`, persisted intake state, and bounded code audit.
- Design: N/A
