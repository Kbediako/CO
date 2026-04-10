---
id: 20260410-linear-d19bd14e-0604-456d-9a45-e65b898cf7a2
title: CO: clear stale merge-closeout action-required claims when issues leave Merging and return to active work
relates_to: docs/PRD-linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md
risk: high
owners:
  - Codex
last_review: 2026-04-10
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`
- PRD: `docs/PRD-linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`
- Task checklist: `tasks/tasks-linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`

## Traceability
- Linear issue: `CO-138` / `d19bd14e-0604-456d-9a45-e65b898cf7a2`
- Linear URL: https://linear.app/asabeko/issue/CO-138/co-clear-stale-merge-closeout-action-required-claims-when-issues-leave
- Related lanes:
  - `CO-120`
  - `CO-111` / `ff81e5d8-2760-41ec-bdbb-5509ae2faade`
  - `CO-104` / `8ef95d79-db42-411c-886c-99bdeee6492b`
  - `CO-116` / `a770da1f-7a08-499d-a680-7f1cd8eee4ad`
  - `CO-119`
  - `CO-125`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make completed-run rehydrate treat newer non-`Merging` tracked issue truth as authoritative over stale merge-closeout failure residue.
- Scope:
  - docs-first packet registration for `CO-138`
  - one bounded stale-merge-closeout invalidation / supersession seam in `providerIssueHandoff.ts` completed-run recovery and refresh persistence
  - focused regressions for completed-run rehydrate and poll / rehydrate recovery
  - required validation and review gates
- Constraints:
  - preserve current deterministic merge-closeout behavior for truly current `Merging` issues
  - avoid reopening adjacent merged-retirement, PR-ambiguity, review-promotion, refresh-timeout, or admission-policy lanes
  - keep the repair narrow and monotonic in persisted intake state

## Technical Requirements
- Functional requirements:
  - completed-run rehydrate must not preserve `handoff_failed` / `provider_issue_merge_closeout_action_required` when newer tracked issue truth proves the issue is no longer `Merging`
  - stale `merge_closeout` residue must be cleared or safely superseded so normal pickup works without manual state-file edits
  - focused tests must reproduce the `CO-120` stale shape and prove the post-fix runnable claim
  - truly current `Merging` merge-closeout behavior must remain unchanged
- Non-functional requirements:
  - fail closed only when the stale-vs-current state lineage is genuinely ambiguous
  - keep the solution minimal: one freshness / invalidation seam rather than broader lifecycle redesign
  - keep persisted truth machine-checkable and monotonic for later refresh or observability consumers
- Interfaces / contracts:
  - rehydrate seam: `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - optional projected truth seam: `orchestrator/src/cli/control/providerIssueObservability.ts`

## Architecture & Data
- Architecture / design adjustments:
  - evaluate stale merge-closeout freshness before the claim-state resolver reuses preserved merge-closeout residue
  - drop or supersede persisted merge-closeout records only when newer tracked issue truth proves the issue has left `Merging`
  - persist the cleanup by emitting explicit `merge_closeout: null` claim fields from `providerIssueHandoff.ts` rather than changing the generic claim-upsert preservation behavior in `providerIntakeState.ts`
  - leave existing `Merging` closeout flows unchanged when the persisted record still matches current live state lineage
- Data model changes / migrations:
  - no new artifact family; reuse the existing `merge_closeout` claim field and its persisted snapshots
  - cleanup is persisted by explicit null claim fields so later rehydrate / refresh recovery sees the filtered claim instead of reviving the stale record
- External dependencies / integrations:
  - tracked issue updates already available to completed-run rehydrate
  - existing shared intake artifact `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused `ProviderIssueHandoff.test.ts` coverage for stale merge-closeout rehydrate and preserved live `Merging` behavior
  - refresh or rehydrate recovery coverage in the owning `ProviderIssueHandoff.test.ts` surface
  - required repo validation floor after implementation
  - manifest-backed standalone review followed by explicit elegance review before handoff
- Rollout verification:
  - confirm the reproduced stale shape becomes runnable without manual state-file edits
  - confirm current `Merging` merge-closeout outcomes remain authoritative
- Monitoring / alerts:
  - rely on existing intake claim and debug surfaces; only extend observability if the cleared/superseded record needs explicit operator-facing truth

## Open Questions
- Resolved during implementation: the smallest safe fix is a `providerIssueHandoff.ts`-owned stale-record filter plus explicit null persistence, not a generic `providerIntakeState.ts` behavior change.

## Approvals
- Reviewer: audited `docs-review` child stream ran before implementation and passed delegation guard, `spec-guard`, and `docs:check`; only repo-wide `docs:freshness` baseline debt remained. Evidence: `.runs/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2-co-138-docs-review/cli/2026-04-10T07-04-13-496Z-80cbb02d/manifest.json`, `out/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2/manual/20260410T070413Z-docs-review-fallback.md`
- Date: 2026-04-10
