# PRD - CO: release rehydrated Merging claims after merged PR when live Linear reads are cooldown-suppressed

## Added by Bootstrap 2026-04-09

## Traceability
- Linear issue: `CO-111` / `ff81e5d8-2760-41ec-bdbb-5509ae2faade`
- Linear URL: https://linear.app/asabeko/issue/CO-111/co-release-rehydrated-merging-claims-after-merged-pr-when-live-linear
- Source issues:
  - `CO-109` / `bb472787-be60-44e3-ac83-a3c297dab470`
  - `CO-100` / `179fd570-c493-49a7-9eaf-9222beca114a`
  - `CO-104`
  - `CO-108`

## Summary
- Problem Statement: `CO-109` merged successfully and the shared root already reconciled to merge commit `fdbead876b94fbe9894349eebcb9636e1b7caa18`, but the provider/control-host recovery path can still preserve the issue as a live rehydrated `Merging` claim when a post-merge live `linear issue-context` reread is blocked by shared-budget cooldown. In the cited incident, the local claim stayed `state: "running"`, `reason: "provider_issue_rehydrated_active_run"`, and `merge_closeout: null` even though the attached PR was already merged and `/Users/kbediako/Code/CO` was already current.
- Desired Outcome: once merged PR state plus deterministic merge-closeout evidence already proves the lane is effectively complete, refresh or rehydrate must retire or downgrade the stale `Merging` claim without waiting for a fresh successful live `issue-context` read. The resulting local claim must carry explicit machine-visible merge-closeout truth so `CO STATUS` no longer renders the merged issue as active `Merging` work.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): make merged-lane retirement deterministic after restart or rehydrate even when Linear reads are under cooldown, so operators can trust local control-host truth instead of babysitting stale `Merging` claims by hand.
- Success criteria / acceptance:
  - a rehydrated `Merging` claim does not remain `state: "running"` forever once the attached PR is already merged and the shared root is already reconciled
  - the repair does not require a fresh successful `issue-context` reread before local claim retirement or downgrade
  - `merge_closeout` or equivalent closeout truth becomes explicit and machine-visible for the cooldown-suppressed recovery path
  - `CO STATUS` stops projecting merged-complete work as active `Merging`
  - focused regression coverage includes the `CO-109` shape: merged PR, synced shared root, surviving worker run, cooldown-suppressed Linear reread, and stale local claim
- Constraints / non-goals:
  - do not reopen `CO-109` presentation-only freshness work
  - do not reopen `CO-106` rate-limit budgeting hardening
  - do not broaden into general `CO STATUS` redesign
  - do not reopen historical multi-PR ambiguity unless new evidence proves it is part of this incident

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `provider_issue_rehydrated_active_run`
  - `merge_closeout`
  - `Merging`
  - `CO STATUS`
  - `cooldown-suppressed`
  - `shared root`
  - `PR #382`
  - `fdbead876b94fbe9894349eebcb9636e1b7caa18`
