# PRD - CO: prevent archived or trashed Linear issues from being claimed or mutated as active provider lanes

## Added by Bootstrap 2026-04-11

## Traceability
- Linear issue: `CO-153` / `acc07ffc-06ac-4649-a235-1bf37c13cc51`
- Linear URL: https://linear.app/asabeko/issue/CO-153/co-prevent-archived-or-trashed-linear-issues-from-being-claimed-or
- Related lanes:
  - `CO-32` / `linear-9fcfa59a-e5fb-47b2-a7fe-2f83738147ff`
  - `CO-101` / `linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd`
  - `CO-152` / `linear-0d66d189-fc51-4054-80db-b6990858f33d`

## Summary
- Problem Statement: the provider intake/runtime currently treats archived or trashed Linear issues as ordinary active work when their workflow state still looks eligible. `CO-32` proved the failure mode: issue-context reads succeeded, transition/workpad mutations drifted into partial success/failure, and the active lane could not maintain the required single-workpad audit trail because Linear refused comment writes on an archived issue.
- Desired Outcome: archived or trashed issues are excluded or explicitly blocked before claim/start, provider issue-context/cache and mutation helpers carry truthful mutability state, restored issues revalidate live before resuming, and deterministic retry/proof surfaces stop telling the worker to repeat impossible writes in the same attempt.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): re-home the good CO-32 mutability work into a fresh CO-153 packet, but finish the missing admission piece so the control host never treats archived/trashed issues as normal active provider lanes. The bounded fix must preserve current behavior for active mutable issues, preserve truthful noops when no write is needed, and allow restored issues to recover without stale cache poison.
- Success criteria / acceptance:
  - provider issue discovery/intake excludes or blocks archived/trashed issues before claim/start
  - issue-context/cache surfaces expose `archived_at` and `trashed`
  - `transition` and `upsert-workpad` fail closed with `linear_issue_not_mutable` before any real write, while idempotent noops still succeed
  - restored issues revalidate live and resume normal mutation
  - worker prompt, selected-run summary, and provider proof summaries suppress same-attempt retries for `linear_issue_not_mutable`
  - focused tests cover live archived failure, cached archived revalidation, restored success, idempotent archived noop, prompt/summary suppression, and intake admission exclusion
  - the required validation floor is rerun under the fresh CO-153 task id
- Constraints / non-goals:
  - do not mutate CO-32 or reuse its docs packet verbatim
  - do not widen into generic workpad redesign or broader provider-worker refactors
  - do not drop the existing `CO-68` snapshot from `docs/TASKS.md`

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `prevent archived or trashed Linear issues from being claimed or mutated as active provider lanes`
  - `linear_issue_not_mutable`
  - `archivedAt` / `trashed`
  - `Restored issues are revalidated live`
  - `suppress same-attempt deterministic retries`
- Protected terms / exact artifact and surface names:
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `ProviderLinearWorkflowFacade.test.ts`
  - `ProviderIssueHandoff.test.ts`
  - `LinearDispatchSource.test.ts`
- Nearby wrong interpretations to reject:
  - "only classify mutation failures and leave intake able to claim archived issues"
  - "auto-unarchive or recover archived issues"
  - "copy the CO-32 docs packet and treat it as the active implementation lane"
  - "treat archived issues as generic inactive-state drift without preserving explicit mutability truth"

## Parity / Alignment Matrix
- Not applicable as a formal parity lane. This is an admission-and-mutability truth lane.
- Current truth:
  - `linearDispatchSource.ts` reads and sorts eligible issues by workflow state/ownership only.
  - `providerIssueHandoff.ts` can claim or continue active work for an archived issue if its state still looks active.
  - `providerLinearWorkflowFacade.ts` currently lacks explicit `archived_at` / `trashed` truth in issue-context/summary/cache and therefore cannot fail closed before every mutation path.
  - deterministic suppression surfaces already exist, but `linear_issue_not_mutable` is not yet classified as a same-attempt no-retry condition.
- Reference truth:
  - archived or trashed issues are non-mutable provider lanes even if their workflow state still looks active.
  - restored issues should recover after a live reread instead of being blocked forever by stale cached mutability.
- Target truth / intended delta:
  - tracked issues, cached issue-context, and direct mutation helpers all carry explicit mutability truth.
  - intake/claim/start paths fail closed before archived or trashed issues become active provider lanes.
  - worker-facing summaries suppress deterministic same-attempt retries for `linear_issue_not_mutable`.
- Explicitly out-of-scope differences:
  - automatic restore/unarchive automation
  - generic workpad formatting changes
  - unrelated control-host ownership or GitHub review-budget work

## Not Done If
- Archived or trashed issues can still be claimed from `Ready`/provider intake as normal active lanes.
- The fix only changes mutation failure classification but leaves control-host admission able to start archived/non-mutable work.
- Active non-archived issues regress in transition or workpad behavior.
- Cached archived state blocks a restored issue without a live revalidation path.
- Validation remains checklist-only without fresh CO-153 artifacts.

## Goals
- Carry explicit mutability truth through tracked issue discovery, issue-context/summary reads, and cached issue-context state.
- Block archived/trashed issues before claim/start and before transition/workpad writes.
- Preserve truthful idempotent noops when the desired state/workpad already matches.
- Revalidate cached archived state live so restored issues can resume.
- Suppress deterministic same-attempt retries for `linear_issue_not_mutable`.

## Non-Goals
- Auto-restoring archived or trashed Linear issues.
- Broad provider-worker lifecycle redesign beyond admission and mutability truth.
- Generic workpad UX or formatting changes.
- Any mutation of `CO-32` as the implementation issue.

## Stakeholders
- Product: CO operators and control-host owners who need truthful active-lane admission.
- Engineering: provider intake, provider worker lifecycle, Linear workflow facade, and observability maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - archived/trashed tracked issues do not produce fresh dispatch recommendations or accepted provider claims
  - mutation helpers return `linear_issue_not_mutable` before real writes on archived/trashed issues
  - restored issues succeed after live revalidation
  - worker prompt and selected-run summaries stop instructing same-attempt retries for archived mutations
- Guardrails / Error Budgets:
  - do not regress active mutable issue behavior
  - keep no-op behavior for already-correct workpad/state targets
  - keep the fix scoped to admission, mutability truth, and deterministic suppression

## User Experience
- Personas:
  - control-host/operator relying on truthful provider intake
  - provider worker continuing an active issue attempt
  - reviewer/operator reading selected-run or proof summaries after a failed mutation
- User Journeys:
  - an archived issue still sitting in an active workflow state is discovered during intake and is ignored before claim/start.
  - a cached archived issue is restored; the next mutation helper rereads live truth and resumes normally.
  - a worker attempt that hit `linear_issue_not_mutable` shows an explicit same-attempt suppression instead of repeating the same impossible command.

## Technical Considerations
- Architectural Notes:
  - reuse the preserved CO-32 mutability-side changes selectively rather than rewriting them from scratch
  - add the missing admission boundary in tracked issue discovery/handoff rather than relying only on mutation helpers
  - prefer additive truth fields and explicit fail-closed checks over implicit GraphQL write failure interpretation
- Dependencies / Integrations:
  - Linear tracked-issue discovery GraphQL queries
  - provider intake claim persistence
  - provider issue-context cache
  - selected-run/proof summary derivation

## Open Questions
- Whether the initial stalled docs child lane can be invalidated cleanly or should simply be superseded by a later successful bounded child lane on a disjoint implementation slice.

## Approvals
- Product: Linear issue `CO-153`
- Engineering: pending audited docs-review
- Design: N/A
