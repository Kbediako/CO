# PRD - CO: repair fresh-issue Linear workpad and PR-attachment writes

## Added by Bootstrap 2026-04-11

## Traceability
- Linear issue: `CO-154` / `38a28769-bced-48c3-ab3b-63bf3ffdea61`
- Linear URL: https://linear.app/asabeko/issue/CO-154/co-repair-fresh-issue-linear-workpad-and-pr-attachment-writes
- Related lanes:
  - `CO-36` / `linear-9c4053e5-c4c5-4651-b436-71f7dbdf853e`
  - `CO-153` / `linear-acc07ffc-06ac-4649-a235-1bf37c13cc51`

## Summary
- Problem Statement: the original `CO-36` duplicate-closeout incident looked like a fresh-issue helper break because `linear issue-context` and `linear transition` succeeded while `linear upsert-workpad` and `linear attach-pr` failed with upstream issue-target errors. Live verification on 2026-04-11 narrows that diagnosis: fresh `CO-154` workpad creation succeeds on the required packaged helper, `CO-36` now reads as archived and trashed, `upsert-workpad` already fails closed with `linear_issue_not_mutable`, and the remaining live defect is `attach-pr` still falling through to `attachmentLinkURL` and returning `Entity not found: Issue` for the same non-mutable issue surface.
- Desired Outcome: preserve the verified fresh mutable write path, keep existing transition/workpad behavior intact, and align `attach-pr` with the existing mutability/noop contract so archived or trashed issues fail closed before GraphQL attachment mutation while active mutable issues keep their current PR-attachment behavior.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): repair the packaged Linear helper so the workpad and PR-attachment surfaces behave truthfully on the same issue identity surface, using bounded live reproduction or contract fixtures and without redesigning the provider-worker workflow. The packet must preserve the original issue wording while recording the now-verified narrower defect.
- Success criteria / acceptance:
  - a bounded reproduction captures the currently live failure shape and distinguishes it from the disproved fresh-issue hypothesis
  - fresh `linear upsert-workpad` creation on `CO-154` remains green
  - `attach-pr` no longer leaks raw `attachmentLinkURL` / `Entity not found: Issue` for archived or trashed issues and instead fails closed with the repo's mutability contract
  - existing mutable attach success, workpad update/create, and transition paths remain green in regression coverage
- Constraints / non-goals:
  - do not redesign the provider-worker Linear workflow
  - do not broaden into a generic Linear API client rewrite
  - do not bypass Linear by suppressing workpad or PR traceability writes entirely

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `linear upsert-workpad`
  - `linear attach-pr`
  - `commentCreate`
  - `attachmentLinkURL`
  - `Entity not found: Issue`
  - `issue-context`
  - `transition`
  - `CO-36`
- Protected terms / exact artifact and surface names:
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
  - `linear_issue_not_mutable`
  - `CO-154`
  - `CO-36`
- Nearby wrong interpretations to reject:
  - "fresh mutable issue writes are still broadly broken on current main"
  - "this is another same-issue child-lane runtime issue"
  - "redesign workpad structure or PR readiness policy"
  - "treat a raw GraphQL attachment failure as sufficient instead of the repo's explicit mutability contract"

## Parity / Alignment Matrix
- Not applicable as a formal parity lane. This is a bounded helper-behavior alignment lane.
- Current truth:
  - fresh `linear upsert-workpad` on `CO-154` succeeds and creates the first workpad comment through the required packaged helper
  - `CO-36` currently reads as `archived_at=2026-03-29T11:24:16.308Z` and `trashed=true`
  - `upsert-workpad` already returns `linear_issue_not_mutable` on that non-mutable issue surface
  - `attach-pr` still reaches `attachmentLinkURL` and returns upstream `Entity not found: Issue`
- Reference truth:
  - helper mutation surfaces that target issue identity should share the same truthful mutability/noop contract
  - non-mutable issues should fail closed before write mutations
  - already-satisfied noops should remain noops
- Target truth / intended delta:
  - `attach-pr` matches the mutability/noop behavior already used by `upsert-workpad`
  - fresh mutable workpad and PR-attachment behavior stays intact
- Explicitly out-of-scope differences:
  - provider-worker runtime redesign
  - generic Linear GraphQL refactors unrelated to the attachment mutation seam
  - broad archived-issue admission work already tracked in `CO-153`

## Not Done If
- `attach-pr` still returns raw `attachmentLinkURL` / `Entity not found: Issue` on an archived or trashed issue.
- Fresh `linear upsert-workpad` creation regresses on a comment-less issue.
- Existing workpad-update, transition, or mutable attachment success paths regress.
- The packet pretends the original fresh-issue hypothesis is still current despite live non-repro evidence.

## Goals
- Preserve the issue's original requested surfaces and acceptance language while recording the truthful narrowed diagnosis.
- Align `attach-pr` mutability handling with current `upsert-workpad` behavior.
- Keep existing mutable workpad and transition behavior unchanged.
- Add focused regression coverage for the verified live seam.

## Non-Goals
- Redesigning provider-worker issue workflow, workpad layout, or PR readiness policy.
- Broad Linear API client rewrites beyond the bounded attachment mutability path.
- Mutating archived `CO-36` beyond fail-closed verification.

## Stakeholders
- Product: CO operators relying on provider-worker workpads and PR traceability.
- Engineering: Linear helper, provider workflow facade, and review/handoff maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - fresh mutable workpad create stays green
  - archived/trashed `attach-pr` returns `linear_issue_not_mutable` before mutation
  - focused attach/workpad/transition regressions pass
- Guardrails / Error Budgets:
  - do not regress existing mutable attach success or no-op behavior
  - do not weaken the repo's explicit mutability contract into opaque upstream errors

## User Experience
- Personas:
  - provider worker maintaining the single Linear workpad and optional PR traceability
  - reviewer/operator reading issue closeout and mutation failure evidence
- User Journeys:
  - a fresh issue with no workpad comment can still create its first `## Codex Workpad`
  - an archived or trashed issue fails closed with an explicit mutability error instead of an opaque attachment GraphQL failure
  - an already-attached PR remains a truthful no-op

## Technical Considerations
- Architectural Notes:
  - the current live defect is narrower than the issue title; the packet must preserve the title while steering implementation to the verified seam
  - `attach-pr` already reads live issue context and dedupes existing attachments before mutation; the missing behavior is an explicit mutability guard before attachment GraphQL writes
  - keep parity with `upsert-workpad` by allowing noop outcomes to remain noop before mutability rejection
- Dependencies / Integrations:
  - Linear issue-context GraphQL query
  - Linear GitHub PR attachment mutation
  - Linear URL attachment fallback mutation

## Open Questions
- Whether live mutable `attach-pr` proof should wait for the real handoff PR instead of attaching an unrelated probe URL during investigation. Current plan: rely on existing mutable attach regressions now and use the real issue PR for live proof later if a code PR is opened.

## Approvals
- Product: Linear issue `CO-154`
- Engineering: pending audited docs-review
- Design: N/A