- Protected terms / exact artifact and surface names:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470/cli/2026-04-08T13-24-10-989Z-40c38f47/manifest.json`
  - `.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470/cli/2026-04-08T13-24-10-989Z-40c38f47/provider-linear-worker-proof.json`
  - `.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470/cli/2026-04-08T13-24-10-989Z-40c38f47/provider-linear-worker-linear-audit.jsonl`
  - `.runs/linear-bb472787-be60-44e3-ac83-a3c297dab470/cli/2026-04-08T13-24-10-989Z-40c38f47/provider-linear-issue-context-cache.json`
- Nearby wrong interpretations to reject:
  - `CO STATUS` is stale, so this is only a renderer bug
  - if live Linear reads are cooldown-blocked, the provider must keep the merged lane as active `Merging`
  - shared-root reconciliation being complete is unrelated to provider claim retirement
  - this is just `CO-104` again

## Parity / Alignment Matrix
- Current truth:
  - `providerMergeCloseout.ts` still requires a live `issue-context` read before it can use attached-PR truth, and it currently fails closed before cached issue-context artifacts can supply the attached PR surface during cooldown
  - `providerIssueHandoff.ts` still preserves a rehydrated active run in `Merging` before authoritative merged-closeout recovery can override that state when the worker itself remains alive
  - `providerLinearWorkflowFacade.ts` already writes `provider-linear-issue-context-cache.json` beside worker artifacts, and the cited `CO-109` run kept the attached PR URL plus later merge closeout narrative there
  - the current local intake has already recovered because later live reads eventually succeeded, but the incident proves merged-lane retirement still depended on cooldown expiry instead of deterministic local evidence
- Reference truth:
  - merged PR state plus deterministic shared-root reconciliation should be enough to retire or downgrade a stale rehydrated `Merging` claim
  - control-host truth should not need a fresh successful live Linear reread before it can stop projecting merged work as active
  - machine-visible merge-closeout evidence should replace `merge_closeout: null` on this path
- Target truth / intended delta:
  - deterministic merge closeout can fall back to cached issue-context evidence when live `issue-context` reads are cooldown-suppressed
  - refresh or rehydrate can probe an active rehydrated `Merging` run for already-merged attached PR truth without treating ordinary live merge shepherding as completed
  - once authoritative merged-closeout truth is available, the claim transitions away from `state: "running"` and carries explicit `merge_closeout` details for local observability
- Explicitly out-of-scope differences:
  - general rate-limit budget redesign
  - renderer-only polish
  - unrelated workpad/comment semantics
  - historical multi-PR cleanup beyond the already-shipped deterministic selection logic

## Not Done If
- a merged lane can still survive restart or rehydrate as `provider_issue_rehydrated_active_run` in `Merging` after the PR is already merged and the shared root is already current
- `CO STATUS` still shows merged-complete work as active `Merging` only because live Linear rereads are under cooldown
- the repair still depends on manual repo sync, manual worker termination, or manual issue-state nudging to clear the stale claim

## Goals
- Release or downgrade stale rehydrated `Merging` claims once merged PR state and shared-root reconciliation are already authoritative.
- Reuse cached issue-context artifacts for deterministic merge closeout when live Linear reads are cooldown-suppressed.
- Keep merged-lane local observability machine-visible through `merge_closeout` rather than null claim metadata.
- Add focused regression coverage for the `CO-109` merged-while-cooldown-suppressed recovery shape.

## Non-Goals
- Reopening `CO-109` event/freshness presentation work.
- Reworking general Linear budgeting or cooldown policy.
- Broad `CO STATUS` redesign.
- Reopening historical attached-PR ambiguity without new evidence.

## Stakeholders
- Product: CO operators who rely on `CO STATUS` and the control host for truthful live workflow ownership
- Engineering: CO maintainers responsible for provider claim recovery, merge closeout, and observability truth
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - rehydrated merged lanes stop presenting as active `Merging`
  - merge-closeout truth is persisted on the downgraded or retired claim instead of remaining null
  - focused regressions cover both active-run recovery and cooldown-suppressed issue-context fallback
- Guardrails / Error Budgets:
  - do not treat ordinary open-PR merge shepherding as complete
  - keep the fallback bounded to cached same-run issue context and existing GitHub snapshot truth
  - keep claim transitions additive and machine-checkable

## User Experience
- Personas:
  - operator reading `CO STATUS` after a merged provider-worker lane
  - maintainer inspecting `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - reviewer validating why a rehydrated merged lane was released without a fresh live reread
- User Journeys:
  - a merged PR with shared-root reconciliation already complete is no longer shown as active `Merging` after host restart
  - cooldown-suppressed live Linear reads still leave enough local evidence to downgrade the claim and expose why
  - ordinary active `Merging` work with an open PR remains active and is not prematurely retired

## Technical Considerations
- Architectural Notes:
  - `providerLinearWorkflowFacade.ts` already owns issue-context cache persistence, so cooldown fallback should reuse that artifact instead of inventing a new store
  - `providerMergeCloseout.ts` should remain the owner of attached-PR selection and merged-closeout reasoning, even when it falls back to cached issue context
  - `providerIssueHandoff.ts` owns refresh and rehydrate ordering, so the active-run recovery bypass must be repaired there instead of papered over in observability alone
- Dependencies / Integrations:
  - GitHub PR snapshot and merge truth from `scripts/lib/pr-watch-merge.js`
  - cached Linear issue-context artifacts written beside provider-worker runs
  - shared-root git reconciliation in `/Users/kbediako/Code/CO`

## Open Questions
- Should merged-plus-shared-root-reconciled but cooldown-blocked Linear transition remain `transition_failed` locally, or should it be modeled as a distinct merged-but-transition-deferred closeout outcome? Resolve during implementation review in the smallest truthful way that still retires the stale active claim.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria
- Engineering: pending docs-review and implementation validation
- Design: N/A
