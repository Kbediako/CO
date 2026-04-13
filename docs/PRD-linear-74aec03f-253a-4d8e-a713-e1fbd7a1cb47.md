# PRD - CO: stop stale review and dead-claim reconciliation from burning Linear requests

## Traceability
- Linear issue: `CO-159` / `74aec03f-253a-4d8e-a713-e1fbd7a1cb47`
- Linear URL: https://linear.app/asabeko/issue/CO-159/co-stop-stale-review-and-dead-claim-reconciliation-from-burning-linear
- Related landed slices: `CO-144`, `CO-156`
- Evidence issues: `CO-139`, `CO-96`

## Summary
- Problem Statement: even after `CO-156` landed and the local control host restarted on the rebuilt main checkout, restart and reconcile still burned hundreds of Linear requests while there were no useful runnable worker slots. The observed burn clustered around `dispatch_source_issue_by_id`, `dispatch_source_tracked_issues:fresh_discovery`, and `provider-linear:issue-context:read-issue-context`, with two stale local truths driving repeated live reads: `CO-139` remained a dead `In Progress` / `running` claim with a stale PID and in-progress manifest, while `CO-96` remained a completed review-handoff claim with a stale wrapper failure while external review or checks were still pending.
- Desired Outcome: make dead active claims and completed review-handoff claims fail closed from cached manifest or proof evidence before repeated live Linear reads, and make restart or recovery perform at most one bounded refresh before falling back to cached local state when no runnable work exists or request headroom is below reserve.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-159` by preserving the webhook-first targeted reconcile and shared request-headroom governor already landed, while stopping stale review claims, dead active claims, and no-work recovery sweeps from repeatedly burning live Linear requests. The fix should keep workpads, PR attachment, review handoff, and merge closeout intact, and it should preserve salvageable paused workspaces and child-lane artifacts instead of killing them.
- Success criteria / acceptance:
  - review-state claims whose worker already reached review handoff do not schedule provider retry or repeated live refresh loops while external PR checks or review are pending
  - dead-PID active claims are released or paused locally from proof or manifest evidence before repeated `dispatch_source_issue_by_id` reads
  - restart or recovery performs at most one bounded snapshot refresh, then fails closed to cached state when no runnable work exists or headroom is below reserve
  - regression tests cover the `CO-139` dead active claim path and the `CO-96` completed review-handoff stale wrapper path
  - request-burn telemetry can attribute review or stale-claim reconciliation separately from useful runnable worker operations
- Constraints / non-goals:
  - preserve `CO-144` webhook-first targeted reconcile behavior
  - preserve `CO-156` shared request-headroom governor behavior
  - do not weaken Linear integration, workpads, PR attachment, review handoff, or merge closeout
  - treat raw Linear requests as the scarce resource

## Intent Checksum
- Exact user wording / phrases to preserve:
  - "stop stale review and dead-claim reconciliation from burning Linear requests"
  - "webhook-first targeted reconcile"
  - "shared request-headroom governor"
  - "dead active worker PID"
  - "completed review-handoff claim"
  - "fails closed to cached state"
- Protected terms / exact artifact and surface names:
  - `CO-144`
  - `CO-156`
  - `CO-139`
  - `CO-96`
  - `dispatch_source_issue_by_id`
  - `dispatch_source_tracked_issues:fresh_discovery`
  - `provider-linear:issue-context:read-issue-context`
  - `In Progress`
  - `In Review`
  - `Human Review`
  - `providerIssueHandoff`
  - `controlServerPublicLifecycle`
  - `linearDispatchSource`
- Nearby wrong interpretations to reject:
  - only lower the active `In Progress` cap
  - only change `CO STATUS` attachment behavior
  - revert or replace `CO-156`
  - move dead claims back to `Ready` as the fix
  - rely on manual launchd stops or manual Linear state edits as the steady-state control

## Parity / Alignment Matrix
- Not applicable. This is a bounded stale-claim and review-wait reconciliation lane, not a parity or alignment migration.
- Current truth:
  - `providerIssueHandoff.ts` already has stale-proof and review-handoff promotion logic, but restart and refresh can still spend repeated live issue reads when stale claims stay locally active or review-wait claims stay refreshable
  - `controlServerPublicLifecycle.ts` can still reach full recovery or fresh discovery when there is no runnable work and cached truth is already sufficient
  - `linearDispatchSource.ts` exposes request-burn sources that show the repeated live read paths
- Reference truth:
  - stale local claims should be downgraded, paused, or ignored from manifest/proof evidence before repeated live reads
  - review-wait claims should remain locally visible without triggering provider retries while external checks or reviewers are pending
  - no-work restart or recovery should do one bounded refresh and then stop spending requests
- Target truth / intended delta:
  - dead active claims fail closed to paused or released local state without repeated issue-by-id reads
  - review-handoff wait claims stay locally classified as review-wait without retry or refresh churn
  - startup and recovery use one bounded refresh and then cached truth when there is no runnable work or reserve is low
  - request-burn telemetry clearly labels review-wait and stale-claim reconciliation
- Explicitly out-of-scope differences:
  - replacing Linear as a provider
  - weakening workpad, PR attachment, review handoff, or merge closeout
  - deleting salvageable paused workspaces or child-lane artifacts

## Not Done If
- A completed review-handoff claim with a stale wrapper failure can keep scheduling provider retries or issue-context reads while PR checks are pending.
- A dead active worker PID can remain `running` and trigger repeated `dispatch_source_issue_by_id` reads instead of being locally released or paused from cached proof and manifest evidence.
- Fresh discovery or recovery sweep still runs repeatedly while there are no runnable active issues or while request headroom is below reserve.
- `CO STATUS` still needs live Linear reads to distinguish paused stale claims, review wait, and runnable workers.
- Operators still need to manually move stale claims or stop launchd to preserve the Linear request bucket.

## Goals
- Keep stale claim and review-wait reconciliation local-first when manifest and proof evidence is already authoritative enough.
- Bound restart or recovery to one live snapshot refresh before cached fail-closed behavior when no useful runnable work exists.
- Add explicit attribution for review-wait and stale-claim reconciliation burn so operators can distinguish waste from useful work.
- Preserve paused workspaces and child-lane artifacts so stale work can resume later.

## Non-Goals
- Replacing Linear or removing request-budget accounting.
- Broadly redesigning provider-worker scheduling.
- Weakening review-state handoff or merge-closeout requirements.
- Fixing unrelated docs budget failures beyond preventing them from causing request burn loops.

## Stakeholders
- Product: CO operator / provider-worker owner
- Engineering: control-host lifecycle, provider issue handoff, Linear dispatch source, workflow facade, and telemetry maintainers
- Design: N/A

## Technical Considerations
- Architectural Notes:
  - the narrow owner likely spans `providerIssueHandoff.ts`, `controlHostCliShell.ts`, `controlServerPublicLifecycle.ts`, and `linearDispatchSource.ts`
  - the most likely implementation strategy is to make stale-proof or review-wait cached truth authoritative earlier, not to add a second scheduling system
  - request-burn attribution should remain machine-checkable and bounded inside existing budget or status surfaces
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`

## Open Questions
- Whether the cleanest fix is to reuse cache-aware issue-context reads for tracked issue refresh, or to make the tracked issue refresh path itself stale-aware enough that repeated live reads are suppressed without changing helper contracts.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria
- Engineering: pending docs-review child stream and implementation validation
- Design: N/A
