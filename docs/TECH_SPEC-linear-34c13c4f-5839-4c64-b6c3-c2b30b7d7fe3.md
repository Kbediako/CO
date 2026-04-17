---
id: 20260417-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3
title: CO STATUS: hydrate active child-lane manifests before showing reserved-before-startup progress
relates_to: docs/PRD-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md
risk: medium
owners:
  - Codex
last_review: 2026-04-17
---

## Canonical Spec
- Implementation contract: `tasks/specs/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`
- PRD: `docs/PRD-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`
- Action plan: `docs/ACTION_PLAN-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`
- Checklist: `tasks/tasks-linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`

## Scope
- `CO STATUS`, `co-status --format json`, and `provider-linear-worker-progress` should hydrate active child-lane manifests before showing reserved-before-startup progress.
- Required placeholder text: `Child lane reserved before child run startup.`
- Required artifacts: `provider-linear-worker-child-lanes.json`, `provider-linear-worker-proof.json`, and child-lane manifest.
- Required lineage fields: `parent_run_id`, `issue_id`, `issue_identifier`, and `pipeline_id=provider-linear-child-lane`.

## Required Behavior
- Treat `Child lane reserved before child run startup.` as a fallback for true pre-startup state only.
- Prefer a metadata-matching child-lane manifest once the child run has started.
- Current-progress selection must use child-lane `summary_recorded_at` freshness, not `launched_at` alone; for status-only child-manifest progress that timestamp advances from `latest(updated_at, heartbeat_at)`.
- Fail closed on missing, malformed, unreadable, or lineage-mismatched child manifests.
- Preserve historical child-lane ledger/proof records.
- Do not change stale Linear `updated_at` accept invalidation, child-lane ownership/acceptance, scheduler behavior, or historical retention.

## Matching Contract
A child-lane manifest can hydrate a reserved record only when it matches the parent and issue lineage:

```json
{
  "parent_run_id": "<parent provider-worker run id>",
  "issue_id": "<same Linear issue id>",
  "issue_identifier": "<same Linear issue key>",
  "pipeline_id": "provider-linear-child-lane"
}
```

The manifest `task_id` must match the reservation record in `provider-linear-worker-child-lanes.json`. The manifest `run_id` is the real child run id and may replace a synthetic `launching-*` reservation id in the hydrated proof snapshot; it must be a valid child run id inside the expected child task artifact tree, not equal the reservation id.

## Validation
- Focused parent-owned regression for reserved child lane plus matching started manifest.
- Focused parent-owned regression that current-progress selection prefers the freshest child-lane by `summary_recorded_at` rather than `launched_at`, including status-only manifest freshness from `latest(updated_at, heartbeat_at)` in both timestamp orders.
- Focused parent-owned regression for mismatched manifest lineage.
- Focused parent-owned regression for no manifest / pre-startup fallback.
- Existing or focused regression preserving disposed child-lane behavior.
- Scoped docs/registry syntax check: `jq empty tasks/index.json docs/docs-freshness-registry.json`.
