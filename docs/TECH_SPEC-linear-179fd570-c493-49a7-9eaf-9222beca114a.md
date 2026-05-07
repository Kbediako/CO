---
id: 20260406-linear-179fd570-c493-49a7-9eaf-9222beca114a
title: CO: Make shared-root reconciliation deterministic after merged closeout, including resumed Merging active-run recovery
relates_to: docs/PRD-linear-179fd570-c493-49a7-9eaf-9222beca114a.md
risk: high
owners:
  - Codex
last_review: 2026-04-06
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-179fd570-c493-49a7-9eaf-9222beca114a.md`
- PRD: `docs/PRD-linear-179fd570-c493-49a7-9eaf-9222beca114a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-179fd570-c493-49a7-9eaf-9222beca114a.md`
- Task checklist: `tasks/tasks-linear-179fd570-c493-49a7-9eaf-9222beca114a.md`

## Traceability
- Linear issue: `CO-100` / `179fd570-c493-49a7-9eaf-9222beca114a`
- Linear URL: https://linear.app/asabeko/issue/CO-100/co-make-shared-root-reconciliation-deterministic-after-merged-closeout

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make shared-root reconciliation deterministic and operator-visible after merged closeout, while ensuring resumed `Merging` `activeRun` recovery cannot bypass deterministic merge closeout.
- Scope:
  - docs-first packet and workpad for `CO-100`
  - refresh / rehydrate ordering changes in `providerIssueHandoff.ts`
  - shared-root truth and pending-vs-complete observability changes in merge closeout and provider observability surfaces
  - focused regression coverage for dirty-root skip visibility and the `CO-98` recovery bypass shape
  - standard validation, standalone review, and elegance review gates
- Constraints:
  - preserve the existing safety guard for dirty, detached, non-`main`, and non-`ff-only` shared roots
  - keep the fix bounded to the shared-root reconciliation and `Merging` recovery seam
  - avoid broad workflow redesign

## Technical Requirements
- Functional requirements:
  - deterministic merge closeout must preserve exact shared-root reconciliation outcomes, including durable pending/skipped reasons when sync is unsafe
  - refresh / rehydrate for `Merging` issues must invoke deterministic merge closeout before a resumed `activeRun` claim can short-circuit closeout recovery
  - the operator-facing debug/progress surface must expose shared-root reconciliation status and exact reason directly
  - merged closeout on a safe shared root must continue to fetch `origin/main` and fast-forward `/Users/kbediako/Code/CO` with `--ff-only`
  - focused tests must cover both the safe-skip dirty-root case and the resumed-active-run bypass case
- Non-functional requirements:
  - preserve fail-closed behavior on unsafe shared-root mutation
  - keep merge-closeout artifacts monotonic and machine-checkable
  - do not introduce ambiguous “complete” states when reconciliation is still pending
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts`

## Architecture & Data
- Architecture / design adjustments:
  - keep shared-root outcome truth anchored in `providerMergeCloseout.ts`, but make merged+skipped reconciliation distinct in summary/reason semantics and operator-facing progress derivation
  - change `providerIssueHandoff.ts` refresh/rehydrate ordering so `Merging` recovery evaluates deterministic merge closeout before preserving a rehydrated `activeRun`
  - project shared-root details into `providerIssueObservability.ts` so the authoritative surface can distinguish `reconciled` from `pending_shared_root_reconciliation`
- Data model changes / migrations:
  - additive changes only to merge-closeout reason/summary projection and debug snapshot fields
  - no destructive migration of provider intake claim shape
- External dependencies / integrations:
  - shared-root git safety checks and `origin/main` fast-forward logic
  - existing Linear tracked-issue refresh and claim persistence

## Validation Plan
- Tests / checks:
  - `MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-100-docs-review --format json`
  - focused regressions in `ProviderMergeCloseout`, `ProviderIssueHandoff`, and `ProviderIssueObservability`
  - full repo validation floor
  - manifest-backed standalone review plus explicit elegance review
- Rollout verification:
  - merged+skipped shared-root reconciliation appears as pending/shared-root-specific operator-visible truth
  - recovered `Merging` issues run deterministic merge closeout before rehydrated active-run ownership is preserved
- Monitoring / alerts:
  - provider observability should expose shared-root status/reason without raw claim JSON inspection

## Open Questions
- Resolved during implementation review: skipped shared-root reconciliation now returns top-level `action_required` with `pending_shared_root_reconciliation` and leaves the issue in `Merging`, so machine consumers see the explicit pending reason and refresh/rehydrate can rerun deterministic closeout once the shared root is safe.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-06
