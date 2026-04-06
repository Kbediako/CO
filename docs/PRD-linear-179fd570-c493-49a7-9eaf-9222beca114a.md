# PRD - CO: Make shared-root reconciliation deterministic after merged closeout, including resumed Merging active-run recovery

## Added by Bootstrap 2026-04-06

## Traceability
- Linear issue: `CO-100` / `179fd570-c493-49a7-9eaf-9222beca114a`
- Linear URL: https://linear.app/asabeko/issue/CO-100/co-make-shared-root-reconciliation-deterministic-after-merged-closeout
- Source issues:
  - `CO-98` / `bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc`
  - `CO-80` / `7bb1895e-cda2-4173-86ec-c6794ccb1ce7`
  - `CO-40`

## Summary
- Problem Statement: merged Linear lanes can still leave the shared local `/Users/kbediako/Code/CO` checkout behind `origin/main` without an authoritative operator-facing reason. One seam is intentional safe-skip behavior inside deterministic merge closeout when the shared root is not exact clean `main` or not `--ff-only` safe. The second seam is worse: in the `CO-98` incident, refresh appears to have rehydrated a resumed `activeRun` claim for a `Merging` issue and continued before deterministic merge closeout ran, so the shared-root reconciliation step never executed at all.
- Desired Outcome: a merged issue either leaves the shared root reconciled to `origin/main` automatically or records an explicit durable pending/skipped/failed shared-root reconciliation outcome with the exact reason. Resumed `Merging` `activeRun` recovery must not bypass deterministic merge closeout, and one authoritative operator-visible surface must expose the shared-root truth directly.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish the closeout seam left after `CO-80` and the `CO-98` incident, so operators can trust that a successfully merged issue makes the shared root immediately usable, or tells them exactly why it is not yet usable, without manual repo babysitting or inference from stale runtime state.
- Success criteria / acceptance:
  - deterministic merge closeout preserves the existing dirty/non-`main` safety guard while recording a durable pending shared-root reconciliation outcome when sync is skipped
  - refresh / rehydrate for `Merging` issues cannot keep a resumed `activeRun` claim alive in a way that bypasses deterministic merge closeout
  - when the shared root is exact clean `main`, merged closeout fast-forwards `/Users/kbediako/Code/CO` to `origin/main` automatically
  - when the shared root is unsafe to mutate, the operator can see one authoritative pending/skipped/failed reconciliation surface with the exact reason
  - regression coverage includes both the safe-skip dirty-root behavior and the `CO-98` resumed-active-run bypass shape
- Constraints / non-goals:
  - do not force mutation of a dirty, detached, or non-`main` shared checkout
  - do not reopen the full `CO-40` stale-success lane
  - do not widen into broad workspace-management redesign
  - do not rely on docs/workpad wording alone without control-host / merge-closeout behavior changes

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `shared-root reconciliation`
  - `deterministic merge closeout`
  - `provider_issue_rehydrated_active_run`
  - `merge_closeout`
  - `Merging`
  - `origin/main`
  - `--ff-only`
  - `/Users/kbediako/Code/CO`
  - `CO-80`
  - `CO-98`
  - `CO-40`
- Protected terms / exact artifact and surface names:
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `.runs/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc/cli/2026-04-05T13-28-33-430Z-59a051c2/manifest.json`
  - `.runs/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc/cli/2026-04-05T13-28-33-430Z-59a051c2/provider-linear-worker-proof.json`
  - `.runs/linear-bbc5ad99-0806-4b13-a8fc-0b49b0e8a9bc/cli/2026-04-05T13-28-33-430Z-59a051c2/provider-linear-worker-linear-audit.jsonl`
- Nearby wrong interpretations to reject:
  - the existing safe-skip-on-dirty-root behavior means no follow-up is needed
  - once the shared root was dirty, operators should always reconcile manually forever
  - a `Merging` claim with a rehydrated `activeRun` is good enough even if merge closeout never runs
  - docs or workpad wording alone can solve this without code changes in closeout or refresh logic

## Parity / Alignment Matrix
- Current truth:
  - `providerMergeCloseout.ts` already persists `shared_root.status`, `reason`, and before/after branch status, but merged closeout still returns the generic `merged` status and the exact shared-root reason is not promoted as an operator-facing pending-vs-complete signal
  - `providerIssueHandoff.ts` can run deterministic merge closeout in some refresh/recovery paths, but refresh still prioritizes rehydrated `activeRun` ownership in paths that can leave a `Merging` issue parked without invoking merge closeout first
  - `providerIssueObservability.ts` currently treats merged closeout as fully completed with `no_action` even when `shared_root.status === skipped`, and it does not project the exact shared-root reason in the debug PR snapshot
  - the shared root can therefore remain stale after a successful merge while the operator-facing progress surface still looks complete
