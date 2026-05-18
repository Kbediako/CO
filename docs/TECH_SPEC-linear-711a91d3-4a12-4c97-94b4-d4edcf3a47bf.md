---
id: 20260421-linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf
title: Control host: reclaim stale plain released/not_active Backlog cache after Backlog -> Ready post-CO-240
relates_to: docs/PRD-linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md
risk: high
owners:
  - Codex
last_review: 2026-04-21
---

# TECH_SPEC - Control host: reclaim stale plain released/not_active Backlog cache after Backlog -> Ready post-CO-240

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`
- PRD: `docs/PRD-linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`
- Task checklist: `tasks/tasks-linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`
- `.agent` mirror: `.agent/task/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf.md`

## Traceability
- Linear issue: `CO-281` / `711a91d3-4a12-4c97-94b4-d4edcf3a47bf`
- Live issue source: read-only Linear issue body, `updatedAt=2026-04-21T05:54:02.627Z`
- Parent-provided issue source anchor: `ctx:sha256:2d92868e9c6fa9d99101ff7c39b3d0c6d5b8322632c5ec319289197d5f4bb1e8#chunk:c000001`
- Shared source 0 anchor: `ctx:sha256:2d92868e9c6fa9d99101ff7c39b3d0c6d5b8322632c5ec319289197d5f4bb1e8#chunk:c000001`
- Source object id: `sha256:2d92868e9c6fa9d99101ff7c39b3d0c6d5b8322632c5ec319289197d5f4bb1e8`
- Origin manifest: `.runs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf/cli/2026-04-21T05-38-15-496Z-0b50967a/manifest.json`
- Docs child-lane manifest: `.runs/linear-711a91d3-4a12-4c97-94b4-d4edcf3a47bf-docs-packet-file-refresh/cli/2026-04-21T05-56-35-757Z-41ecac5d/manifest.json`
- CO-240 lineage: `CO-240` / `ddb81c93-87b2-4dff-b69b-33d7ae3c91cd`

## Summary
- Objective: close the post-CO-240 stale Backlog cache reclaim gap where a plain `released` / `provider_issue_released:not_active` row with `last_delivery_id=null` still suppresses a live `Ready` issue after operator-autopilot performs `Backlog -> Ready`.
- Scope:
  - parent-owned reclaim / `fresh_discovery` classification in existing control-host seams
  - parent-owned focused regression for stale cached `issue_state=Backlog`, `issue_state_type=backlog`, stale `issue_updated_at`, and `last_delivery_id=null`
  - preservation of `CO-240` lineage and adjacent `CO-212` / `CO-216` behavior
  - retention of queue evidence in `provider-intake-state.json`
- Constraints:
  - reject `CO-212` completed-blocker scope, `CO-216` manual-demotion scope, pure capacity, manual worker start, and generic concurrency/capacity rewrites
  - keep this child lane docs-only
  - parent owns implementation, validation, Linear state, workpad, PR lifecycle, and merge

## Protected Surfaces
- `control host`
- `operator-autopilot`
- `Backlog -> Ready`
- `provider-intake-state.json`
- `released`
- `provider_issue_released:not_active`
- `stale Backlog cache`
- `fresh_discovery`
- `reclaim`
- `CO-240`
- `last_delivery_id=null`
- `.runs/local-mcp/cli/control-host/provider-intake-state.json`
- `.runs/local-mcp/cli/control-host/provider-operator-autopilot.jsonl`

## Technical Requirements
- Reproduce a retained plain released/not-active claim where cached `issue_state=Backlog`, `issue_state_type=backlog`, stale `issue_updated_at`, and `last_delivery_id=null` remain after live operator-autopilot promotion to `Ready`.
- Refresh or reclassify the retained row against live `Ready` truth before stale Backlog cache can suppress reclaim.
- Allow normal reclaim or `fresh_discovery` to admit the issue without manual worker start.
- Preserve retained audit state in `provider-intake-state.json`.
- Preserve `CO-212` completed-blocker reclaim and `CO-216` manual-demotion behavior.
- Keep `CO-240` lineage visible in docs, tests, and review notes.
- Implementation: after operator-autopilot reports a `transitioned` or `noop` action and the control host refetches tracked issues, dispatch first uses the existing normal ordering, then partitions those autopilot issue IDs to the front for that same-cycle dispatch call only.
- This keeps the fix local to provider handoff reclaim / `fresh_discovery`; it does not add a scheduler, state-file deletion, manual worker-start dependency, or generic capacity rewrite.

## Validation Plan
- Parent-focused regression for the stale plain released/not_active Backlog cache shape after operator-autopilot `Backlog -> Ready`.
- Parent-focused assertion that `last_delivery_id=null` remains in the fixture and does not prevent reclaim once live truth is `Ready`.
- Parent-focused assertion that reclaim / `fresh_discovery` admits without manual worker start.
- Parent-focused adjacent invariant coverage for `CO-212` and `CO-216` when the chosen seam touches them.
- Parent docs-review / spec-guard after patch import.
- Child lane validation remains scoped to packet diff integrity and term preservation.
- Standalone review completed with `review_outcome=bounded-success`; elegance review completed with no simplification patch.

## Not Done If
- A backlog head can still be promoted to `Ready` while `provider-intake-state.json` keeps stale `Backlog` truth under a plain `released` / `provider_issue_released:not_active` row.
- Normal reclaim or `fresh_discovery` still fails to admit that issue without manual intervention.
- The fix only changes observability while stale cached truth still suppresses real `Ready` pickup.
- The solution is reframed as `CO-212`, `CO-216`, pure capacity, manual worker start, or generic concurrency/capacity work.

## Approvals
- Pre-implementation issue-quality review is recorded in the canonical task spec.
- Parent lane completed docs-review fallback evidence, implementation validation, standalone review, elegance review, and owns PR lifecycle handoff.
