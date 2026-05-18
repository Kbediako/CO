# PRD - Preserve provider-worker provenance across rehydrated active-run resume

## Traceability
- Linear issue: `CO-289` / `30d86aaa-8afb-4e47-8de1-f2ab493a15a9`
- Linear URL: https://linear.app/asabeko/issue/CO-289
- MCP task ID: `linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9`
- Canonical task ID: `20260421-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9`
- Canonical spec: `tasks/specs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- Action plan: `docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- Task checklist: `tasks/tasks-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- Docs child-lane manifest: `.runs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9-co289-docs-packet/cli/2026-04-21T06-56-20-392Z-b41cf2db/manifest.json`

## Summary
Provider-worker active-run rehydration can rebuild a running provider intake claim as `provider_issue_rehydrated_active_run` with `launch_source: null`. That breaks same-issue `linear child-lane` launches with `provider_worker_child_lane_provenance_invalid`, even when the attached active run was originally launched by the control host.

The desired outcome is narrow: preserve or recover truthful claim launch provenance during rehydrate/resume only when the attached active manifest proves the current control-host tuple. Missing, stale, conflicting, or non-control-host evidence must still fail closed.

## Intent Checksum
Protected terms: `provider_issue_rehydrated_active_run`, `provider_control_host_task_id`, `provider_control_host_run_id`, `provider_launch_source`, `launch_source: null`, `provider_worker_child_lane_provenance_invalid`, `linear child-lane`, `CO-244`, `CO-216`.

Nearby wrong interpretations to reject:
- This is not a `CO-216` operator-autopilot backlog-promotion bug.
- This is not permission to weaken child-lane provenance checks.
- This is not a request to forge control-host provenance from ambient files.
- This is not a request to make child lanes available outside provider-linear-worker runs.

## Relationship To CO-244
`CO-244` established the manifest-side provenance tuple: `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id`. `CO-289` covers a different seam: active-run rehydration can rediscover a valid provider-worker manifest but persist the claim without launch provenance. The fix consumes the existing tuple when it truthfully matches the active control-host owner; it does not redesign or backfill `CO-244` fields.

## Scope
In scope:
- `orchestrator/src/cli/control/providerIssueHandoff.ts` rehydrate/resume claim writes.
- Existing provider intake launch provenance fields.
- `orchestrator/src/cli/providerLinearChildLaneShell.ts` diagnostics for `provider_worker_child_lane_provenance_invalid`.
- Focused tests for rehydrate/resume, serialization, and child-lane guard behavior.

Non-goals:
- No `CO-216` behavior change.
- No child-lane fail-open path.
- No new manifest schema or historical manifest mutation.
- No generic provider restart, dashboard, retry, or admission redesign.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| Active manifest | After `CO-244`, a provider worker may carry `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id`. | That tuple is the control-host evidence. | Rehydrate consumes it only when complete and matching. |
| Rehydrated claim | `provider_issue_rehydrated_active_run` can persist `launch_source: null`. | Rehydrated claims should preserve trustworthy launch provenance. | Matching claims store `launch_source=control-host`; invalid claims stay null. |
| Child-lane guard | Same-issue child lane can fail with `provider_worker_child_lane_provenance_invalid`. | Valid rehydrated parents should authorize like fresh control-host launches. | Valid child lanes pass; absent or mismatched evidence still fails closed. |
| Adjacent scope | `CO-244` and `CO-216` are easy to conflate. | `CO-244` is manifest provenance; `CO-216` is operator-autopilot churn. | This lane stays on rehydrated provider provenance. |

## Acceptance Criteria
- Add a regression for provider-worker active-run rehydration that preserves or recovers truthful control-host provenance.
- Prove `linear child-lane --action launch` succeeds when a provider worker was control-host launched and then rehydrated/resumed.
- Preserve fail-closed behavior when provenance is genuinely absent or mismatched.
- Surface enough manifest/intake evidence for operators to diagnose `provider_worker_child_lane_provenance_invalid`.
- Document why completed `CO-244` did not cover this recurrence path.

## Not Done If
- A rehydrated provider-worker claim can still have `launch_source: null` after a control-host launch with complete matching manifest provenance.
- The solution bypasses provenance checks instead of preserving truthful provenance.
- Tests cover only initial launch and not active-run rehydration/resume.
- Operator-facing proof does not identify the required manifest and intake fields.

## Validation
- Focused provider handoff rehydrate/regression tests.
- Focused provider intake serialization tests where applicable.
- Focused child-lane guard diagnostics and success/fail-closed tests.
- Required repo gates before review handoff: delegation guard, spec guard, build, lint, test, docs checks, stewardship, diff budget, standalone review, elegance pass, and PR readiness drain.

## Approvals
- Product: self-approved from `CO-289` issue wording.
- Engineering: parent provider worker.
- Design: N/A.
