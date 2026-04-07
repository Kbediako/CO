---
id: 20260408-linear-8ef95d79-db42-411c-886c-99bdeee6492b
title: CO: Disambiguate historical attached PRs during deterministic merge closeout for reopened issues
relates_to: docs/PRD-linear-8ef95d79-db42-411c-886c-99bdeee6492b.md
risk: high
owners:
  - Codex
last_review: 2026-04-08
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`
- PRD: `docs/PRD-linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`
- Task checklist: `tasks/tasks-linear-8ef95d79-db42-411c-886c-99bdeee6492b.md`

## Summary
- Objective: disambiguate historical merged PR attachments from current candidates during deterministic merge closeout for reopened issues while preserving explicit ambiguity truth.
- Scope: update `providerMergeCloseout.ts`, preserve persistence through `providerIssueHandoff.ts`, reflect the record in the debug projection, and cover the `CO-81` proof shape with focused regressions.
- Constraints: keep `multiple_attached_prs` for unresolved ambiguity, ignore only deterministically historical merged attachments, and leave repo-mismatch / no-attached-PR behavior unchanged.

## Technical Requirements
- When there are multiple same-repo attached PRs, fetch per-PR snapshot state and classify only strictly older merged attachments as historical.
- If exactly one current candidate remains after safe filtering, select it automatically for the existing merge-closeout flow.
- If the replacement PR is already merged and the only other same-repo attachments are older stale non-merged PRs, recover the merged replacement instead of selecting stale baggage.
- If ambiguity remains, keep `multiple_attached_prs` and persist explicit `conflicting_attached_pr_urls`.
- Persist additive `ignored_historical_pr_urls` and `conflicting_attached_pr_urls` fields in `ProviderMergeCloseoutRecord`; no migration is required.

## Validation
- Audited docs-review evidence: `/Users/kbediako/Code/CO/.workspaces/linear-8ef95d79-db42-411c-886c-99bdeee6492b/.runs/linear-8ef95d79-db42-411c-886c-99bdeee6492b-co-104-docs-review/cli/2026-04-07T14-47-56-051Z-248c4f90/manifest.json`.
- Focused regressions: `ProviderMergeCloseout`, `ProviderIssueHandoff`, and `ProviderIssueObservability`.
- Validation floor: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, forced manifest-backed `npm run review`, `npm run pack:smoke`.

## Approvals
- Reviewer: pending docs-review / implementation handoff
- Date: 2026-04-08
