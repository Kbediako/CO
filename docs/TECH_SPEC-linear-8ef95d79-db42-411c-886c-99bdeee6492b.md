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

## Traceability
- Linear issue: `CO-104` / `8ef95d79-db42-411c-886c-99bdeee6492b`
- Linear URL: https://linear.app/asabeko/issue/CO-104/co-disambiguate-historical-attached-prs-during-deterministic-merge

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: disambiguate historical merged PR attachments from current candidates during deterministic merge closeout for reopened issues while preserving explicit ambiguity truth and provider/control-host artifact continuity.
- Scope:
  - docs-first packet and initial workpad for `CO-104`
  - deterministic candidate selection updates in `providerMergeCloseout.ts`
  - merge-closeout persistence regression coverage in `providerIssueHandoff.ts`
  - focused validation around the `CO-81` historical `#360` / current `#372` shape
  - standard validation, standalone review, and elegance review
- Constraints:
  - preserve `multiple_attached_prs` as the action-required reason when ambiguity remains
  - do not delete or mutate Linear attachments
  - keep unchanged repo-mismatch and no-attached-PR behavior

## Technical Requirements
- Functional requirements:
  - same-repo PR attachment resolution must distinguish historical merged PR attachments from current candidates
  - exactly one current candidate after historical filtering must be selected automatically for the existing merge-closeout flow
  - unresolved multiple-current ambiguity must return action-required truth with explicit conflicting PR URL evidence
  - the merge-closeout record must persist selected, ignored historical, and conflicting attached PR URLs in machine-checkable form
  - `ProviderIssueHandoff` persistence must preserve the enriched record shape through claim updates
- Non-functional requirements:
  - deterministic, evidence-backed selection only; no non-persisted heuristics
  - additive record changes only; historical claims remain readable
  - bounded GitHub snapshot reads proportional to the small attached-PR set on a single issue
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Architecture & Data
- Architecture / design adjustments:
  - add an attached-PR resolution helper in `providerMergeCloseout.ts` that:
    - gathers same-repo attached PRs
    - fetches snapshot state only when there are multiple same-repo candidates
    - ignores only merged attachments that are strictly older than the one remaining non-merged candidate
    - can also recover an already-merged replacement PR when the only other same-repo attachments are older and still unmerged
    - returns either one selected candidate or an explicit conflicting set
  - keep the downstream merge, shared-root reconciliation, and Done-transition flow unchanged for the selected PR
  - use `providerIssueHandoff.ts` regression coverage to prove the enriched `merge_closeout` record survives persistence unchanged
- Data model changes / migrations:
  - additive fields on `ProviderMergeCloseoutRecord` for ignored historical and conflicting attached PR URL arrays, plus optional structured resolution details if needed
  - no persisted-state migration; old records simply lack the new fields
- External dependencies / integrations:
  - GitHub `fetchPrStatusSnapshot`
  - Linear issue attachments from `issue-context`
  - provider intake claim persistence

## Validation Plan
- Tests / checks:
  - `MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-104-docs-review --format json`
  - focused regressions in `ProviderMergeCloseout` and `ProviderIssueHandoff`
  - full validation floor:
    - `node scripts/delegation-guard.mjs`
    - `node scripts/spec-guard.mjs --dry-run`
    - `npm run build`
    - `npm run lint`
    - `npm run test`
    - `npm run docs:check`
    - `npm run docs:freshness`
    - `node scripts/diff-budget.mjs`
    - forced manifest-backed `npm run review`
    - `npm run pack:smoke`
- Rollout verification:
  - a `CO-81`-style reopened issue model selects the replacement PR and records the historical merged PR as ignored
  - an already-merged replacement PR beats older unmerged stale same-repo attachments and takes the existing recovery path to `Done`
  - a true ambiguous multi-candidate shape stays action-required with explicit conflicting URLs
  - repo-mismatch and no-attached-PR branches stay unchanged
- Monitoring / alerts:
  - provider/control-host `merge_closeout` artifacts expose selected / ignored / conflicting PR URL evidence directly

## Open Questions
- Pending implementation: if multiple merged historical attachments and zero current candidates are attached, the current lane should still fail closed rather than inventing a candidate. The implementation should not broaden beyond the issue’s requested safe historical disambiguation rule.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-08
