---
id: 20260418-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce
title: CO stop review-handoff promotion from parking In Review issues on multiple attached PRs
relates_to: docs/PRD-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md
risk: high
owners:
  - Codex
last_review: 2026-04-19
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`
- PRD: `docs/PRD-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`
- Task checklist: `tasks/tasks-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`

## Traceability
- Linear issue: `CO-237` / `9fc9fe23-bd44-4b72-9459-b5b809970bce`
- Source anchor: `ctx:sha256:8391bf9a067e2de9c1d2651dbe67acb9d3c43cf6bde71c5639ee057b9ca37dfc#chunk:c000001`
- Parent-provided source payload reference: `.runs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce-co237-docs-packet/cli/2026-04-18T01-48-20-327Z-dbdc245e/memory/source-0/source.txt`
- Shared source-0 note: the parent prompt referenced the payload under `ctx:sha256:6300b9a26bbf277afc1b6ed096318a2372104963d90f62f7519ad74f90d9d6b0#chunk:c000001`, but that payload is not present in this child checkout. The issue statement is therefore anchored on the fallback source anchor plus current repo seams.
- Docs packet child lane manifest: `.runs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce-co237-docs-packet/cli/2026-04-18T01-48-20-327Z-dbdc245e/manifest.json`

## Summary
- Objective: treat `CO-237` as the bounded review-handoff multiple-attachment seam where provider-owned issues can stay parked in `In Review` with `provider_issue_review_promotion_action_required` / `multiple_attached_prs` even though one truthful current PR candidate exists.
- Scope:
  - docs-first packet and bounded registry mirrors for `CO-237`
  - bounded current-candidate selection requirements for `CO-196` and `CO-219` style review-handoff incidents
  - truthful separation between real ambiguity and bounded non-primary same-repo attachments
  - explicit boundaries against "just `CO-104` again", "only a `Merging` bug", "only `CO-154`", "only `CO-226`", and manual attachment cleanup as steady state
- Constraints:
  - child lane remains docs-only
  - no runtime/test/Linear/workpad/PR mutations in this patch
  - parent owns implementation, validation, review, and integration
  - 2026-04-19 reopened-attempt implementation narrowed the live `CO-219` regression to auxiliary PR `#522` titled `CO-226: stabilize Doctor full-suite timeout lane blocking CO-219 handoff`; the bounded repair is the review-promotion cross-issue blocker wording predicate, not a generic attachment cleanup path

## Issue-Shaping Contract
- User-request translation carried forward: this is a review-handoff promotion lane, not a generic attachment or `Merging` lane. `CO-196` and `CO-219` show that provider-owned issues can still stay in `In Review` with `provider_issue_review_promotion_action_required` / `multiple_attached_prs` when same-repo attachments include closed superseded PRs or auxiliary attached PRs. The parent lane needs a bounded contract so one truthful current candidate can proceed without manual attachment cleanup while true ambiguity stays explicit.
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
- Explicit non-goals carried forward:
  - no generic Linear attachment redesign
  - no broad merge-closeout redesign
  - no `CO-154` mutability/noop parity work
  - no `CO-226` timeout/test stabilization work
  - no docs-only acceptance of manual cleanup as product behavior

## Parity / Alignment Matrix
- Current truth:
  - `providerMergeCloseout.ts` already owns same-repo attached-PR candidate selection
  - that selection can still end in `multiple_attached_prs` for bounded non-primary attachment shapes
  - `providerIssueHandoff.ts` inherits that result during `review-handoff promotion` and persists `provider_issue_review_promotion_action_required`, leaving the issue in `In Review`
  - `CO-196` and `CO-219` provide concrete real-world checksums for that seam
  - the `CO-219` / `#522` checksum uses `blocking CO-219 handoff` wording rather than the narrower exact `blocker` wording
- Reference truth:
  - one truthful current review-handoff candidate should not be blocked by clearly non-primary same-repo attachments
  - true ambiguity should remain explicit and fail-closed
  - review-handoff and merge-closeout should not drift onto conflicting candidate-selection contracts
- Target truth / intended delta:
  - bounded non-primary attachment shapes no longer park the issue in `In Review`
  - true ambiguity still remains `multiple_attached_prs`
  - manual attachment cleanup is no longer the intended steady state
- Explicitly out-of-scope differences:
  - generic `CO-104` reopening
  - `Merging`-only redesign
  - `CO-154`
  - `CO-226`