- Reference truth:
  - a merged issue should leave the shared root reconciled or explicitly pending reconciliation
  - deterministic merge closeout must run even when recovery sees a resumed `activeRun` for a `Merging` issue
  - operator-visible truth should distinguish merged-and-usable from merged-but-pending-reconciliation
- Target truth / intended delta:
  - merged closeout records an explicit durable pending shared-root reconciliation outcome when it skips mutation for safety reasons
  - refresh / rehydrate paths for `Merging` issues invoke deterministic merge closeout before preserving a resumed `activeRun` claim when closeout is now authoritative
  - the operator-facing debug/progress surface exposes shared-root status and exact reason directly, and marks merged+skipped reconciliation as pending action rather than silently complete
- Explicitly out-of-scope differences:
  - force-mutating unsafe shared checkouts
  - redesigning general PR merge policy
  - reopening unrelated stale-success or workspace-management lanes

## Not Done If
- a merged lane can still leave `/Users/kbediako/Code/CO` behind `origin/main` without a durable machine-readable reason
- a resumed or retried `activeRun` on a `Merging` issue can still prevent deterministic merge closeout from ever running
- the only operator path to know whether the shared root is usable remains manual git inspection
- tests still do not cover the resumed-active-run `Merging` bypass shape seen on `CO-98`

## Goals
- Make shared-root reconciliation truth authoritative after merged closeout.
- Prevent `Merging` rehydrate/refresh from bypassing deterministic merge closeout.
- Promote exact shared-root skip/pending/failure reason into one operator-facing surface.
- Cover the recovery-ordering and shared-root-visibility regressions with focused tests.

## Non-Goals
- Force-updating unsafe shared checkouts.
- Reworking the entire provider lifecycle.
- Reopening the full `CO-40` stale-success lane.

## Stakeholders
- Product: CO operators who expect merged issues to be usable immediately from the shared root
- Engineering: CO maintainers responsible for control-host truth, merge closeout, and provider observability
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - merged closeout fast-forwards the shared root automatically when it is safe
  - merged closeout exposes a durable pending/skipped/failed reconciliation reason when it is not safe
  - `Merging` recovery paths no longer mask or bypass deterministic merge closeout
- Guardrails / Error Budgets:
  - preserve fail-closed behavior for dirty, detached, non-`main`, or non-`ff-only` shared-root states
  - keep the fix metadata-driven and operator-visible rather than prompt-only
  - prefer the smallest change set that repairs recovery ordering and observability truth together

## User Experience
- Personas:
  - operator using `/Users/kbediako/Code/CO` immediately after an autonomous merge
  - maintainer inspecting provider/control-host status after restart or refresh recovery
  - reviewer validating why a merged issue did or did not reconcile the shared root
- User Journeys:
  - a merged issue on a clean shared root fast-forwards `main` and reports reconciled shared-root closeout
  - a merged issue on an unsafe shared root reports pending/skipped reconciliation with the exact reason
  - a restart or refresh that rehydrates a `Merging` active run still executes deterministic merge closeout before treating the issue as merely owned/running again

## Technical Considerations
- Architectural Notes:
  - `providerMergeCloseout.ts` already owns the post-merge shared-root reconciliation contract, so the pending/skipped shared-root truth should remain anchored there
  - `providerIssueHandoff.ts` owns refresh and rehydrate ordering, so the `Merging` active-run recovery bypass must be repaired there instead of papered over in docs
  - `providerIssueObservability.ts` already derives the operator-facing progress snapshot and debug PR view, so it is the right place to expose pending shared-root reconciliation as authoritative status
- Dependencies / Integrations:
  - GitHub PR closeout snapshots and merge result data already used by deterministic merge closeout
  - Linear issue state recovery and claim persistence in the provider intake state
  - shared local root checkout at `/Users/kbediako/Code/CO`

## Open Questions
- Resolved during implementation review: merged-but-skipped shared-root reconciliation now records top-level `action_required` with `pending_shared_root_reconciliation` and keeps the issue in `Merging` so deterministic closeout can retry once the shared root becomes safe, rather than transitioning to `Done` with an unrecoverable pending state.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria
- Engineering: pending docs-review and implementation validation
- Design: N/A
