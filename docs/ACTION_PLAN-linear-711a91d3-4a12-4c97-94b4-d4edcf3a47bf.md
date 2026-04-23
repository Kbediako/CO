# ACTION_PLAN - Control host: reclaim stale plain released/not_active Backlog cache after Backlog -> Ready post-CO-240

## Added by Bootstrap 2026-04-21

## Summary
- Goal: close `CO-281` by making the control host refresh or reclassify a stale plain `released` / `provider_issue_released:not_active` Backlog cache after operator-autopilot promotes the live issue from `Backlog -> Ready`, preserving `CO-240` lineage.
- Scope: docs-first packet only in this child lane; parent-owned implementation, focused regressions, validation, review, workpad, Linear state, PR lifecycle, and merge.
- Source of truth: read-only Linear issue body, `updatedAt=2026-04-21T05:54:02.627Z`, plus parent-provided anchors and April 21 evidence paths.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `control host`, `operator-autopilot`, `Backlog -> Ready`, `provider-intake-state.json`, `released`, `provider_issue_released:not_active`, `stale Backlog cache`, `fresh_discovery`, `reclaim`, `CO-240`, and `last_delivery_id=null`
- Evidence paths carried forward:
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `.runs/local-mcp/cli/control-host/provider-operator-autopilot.jsonl`
- Not done if:
  - a backlog head can still be promoted to `Ready` while stale `Backlog` truth stays under a plain `released` / `provider_issue_released:not_active` row
  - normal reclaim or `fresh_discovery` still fails to admit without manual intervention
  - the parent fix only changes observability while stale cached truth still suppresses `Ready` pickup
  - the explanation drifts into `CO-212`, `CO-216`, pure capacity, manual worker start, or generic concurrency/capacity language
- Pre-implementation issue-quality review:
  - 2026-04-21: this refreshed docs packet keeps `CO-281` on the post-CO-240 stale plain released/not_active Backlog cache reclaim seam. The issue is not plausibly narrower than docs registration because correctness depends on exact protected wording, issue-state naming, CO-240 lineage, and adjacent-scope rejection.

## Milestones & Sequencing
1. Child lane drafts the six scoped docs/task files and the `tasks/index.json` registry entry only.
2. Parent imports the refreshed packet after stale-artifact invalidation, then runs parent-owned docs-review/spec-guard.
3. Parent inspects the existing reclaim / `fresh_discovery` seam for plain `provider_issue_released:not_active` rows with stale cached `Backlog` truth.
4. Parent adds focused regression coverage for stale cached `issue_state=Backlog`, `issue_state_type=backlog`, stale `issue_updated_at`, and `last_delivery_id=null` after operator-autopilot `Backlog -> Ready`.
5. Parent implements the narrow refresh/reclassify behavior so normal reclaim or `fresh_discovery` admits the live `Ready` issue without manual worker start.
6. Parent verifies adjacent `CO-212` and `CO-216` behavior, then completes required validation, standalone review, elegance pass, workpad refresh, PR handling, and review-state transition.

## Dependencies
- `provider-intake-state.json`
- `provider-operator-autopilot.jsonl`
- `providerIssueHandoff.ts`
- `fresh_discovery`
- parent-owned focused provider handoff and control-host regressions
- adjacent behavior from `CO-212`, `CO-216`, and `CO-240`

## Validation
- Checks / tests:
  - child lane: scoped docs packet integrity checks only
  - parent lane: focused regression for stale plain released/not_active `Backlog -> Ready` reclaim
  - parent lane: focused assertion for `last_delivery_id=null`
  - parent lane: focused proof that manual worker start is not required
  - parent lane: adjacent behavior coverage for `CO-212` and `CO-216` as needed
  - parent lane: docs-review / spec-guard plus normal validation/review gates
- Rollback plan:
  - revert the narrow reclaim classification change and focused regressions together if the fix duplicates workers, loses audit evidence, or blurs adjacent reclaim boundaries
  - preserve the issue packet if implementation rolls back, provided it remains truthful about the post-CO-240 stale Backlog cache contract

## Risks & Mitigations
- Risk: parent narrows the issue into `CO-212` completed-blocker reclaim.
  - Mitigation: keep stale `Backlog` cache, `last_delivery_id=null`, and post-operator-autopilot `Backlog -> Ready` fixture requirements explicit.
- Risk: parent treats the same-window manual provider-worker start as the fix.
  - Mitigation: require normal reclaim / `fresh_discovery` admission without manual worker start.
- Risk: parent broadens the issue into generic capacity or concurrency policy.
  - Mitigation: keep this scoped to stale plain released/not_active reclaim and preserve the pure-capacity rejection.
- Risk: parent loses CO-240 lineage.
  - Mitigation: cite `CO-240` in docs, regression naming, and review notes.

## Approvals
- Reviewer: pending parent lane acceptance, docs-review, and implementation validation
- Date: 2026-04-21
