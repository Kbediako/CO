---
id: 20260411-linear-38a28769-bced-48c3-ab3b-63bf3ffdea61
title: CO: repair fresh-issue Linear workpad and PR-attachment writes
relates_to: docs/PRD-linear-38a28769-bced-48c3-ab3b-63bf3ffdea61.md
risk: medium
owners:
  - Codex
last_review: 2026-04-11
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-38a28769-bced-48c3-ab3b-63bf3ffdea61.md`
- PRD: `docs/PRD-linear-38a28769-bced-48c3-ab3b-63bf3ffdea61.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-38a28769-bced-48c3-ab3b-63bf3ffdea61.md`
- Task checklist: `tasks/tasks-linear-38a28769-bced-48c3-ab3b-63bf3ffdea61.md`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: preserve the verified fresh mutable `upsert-workpad` path while fixing the remaining `attach-pr` mutability classification seam that still leaks `attachmentLinkURL` / `Entity not found: Issue` for archived or trashed issues.
- Scope: docs-first packet creation, bounded `attach-pr` source fix, focused regression coverage, and live/workspace validation evidence for the narrowed seam.
- Constraints: keep the issue wording intact, do not redesign provider workflow, and do not broaden into unrelated Linear mutation refactors.

## Issue-Shaping Contract
- User-request translation carried forward: repair the helper surfaces named in `CO-154`, but record the truthful live finding that fresh workpad creation is already green on current main and the remaining verified defect is archived/trashed `attach-pr` behavior.
- Protected terms / exact artifact and surface names: `linear upsert-workpad`, `linear attach-pr`, `commentCreate`, `attachmentLinkURL`, `Entity not found: Issue`, `issue-context`, `transition`, `linear_issue_not_mutable`, `providerLinearWorkflowFacade.ts`, `ProviderLinearWorkflowFacade.test.ts`.
- Nearby wrong interpretations to reject:
  - "fresh mutable issue writes still fail end to end on current main"
  - "fix this by redesigning workpads or bypassing Linear writes"
  - "leave `attach-pr` returning raw GraphQL errors because the issue title mentions fresh issues"
- Explicit non-goals carried forward:
  - no provider-worker workflow redesign
  - no broad GraphQL client rewrite
  - no bypass of Linear workpad or PR traceability behavior

## Parity / Alignment Matrix
- Not applicable as a formal parity lane.
- Current truth:
  - fresh `CO-154` workpad create succeeds
  - archived/trashed `CO-36` still reproduces the raw `attach-pr` GraphQL failure
  - `upsert-workpad` already carries the explicit mutability contract
- Reference truth:
  - issue-targeted mutations should share the same fail-closed mutability/noop behavior
- Target truth / intended delta:
  - `attach-pr` honors the same non-mutable/noop contract as `upsert-workpad`
- Explicitly out-of-scope differences:
  - admission and intake behavior already covered in `CO-153`
  - generic fresh-issue workflow redesign

## Readiness Gate
- Not done if:
  - `attach-pr` still reaches GraphQL mutation on archived/trashed issues
  - mutable attach success or workpad/transition behavior regresses
  - the packet omits the live non-repro and keeps the wrong diagnosis uncorrected
- Pre-implementation issue-quality review evidence:
  - 2026-04-11 live `CO-154` `issue-context` showed a fresh `Ready` issue with no comments or attachments, `transition --state "In Progress"` succeeded, and `upsert-workpad` created the first workpad comment successfully.
  - 2026-04-11 live `CO-36` `issue-context` showed `archived_at=2026-03-29T11:24:16.308Z`, `trashed=true`, `upsert-workpad` now fails closed with `linear_issue_not_mutable`, and `attach-pr` still reproduces the raw `attachmentLinkURL` failure.
- Safeguard ownership split:
  - parent worker owns docs, implementation, live issue/workpad updates, and validation
  - docs-review child stream will provide audited pre-implementation review evidence

## Technical Requirements
- Functional requirements:
  - after the live context read and attachment dedupe/noop check, `attach-pr` must fail closed with `linear_issue_not_mutable` when the target issue is archived or trashed
  - already-attached canonical-equivalent PR URLs must remain truthful noops
  - mutable attach behavior and workpad/transition surfaces must remain unchanged
- Non-functional requirements (performance, reliability, security):
  - do not add extra Linear round trips beyond the existing `attach-pr` live context read
  - preserve current rate-limit budgeting and GitHub-vs-URL fallback behavior for mutable issues
  - keep failure classification explicit and reviewer-readable
- Interfaces / contracts:
  - `attachProviderLinearIssuePr(...)` should return the same `linear_issue_not_mutable` error shape already used by `upsert-workpad`
  - `ProviderLinearWorkflowFacade.test.ts` should cover the non-mutable attach failure and noop preservation

## Architecture & Data
- Architecture / design adjustments:
  - reuse `failureIfIssueNotMutable(...)` in `attachProviderLinearIssuePr(...)`
  - place the mutability guard after existing-attachment dedupe so noop behavior is preserved for already-satisfied attachments
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - existing Linear issue-context read
  - existing GitHub PR attachment and URL fallback mutations

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused `ProviderLinearWorkflowFacade` regressions
  - required repo validation floor proportionate to the final diff
- Rollout verification:
  - live packaged-helper proof already captured for fresh `CO-154` workpad create and archived `CO-36` failure shape
  - after the source fix, rerun the bounded archived `attach-pr` probe against `CO-36` with the built workspace helper or equivalent regression proof so the raw GraphQL error is replaced by `linear_issue_not_mutable`
- Monitoring / alerts:
  - rely on focused regression coverage and provider-worker audit/workpad notes for this bounded lane

## Open Questions
- Whether the final live archived `attach-pr` recheck should use a built workspace CLI entrypoint or remain test-backed if the provider-run helper path cannot consume workspace changes during the same worker attempt.

## Approvals
- Reviewer: pending audited docs-review
- Date: 2026-04-11
