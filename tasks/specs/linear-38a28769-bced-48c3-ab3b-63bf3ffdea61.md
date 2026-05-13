---
id: 20260411-linear-38a28769-bced-48c3-ab3b-63bf3ffdea61
title: CO: repair fresh-issue Linear workpad and PR-attachment writes
status: done
owner: Codex
created: 2026-04-11
last_review: 2026-05-12
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-linear-38a28769-bced-48c3-ab3b-63bf3ffdea61.md
related_action_plan: docs/ACTION_PLAN-linear-38a28769-bced-48c3-ab3b-63bf3ffdea61.md
related_tasks:
  - tasks/tasks-linear-38a28769-bced-48c3-ab3b-63bf3ffdea61.md
review_notes:
  - 2026-04-11: Opened from Linear issue `CO-154` in the provider-worker workspace after rechecking live CO workflow states with the packaged `linear issue-context` helper, recording the required same-turn `stay_serial` / `single_bounded_change` parallelization decision, moving the issue from `Ready` to `In Progress`, creating the single persistent `## Codex Workpad`, and switching the detached workspace onto branch `linear/co-154-attach-pr-mutability-guard`.
  - 2026-04-11: Fresh live verification disproved the broad reported hypothesis. `linear upsert-workpad` on `CO-154` succeeded and created the first workpad comment, so fresh mutable workpad creation is not broken on current main.
  - 2026-04-11: Live incident verification narrowed the remaining defect. `CO-36` now reads as archived and trashed; `linear upsert-workpad` on `CO-36` fails closed with `linear_issue_not_mutable`, but `linear attach-pr` still reproduces the raw `attachmentLinkURL` / `Entity not found: Issue` error.
  - 2026-04-11: Pre-implementation issue-quality review approves a bounded scope change from "fresh issue writes are broken" to "align `attach-pr` mutability/noop handling with the existing helper contract while preserving the verified fresh mutable path." No broader provider workflow redesign is justified.
  - 2026-05-12: CO-523 live Linear audit verified CO-154 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: .runs/linear-8573da42-d9f9-44ce-a24e-224984539044/cli/2026-05-12T18-47-35-293Z-376d8842/provider-linear-issue-context-cache-38a28769-bced-48c3-ab3b-63bf3ffdea61.json.
---

# Technical Specification

## Context
The current `CO-154` issue description was grounded in a real incident, but the fresh 2026-04-11 live state is more specific than the original report. Fresh mutable workpad creation now works on `CO-154`; the exact upstream `Entity not found: Issue` error survives only on the archived/trashed `CO-36` `attach-pr` path. `upsert-workpad` already returns the repo's explicit `linear_issue_not_mutable` error for the same non-mutable issue, so the remaining gap is contract parity inside `attach-pr`.

## Requirements
1. The docs packet and workpad must preserve the original issue wording while recording the live fresh-issue non-repro and the narrowed archived/trashed attachment defect.
2. `attach-pr` must return `linear_issue_not_mutable` before any attachment mutation when the target issue is archived or trashed.
3. `attach-pr` must still noop when a canonical-equivalent PR attachment already exists, even on a non-mutable issue.
4. Existing mutable attach success, fresh workpad create/update, and transition behavior must remain green.

## Design
- Reuse `failureIfIssueNotMutable(...)` in `attachProviderLinearIssuePr(...)`.
- Keep the mutability check after the existing-attachment dedupe path so already-attached PR URLs remain truthful noops.
- Avoid adding extra reads or changing the rate-limit/fallback logic for mutable issues.
- Add focused facade tests for:
  - archived/trashed issue attach failure classification
  - archived existing-attachment noop preservation

## Implementation Surface
- Expected codepaths:
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- Expected tests:
  - `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`

## Protected Expectations
- Do not regress the verified fresh `CO-154` workpad create path.
- Do not redesign workpad structure, PR readiness policy, or broader provider workflow.
- Do not broaden into `CO-153` admission work already tracked elsewhere.
- Do not leave `attach-pr` surfacing raw GraphQL errors for non-mutable issues when the helper already has an explicit mutability contract.

## Reject These Wrong Interpretations
- "The right fix is another broad fresh-issue workpad rewrite."
- "GraphQL attachment failure is acceptable because it is upstream."
- "Archived issues should be silently ignored instead of returning explicit mutability truth."
- "This lane should redesign same-issue child-lane behavior or PR handoff policy."

## Parity / Alignment Matrix
- Not applicable as a formal parity lane.
- Current truth: fresh mutable workpad create succeeds; archived/trashed `attach-pr` still leaks raw GraphQL failure.
- Reference truth: helper mutation surfaces that target the same issue identity should share the same explicit mutability/noop contract.
- Target truth / intended delta: `attach-pr` behaves like `upsert-workpad` on non-mutable issues while preserving current mutable/noop behavior.
- Explicitly out-of-scope differences: archived issue admission, generic workpad design, broader Linear API client changes.

## Not Done If
- Archived or trashed `attach-pr` still reaches GraphQL mutation and leaks `Entity not found: Issue`.
- Already-attached PR URLs stop returning noop.
- Mutable attach success or fresh workpad/transition paths regress.

## Validation Plan
- Audited `linear child-stream --pipeline docs-review` before implementation.
- Focused `ProviderLinearWorkflowFacade` regressions.
- Live/workspace validation proving:
  - fresh `CO-154` workpad create succeeded
  - archived `CO-36` attach failure was reproduced pre-fix
  - archived `attach-pr` returns `linear_issue_not_mutable` post-fix or equivalent targeted regression proof is recorded

## Approvals
- Reviewer: pending audited docs-review
- Date: 2026-04-11
