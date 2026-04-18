# PRD - CO: stop review-handoff promotion from parking `In Review` issues on `multiple_attached_prs`

## Added by Docs Child Lane 2026-04-18

## Traceability
- Linear issue: `CO-237` / `9fc9fe23-bd44-4b72-9459-b5b809970bce`
- Linear URL: https://linear.app/asabeko/issue/CO-237
- MCP Task ID: `linear-9fc9fe23-bd44-4b72-9459-b5b809970bce`
- Canonical task ID: `20260418-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce`
- Canonical spec: `tasks/specs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`
- Docs packet child lane manifest: `.runs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce-co237-docs-packet/cli/2026-04-18T01-48-20-327Z-dbdc245e/manifest.json`
- Source anchor: `ctx:sha256:8391bf9a067e2de9c1d2651dbe67acb9d3c43cf6bde71c5639ee057b9ca37dfc#chunk:c000001`
- Source payload note: the parent prompt referenced `.runs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce-co237-docs-packet/cli/2026-04-18T01-48-20-327Z-dbdc245e/memory/source-0/source.txt` under `ctx:sha256:6300b9a26bbf277afc1b6ed096318a2372104963d90f62f7519ad74f90d9d6b0#chunk:c000001`, but that payload is not present in this child checkout. This packet is therefore anchored on the fallback shared source anchor plus the current repo seams in `providerMergeCloseout.ts` and `providerIssueHandoff.ts`.

## Summary
- Problem Statement: `CO-116` landed truthful review-handoff promotion into `Merging`, and `CO-104` landed historical attached-PR disambiguation for deterministic merge closeout. But provider-owned issues can still stay parked in `In Review` with `provider_issue_review_promotion_action_required` and `multiple_attached_prs` when same-repo attachments include non-primary PRs. The issue checksum now spans `CO-196` with closed `#508` and `#515`, and `CO-219` with `#523` plus auxiliary `#522`; current review-handoff promotion still treats those extra same-repo attachments as blocking ambiguity rather than bounded non-primary baggage.
- Desired Outcome: give the parent lane a bounded contract so review-handoff promotion can distinguish the truthful current candidate from superseded or auxiliary attached PRs when one real current candidate exists, preserve explicit `multiple_attached_prs` truth when ambiguity is real, and stop treating manual attachment cleanup as the intended steady state.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create the docs-first packet for `CO-237` only, using the protected issue wording and current repo seams, so the parent lane can repair the review-handoff multiple-attachment seam without drifting into broader merge-closeout, attachment-mutability, or unrelated test-blocker work.
- Success criteria / acceptance:
  - a `CO-196`-style issue does not stay in `In Review` with `provider_issue_review_promotion_action_required` only because closed `#508` and `#515` remain attached alongside the current candidate
  - a `CO-219`-style issue does not stay in `In Review` on generic `multiple_attached_prs` only because `#523` coexists with auxiliary `#522`
  - when more than one real current candidate still remains, `multiple_attached_prs` stays explicit with machine-checkable conflicting truth
  - review-handoff promotion remains explicitly separate from `Merging` closeout, but does not drift away from the same bounded attached-PR truth model
  - manual attachment cleanup is no longer required as the steady-state product path for these bounded shapes
- Constraints / non-goals:
  - child lane owns only the declared docs packet, checklist mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - parent lane owns implementation, focused validation, Linear state, workpad, PR lifecycle, and merge
  - do not reopen `CO-104` as a generic `Merging` bug, `CO-154` attachment-mutability parity, or `CO-226` full-suite timeout stabilization

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `provider_issue_review_promotion_action_required`
  - `multiple_attached_prs`
  - `In Review`
  - `review-handoff promotion`
  - `manual attachment cleanup is not the intended steady state`
  - `closed #508`
  - `#515`
  - `#523`
  - `#522`
- Protected terms / exact artifact and surface names:
  - `provider_issue_review_promotion_action_required`
  - `multiple_attached_prs`
  - `In Review`
  - `review-handoff promotion`
  - `providerMergeCloseout.ts`
  - `providerIssueHandoff.ts`
  - `CO-196`
  - `CO-219`
  - `#515`
  - `closed #508`
  - `#523`
  - `#522`
