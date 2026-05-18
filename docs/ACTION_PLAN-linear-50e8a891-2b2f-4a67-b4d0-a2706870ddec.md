# ACTION_PLAN - CO: clear stale shared-root merge-closeout residue once CO-211 / PR #506 are merged and live Linear truth is Done

## Summary
- Goal: give the parent lane a bounded implementation plan for the stale merged-closeout residue shape where merged PR truth and live Linear `Done` truth are authoritative but local `Merging` action-required residue still suppresses discovery and projects as current work.
- Scope: stale-residue cleanup or supersession in provider handoff and `CO STATUS` projection seams, plus focused regressions.
- Assumptions:
  - the shared source/workpad already captures the `CO-211` / `PR #506` merged truth and live Linear `Done` truth
  - the issue is not a `CO-212 Ready reclaim` case
  - the smallest correct repair is a stale-vs-current closeout predicate, not shared-root policy redesign

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-211`
  - `PR #506`
  - `merged PR truth`
  - `live Linear Done truth`
  - `provider-intake-state.json`
  - `issue_state=Merging`
  - `state=handoff_failed`
  - `provider_issue_merge_closeout_action_required`
  - `merge_closeout.status=action_required`
  - `pending_shared_root_reconciliation`
  - `shared_root_not_on_main`
  - `linear_transition=null`
  - `provider_refresh_lifecycle_stuck`
  - `restart_required`
  - `CO STATUS active/backoff projection`
  - `fresh discovery suppression`
- Not done if:
  - stale merged/Done residue still suppresses discovery or projects as current work
  - the repair hides real refresh-health failures
  - the lane drifts into `CO-212 Ready reclaim` or spec-guard-only cleanup
- Pre-implementation issue-quality review:
  - accepted framing is stale merged-closeout residue after `CO-211` / `PR #506`
  - rejected framings are `CO-212 Ready reclaim`, display-only `CO STATUS` cleanup, and docs/spec-guard-only reinterpretation

## Milestones & Sequencing
1. Parent reproduces the stale-residue shape from the shared source/workpad and identifies the smallest stale-vs-current predicate using merged PR truth plus live Linear `Done` truth.
2. Parent implements that predicate in the provider handoff / suppression seam and reuses it in the active/backoff projection seam.
3. Parent adds focused regressions proving:
   - stale merged/Done residue no longer suppresses discovery
   - stale merged/Done residue no longer reports as active/backoff work
   - real current `pending_shared_root_reconciliation` remains visible for actual `Merging` lanes
   - real `provider_refresh_lifecycle_stuck` / `restart_required` remains visible for actual refresh-health failures

## Dependencies
- Shared source anchor: `ctx:sha256:b7ad1828659a1c10272a7b9a6baa0ec33f1474751d0357cb894bd66f92c391c0#chunk:c000001`
- Origin manifest: `.runs/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec-docs-packet/cli/2026-04-17T05-33-52-283Z-922f6714/manifest.json`
- Local retained closeout artifact shape in `provider-intake-state.json`
- Merged PR truth and live Linear `Done` truth from the parent-owned issue workspace/workpad

## Validation
- Checks / tests:
  - child lane only: `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - child lane only: protected-term grep across the six packet/mirror files
  - child lane only: `git diff --check -- <touched files>`
  - parent only: focused provider handoff / refresh serialization regression
  - parent only: focused `CO STATUS` active/backoff projection regression
  - parent only: `node scripts/spec-guard.mjs --dry-run`
- Rollback plan:
  - revert the stale-residue predicate if it weakens true current `pending_shared_root_reconciliation` or masks real refresh-health failures

## Risks & Mitigations
- Risk: the stale-residue predicate clears real current `Merging` pending action.
  - Mitigation: require both merged PR truth and newer live Linear `Done` truth before clearing or superseding local residue.
- Risk: the fix only hides projection while keeping discovery suppression active.
  - Mitigation: share one predicate across provider handoff and active/backoff projection seams.
- Risk: the lane drifts into `CO-212` or docs-only cleanup.
  - Mitigation: keep explicit rejection language in the packet and focused parent regression scope.

## Approvals
- Reviewer: pending parent implementation
- Date: 2026-04-17