## Readiness Gate
- Not done if:
  - `CO-196` or `CO-219` style incidents can still stay parked in `In Review` on generic `multiple_attached_prs` when one truthful current candidate exists
  - the repair is described only as `CO-104`, only `Merging`, only `CO-154`, or only `CO-226`
  - manual cleanup remains the intended steady state
- Pre-implementation issue-quality review evidence:
  - 2026-04-18: child-lane review confirms the issue is narrower than generic attachment redesign and broader than "only a Merging bug". The packet must preserve the exact `provider_issue_review_promotion_action_required` / `multiple_attached_prs` checksum, the concrete `CO-196` and `CO-219` incidents, and the explicit rejection of `CO-104`, `CO-154`, `CO-226`, and manual-cleanup-as-product-solution.
- Safeguard ownership split:
  - child lane owns only the packet files and listed registry/checklist mirrors
  - parent lane owns implementation, focused tests, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and patch integration

## Technical Requirements
1. Create the docs-first packet and registry/checklist mirrors for `CO-237`.
2. Reproduce the `CO-196` checksum where closed `#508` and `#515` still participate in review-handoff ambiguity.
3. Reproduce the `CO-219` checksum where `#523` and auxiliary `#522` still participate in review-handoff ambiguity.
4. Review-handoff promotion must not keep the issue parked in `In Review` when one truthful current candidate exists and the remaining attachments are bounded non-primary baggage.
5. Real ambiguity must remain explicit as `multiple_attached_prs`.
6. Existing `CO-104` historical merged-attachment behavior and ordinary `Merging` closeout semantics must remain intact.
7. The repair must remain explicitly separate from `CO-154` and `CO-226`.

## Architecture & Data
- Architecture / design adjustments:
  - keep ownership at the shared attached-PR candidate-selection seam rather than inventing a review-only special case
  - require one bounded distinction between real current candidates and bounded non-primary same-repo attachments
  - reuse the same bounded truth wherever review-handoff promotion would otherwise persist generic `multiple_attached_prs`
  - as implemented for the reopened `CO-219` regression, review-promotion cross-issue filtering treats `block`, `blocked`, `blocker`, and `blocking` wording as blocker evidence when the attachment's leading issue key is the issue that blocks the current lane; follow-up wording remains ignored cross-issue baggage
- Expected implementation surfaces:
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts` only if additive proof or projection changes are needed
- Data model / artifact constraints:
  - preserve explicit ambiguity truth when more than one current candidate remains
  - preserve additive proof for ignored versus conflicting attachments if the parent extends the current record shape
  - do not replace bounded selection truth with manual cleanup instructions

## Validation Plan
- Child-lane checks:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `git diff --check -- docs/PRD-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/specs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md docs/TECH_SPEC-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md docs/ACTION_PLAN-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/tasks-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md .agent/task/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
  - `rg -n "provider_issue_review_promotion_action_required|multiple_attached_prs|In Review|review-handoff promotion|providerMergeCloseout.ts|providerIssueHandoff.ts|CO-196|CO-219|#515|closed #508|#523|#522|CO-104|CO-154|CO-226|manual attachment cleanup" docs/PRD-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md docs/TECH_SPEC-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md docs/ACTION_PLAN-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/specs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/tasks-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md .agent/task/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`
- Parent-lane checks:
  - focused `orchestrator/tests/ProviderMergeCloseout.test.ts` coverage for existing `CO-196` closed-prior-attempt selection and the reopened `CO-219` / `#522` `blocking CO-219 handoff` selection shape
  - shared review-promotion helper coverage is sufficient for `providerIssueHandoff.ts` in this slice because the handoff surface already delegates to `runProviderReviewHandoffPromotion`; add handoff integration coverage only if the handoff call contract changes
  - focused `orchestrator/tests/ProviderIssueObservability.test.ts` only if proof output changes
  - parent-owned `node scripts/spec-guard.mjs --dry-run`
  - parent-owned docs-review before implementation
- Rollback plan:
  - revert the bounded current-candidate rule if it hides real ambiguity, broadens into `CO-154` / `CO-226`, or reopens `CO-104` wholesale

## Open Questions
- What is the smallest truthful signal for bounded non-primary attachments in these incidents: closed superseded state, older/current lineage, issue-key intent, or another additive proof source already available at review handoff?
- Does the parent need additive fields beyond current ignored/conflicting URL lists to keep the distinction auditable?
- Should the first parent slice remain review-handoff-only or expand the shared selector immediately while preserving `CO-104` semantics?

## Approvals
- Reviewer: docs child lane self-review for packet shape and issue boundaries.
- Date: 2026-04-18
