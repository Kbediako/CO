---
id: 20260501-linear-7badbb88-ab4b-4091-9cd1-5d74643b6443
title: CO-474 Ready accepted/no-run pending-revalidation recover timeout
relates_to: docs/PRD-linear-7badbb88-ab4b-4091-9cd1-5d74643b6443.md
risk: high
owners:
  - Codex
last_review: 2026-05-01
related_action_plan: docs/ACTION_PLAN-linear-7badbb88-ab4b-4091-9cd1-5d74643b6443.md
task_checklists:
  - tasks/tasks-linear-7badbb88-ab4b-4091-9cd1-5d74643b6443.md
---

# TECH_SPEC - CO-474 Ready Accepted/No-Run Revalidation Recovery

## Intent
Explicit `control-host recover` / relaunch for a `Ready issue` must not strand `accepted/no-run` `provider_issue_rehydration_pending_revalidation` with `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, no launch token, no retry error, and no worker. It must start `provider-linear-worker` with manifest provenance or fail fast before `request timeout 120000ms`.

Protected terms: `CO-470`, `CO-472`, `control-host recover`, `Ready issue`, `accepted/no-run`, `provider_issue_rehydration_pending_revalidation`, `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, `request timeout 120000ms`, `provider-intake-state.json`, `ProviderIssueHandoff`, `provider-linear-worker`.

## Scope
- Parent owns `ProviderIssueHandoff` / control-host lifecycle behavior, tests, validation, workpad, PR lifecycle, and CO-470 unblock evidence.
- Docs child lane owns only packet files and registry mirrors.
- Out of scope: CO-470 fixture-env cleanup, CO-472 rewrite, manual state surgery, direct worker launch, cap relaxation, and timeout masking.

## Requirements
- Reproduce the accepted/no-run pending-revalidation shape.
- Bound prior-operation waits separately from actual recovery launch waits.
- Preserve duplicate-launch safety for live runs while refusing stale manifestless recovery starts as terminal inflight truth.
- Preserve actionable polling diagnostics on skipped/failed recovery.
- Keep stale abandoned queued operations from deleting new recovery state.
Large-refactor check: not required; one bounded lifecycle seam removes the indefinite accepted/no-run inflight truth while preserving existing launch authority.
Minor-seam decision: acceptable because the fix centralizes explicit recovery timeout/retry behavior and has focused regressions for duplicate-launch safety.
| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker recover | Accepted/no-run pending-revalidation recovery treated as indefinite inflight truth | remove fallback | CO-474 | Ready issue has null run/manifest/launch and no retry error | observed 2026-05-01 | N/A after removal | N/A after removal | Explicit recover launches/retries or fails fast deterministically without occupying capacity | Focused lifecycle and handoff regressions |

## Validation
Focused ProviderIssueHandoff fixture for recover/relaunch/nudge, control lifecycle tests for stranded recovery retry, slow launch, retry deadline, no-health active operation abandonment, skipped diagnostics, stale queued cleanup, and stale manifestless starting retry; then delegation guard, spec guard, build, lint, full test, docs gates, stewardship, diff budget, standalone review, elegance review, and pack smoke.

## Not Done If
`control-host recover` can still hang to `request timeout 120000ms`, a null run/manifest/launch claim can occupy capacity indefinitely, or CO-470 requires manual state cleanup / fixture-env cleanup before admission.