- Nearby wrong interpretations to reject:
  - this is just `CO-104` again
  - this is only a `Merging` bug
  - this is only `CO-154`
  - this is only `CO-226`
  - manual attachment cleanup is the intended steady state

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| Review-handoff promotion | `providerIssueHandoff.ts` can leave a provider-owned issue in `In Review` with `provider_issue_review_promotion_action_required` when `review-handoff promotion` inherits `multiple_attached_prs` from the shared selector | one truthful current review-handoff candidate should not be blocked by clearly non-primary same-repo attachments | review-handoff promotion can proceed when there is one truthful current candidate and only superseded or auxiliary attachments remain |
| Shared attached-PR disambiguation | `providerMergeCloseout.ts` already ignores older merged baggage from `CO-104`, but still keeps some closed or auxiliary same-repo attachments inside `multiple_attached_prs` ambiguity | one bounded selection contract should separate real ambiguity from non-primary baggage | the bounded selector or equivalent current-candidate rule distinguishes real ambiguity from superseded or auxiliary attached PRs |
| `CO-196` checksum | closed `#508` and `#515` are concrete same-repo attachment baggage for the issue family | closed superseded PRs should not permanently block later review-handoff truth | `CO-196` style closed superseded PRs no longer park the issue in `In Review` when a truthful current candidate exists |
| `CO-219` checksum | `#523` can coexist with auxiliary `#522`, creating the live non-primary attachment checksum | auxiliary attached PRs from adjacent unblocker lanes should not force generic ambiguity when they are not the current candidate | `CO-219` style auxiliary attachments stay auditable but do not force generic `multiple_attached_prs` when one truthful current candidate exists |
| Operator workflow | manual attachment cleanup is the current workaround | manual cleanup should be exceptional, not the intended product steady state | the bounded repair removes manual cleanup as the normal path while preserving explicit ambiguity when it is real |

## Acceptance Criteria
- The docs packet and checklist mirrors exist for the declared `CO-237` files only.
- The packet preserves the exact incident checksum `provider_issue_review_promotion_action_required`, `multiple_attached_prs`, `In Review`, `review-handoff promotion`, `CO-196`, closed `#508`, `#515`, `CO-219`, `#523`, and `#522`.
- Parent implementation can keep `multiple_attached_prs` fail-closed for real ambiguity while no longer requiring manual attachment cleanup for the bounded non-primary attachment shapes.
- The packet keeps this lane explicitly distinct from `CO-104`, generic `Merging` closeout, `CO-154`, and `CO-226`.

## Non-Goals
- No generic attached-PR or Linear attachment redesign.
- No re-solve of `CO-154` `attach-pr` mutability/noop parity.
- No re-solve of `CO-226` full-suite timeout stabilization.
- No docs-only claim that manual cleanup is acceptable steady state.
- No source or test edits in this docs child lane.

## Not Done If
- Review-handoff promotion can still leave `CO-196`-style or `CO-219`-style issues parked in `In Review` on generic `multiple_attached_prs` even when one truthful current candidate exists.
- The proposed repair is described only as `CO-104` reopened, only a `Merging` bug, only `CO-154`, or only `CO-226`.
- Manual attachment cleanup remains the intended steady state.
- The packet fails to preserve the exact incident checksum terms or the current repo seams.

## Stakeholders
- Product: CO operators who expect review handoff to keep moving without manual attachment cleanup.
- Engineering: provider handoff, merge closeout, and provider proof/observability maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - `CO-196` and `CO-219` style review-handoff incidents no longer stall on generic `multiple_attached_prs` when only one truthful current candidate exists
  - true ambiguity still surfaces as `multiple_attached_prs`
  - the repair stays explicitly separate from `CO-104`, `CO-154`, and `CO-226`
- Guardrails / Error Budgets:
  - preserve explicit ambiguity truth when more than one current candidate remains
  - preserve existing `CO-104` historical merged-attachment disambiguation
  - preserve the difference between review-handoff promotion and `Merging` closeout even if they share one bounded candidate-selection contract

## User Experience
- Personas:
  - operator watching a provider-owned issue move out of `In Review`
  - reviewer debugging why review-handoff promotion still refused a candidate
- User Journeys:
  - a `CO-196`-style issue with closed superseded attachments promotes from `In Review` once the truthful current candidate is ready
  - a `CO-219`-style issue with a current PR and an auxiliary blocker PR does not require manual cleanup just to clear generic ambiguity
  - a genuinely ambiguous same-repo attachment set still remains fail-closed with explicit conflicting truth

## Technical Considerations
- Architectural Notes:
  - the bounded seam is review-handoff candidate selection and its inherited ambiguity truth, not a generic Linear attachment mutation issue
  - the current repo already centralizes same-repo candidate selection in `providerMergeCloseout.ts` and consumes that result from `providerIssueHandoff.ts`
  - the repair should prefer one bounded current-candidate truth over ad hoc special cases that diverge between review-handoff and merge-closeout
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts` only if projected review-promotion proof changes

## Open Questions
- What is the smallest truthful discriminator for non-primary same-repo attachments in these bounded shapes: closed superseded state, explicit older/current lineage, issue-key intent, or another additive proof signal already available at review handoff?
- Does the bounded repair need additive persisted fields beyond existing `ignored_historical_pr_urls` and `conflicting_attached_pr_urls`, or can it stay within the current proof contract?
- Should the parent keep the selector expansion shared across review-handoff and merge-closeout immediately, or keep the first slice limited to review-handoff while preserving `CO-104` behavior unchanged elsewhere?

## Approvals
- Product: self-approved from the bounded `CO-237` issue wording carried into this packet.
- Engineering: pending parent docs-review / implementation handoff.
- Design: N/A.
