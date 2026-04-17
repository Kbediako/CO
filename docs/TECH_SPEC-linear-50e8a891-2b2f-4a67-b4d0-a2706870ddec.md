---
id: 20260417-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec
title: CO: clear stale shared-root merge-closeout residue once CO-211 / PR #506 are merged and live Linear truth is Done
relates_to: docs/PRD-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md
risk: high
owners:
  - Codex
last_review: 2026-04-17
---

## Canonical Spec
- Implementation contract: `tasks/specs/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`
- PRD: `docs/PRD-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`
- Action plan: `docs/ACTION_PLAN-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`
- Checklist: `tasks/tasks-linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`

## Scope
- Fix stale merged-closeout residue after `CO-211` / `PR #506`, not generic merge policy.
- Preserve merged PR truth plus live Linear `Done` truth as the deciding reference when stale local `Merging` action-required residue is no longer current.
- Preserve exact surfaces: `provider-intake-state.json`, `issue_state=Merging`, `state=handoff_failed`, `provider_issue_merge_closeout_action_required`, `merge_closeout.status=action_required`, `pending_shared_root_reconciliation`, `shared_root_not_on_main`, `linear_transition=null`, `provider_refresh_lifecycle_stuck`, `restart_required`, `CO STATUS active/backoff projection`, and `fresh discovery suppression`.
- Reject `CO-212 Ready reclaim` and spec-guard-only reinterpretations.

## Required Behavior
- Merged PR truth plus newer Linear `Done` truth must invalidate or supersede stale local `Merging` action-required closeout residue once that residue is no longer current.
- Fresh discovery and later handoff recovery must not stay suppressed by that stale residue.
- `CO STATUS active/backoff projection` must not report the stale merged/Done issue as current work.
- True current `pending_shared_root_reconciliation` behavior must remain intact for actually live `Merging` lanes.
- Genuine `provider_refresh_lifecycle_stuck` / `restart_required` signals must remain intact for actual unhealthy refresh lifecycles.

## Interfaces / Contracts
- Likely runtime seams:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts` or `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts` only if the stale-current comparison belongs there
- Likely focused tests:
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - projection or merge-closeout coverage only if the predicate is shared there

## Non-Goals
- No `CO-212` Ready reclaim redesign.
- No shared-root policy redesign or forced shared-root mutation.
- No docs-only/spec-guard-only reinterpretation.
- No manual `provider-intake-state.json` cleanup as the product fix.

## Validation
- Child lane scoped checks only: JSON parse, protected-term grep, and `git diff --check`.
- Parent focused runtime checks only: stale-residue handoff regression, active/backoff projection regression, and preservation of real current `pending_shared_root_reconciliation` plus real `provider_refresh_lifecycle_stuck` / `restart_required`.
