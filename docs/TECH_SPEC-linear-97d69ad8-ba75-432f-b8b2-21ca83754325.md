---
id: 20260410-linear-97d69ad8-ba75-432f-b8b2-21ca83754325
title: CO: add autonomous branch refresh and conflict recovery for green-but-dirty PRs before and during Merging
relates_to: docs/PRD-linear-97d69ad8-ba75-432f-b8b2-21ca83754325.md
risk: high
owners:
  - Codex
last_review: 2026-04-10
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-97d69ad8-ba75-432f-b8b2-21ca83754325.md`
- PRD: `docs/PRD-linear-97d69ad8-ba75-432f-b8b2-21ca83754325.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-97d69ad8-ba75-432f-b8b2-21ca83754325.md`
- Task checklist: `tasks/tasks-linear-97d69ad8-ba75-432f-b8b2-21ca83754325.md`

## Traceability
- Linear issue: `CO-140` / `97d69ad8-ba75-432f-b8b2-21ca83754325`
- Linear URL: https://linear.app/asabeko/issue/CO-140/co-add-autonomous-branch-refresh-and-conflict-recovery-for-green-but
- Related lanes:
  - `CO-116` / `a770da1f-7a08-499d-a680-7f1cd8eee4ad`
  - `CO-104` / `8ef95d79-db42-411c-886c-99bdeee6492b`
  - `CO-111` / `ff81e5d8-2760-41ec-bdbb-5509ae2faade`
  - `CO-138`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make green-but-dirty PRs self-heal through a bounded branch-refresh path and move conflict-shaped failures into truthful `Rework`.
- Scope:
  - docs-first packet registration for `CO-140`
  - one shared branch-refresh / recovery helper in the PR watcher seam
  - reuse of that helper in review-handoff promotion and deterministic merge closeout
  - additive persisted recovery-attempt metadata plus focused regressions
  - required validation and review gates
- Constraints:
  - recovery must stay non-interactive and GitHub-side
  - existing merge-ready blocker truth remains authoritative after recovery
  - conflict fallback must transition to `Rework` rather than leave review or merge states stale

## Technical Requirements
- Functional requirements:
  - `pr-watch-merge.js` must attempt a bounded branch refresh before surfacing `merge_state=BEHIND` or `merge_state=DIRTY` as terminal action-required output
  - review-handoff promotion must reuse the same recovery helper before refusing green-but-dirty PRs
  - deterministic merge closeout must reuse the same recovery helper before refusing green-but-dirty PRs in `Merging`
  - successful recovery attempts must re-evaluate the PR snapshot and resume normal watching
  - conflict-shaped recovery failures must persist exact attempt metadata and transition the Linear issue to `Rework`
  - unclassified recovery-command failures must fail closed with exact attempt metadata and without silent state mutation
  - focused tests must cover `BEHIND` refresh, `DIRTY` recovery failure into `Rework`, resumed monitoring after recovery request, and machine-checkable recovery-attempt persistence
- Non-functional requirements:
  - all recovery commands must be explicit, non-interactive, and repo-scoped
  - recovery-attempt persistence must be additive and backward-compatible for intake claim records
  - no broad refactor of merge-closeout or review-promotion ownership
- Interfaces / contracts:
  - shared recovery helper(s): `scripts/lib/pr-watch-merge.js` and `scripts/lib/pr-watch-merge.d.ts`
  - provider reuse: `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - persisted claim surfaces: `orchestrator/src/cli/control/providerIntakeState.ts`
  - claim-state mapping / retry behavior: `orchestrator/src/cli/control/providerIssueHandoff.ts`

## Architecture & Data
- Architecture / design adjustments:
  - add an exported branch-recovery helper around `gh pr update-branch`
  - extend review-promotion and merge-closeout records with additive recovery-attempt metadata
  - keep review-promotion and merge-closeout as the owning records rather than creating a third recovery artifact
- Data model changes / migrations:
  - additive recovery-attempt field on `ProviderReviewHandoffPromotionRecord`
  - additive recovery-attempt field on `ProviderMergeCloseoutRecord`
  - no migration required; persisted claims can treat the new field as optional
- External dependencies / integrations:
  - GitHub CLI `gh pr update-branch`
  - existing GitHub snapshot reads via `fetchPrStatusSnapshot`
  - existing Linear transition helper for `Merging`, `Done`, and `Rework`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused `tests/pr-watch-merge.spec.ts` coverage for recovery helper behavior and watcher follow-up behavior
  - focused `ProviderMergeCloseout.test.ts` coverage for `BEHIND` refresh and `DIRTY` rework fallback
  - focused `ProviderIssueHandoff.test.ts` coverage for persisted claim mapping after recovery or rework transition
  - `ProviderIssueObservability.test.ts` if progress/stall summaries need to show recovery-specific truth
  - required repo validation floor after implementation
  - manifest-backed standalone review followed by explicit elegance review before handoff
- Rollout verification:
  - confirm a green `BEHIND` review handoff or merge closeout records a recovery request instead of manual action-required truth
  - confirm a conflict-shaped failure transitions the issue into `Rework` with exact blocker and attempt metadata
- Monitoring / alerts:
  - rely on persisted recovery-attempt fields plus existing provider debug projection and workpad closeout notes

## Open Questions
- Pending docs-review: whether the recovery helper should classify a post-refresh still-`BEHIND` snapshot as continued watching or immediate failure when GitHub has already accepted the update request.

## Approvals
- Reviewer: pending `codex-orchestrator docs-review`
- Date: 2026-04-10
